# SPDX-License-Identifier: GPL-3.0-only
# Copyright (C) 2026 Russhvith

"""ComicK API client shared by the tools.

Handles the session cookie, keeps every tool inside the API's rate
limits, and has the lookups more than one tool needs (comic hid, the
chapter and episode lists).
"""

import json
import math
import re
import threading
import time
import urllib.error
import urllib.request
from collections import deque
from decimal import Decimal, InvalidOperation
from email.utils import parsedate_to_datetime
from urllib.parse import quote, unquote, urlparse

COOKIE_NAME = "__Secure-comick-auth.session_token"
USER_AGENT = "comick-tools"
TIMEOUT = 30
PAGE_SIZE = 100
LIMIT_WORDS_RE = re.compile(r"limit|too many|slow down|try again later", re.IGNORECASE)
# A second longer than a real minute. Requests released right on the 60 s
# mark can land a few ms early on the server's clock and get counted in
# the window we were trying to leave.
MINUTE_WINDOW = 61
# Upper bound on threads for one batch, whatever the rate says. Past this
# the threads only wait on the limiter.
MAX_WORKERS = 32


class ApiError(Exception):
    def __init__(self, status, message):
        super().__init__(message)
        self.status = status
        self.message = message

    @property
    def is_auth(self):
        return self.status == 401

    @property
    def is_forbidden(self):
        return self.status == 403

    @property
    def is_not_found(self):
        return self.status == 404

    @property
    def is_limit(self):
        return self.status == 429 or bool(LIMIT_WORDS_RE.search(self.message or ""))


class GuardedRedirect(urllib.request.HTTPRedirectHandler):
    """Follows a redirect only when allowed(old_url, new_url) says so.

    urllib's default handler follows a redirect to any host and copies
    every header across, the Cookie included, so a redirect off ComicK
    would hand the session cookie to whoever it points at.
    """

    def __init__(self, allowed):
        self.allowed = allowed

    def redirect_request(self, req, fp, code, msg, headers, newurl):
        if not self.allowed(req.full_url, newurl):
            raise urllib.error.URLError(f"redirected to {urlparse(newurl).netloc or newurl}, refused")
        return super().redirect_request(req, fp, code, msg, headers, newurl)


def same_origin(old, new):
    a, b = urlparse(old), urlparse(new)
    return (a.scheme.lower(), a.netloc.lower()) == (b.scheme.lower(), b.netloc.lower())


def https_opener(allow_redirect):
    """An opener that speaks https only.

    The default one also opens file:, ftp: and data: URLs, so a URL from
    a file or a server response could read local files or, on Windows,
    reach out to a network share.
    """
    opener = urllib.request.OpenerDirector()
    for handler in (
        urllib.request.ProxyHandler(),
        urllib.request.HTTPSHandler(),
        # Without this an http: or file: URL makes open() return None
        # instead of raising, which would look like a silent success.
        urllib.request.UnknownHandler(),
        urllib.request.HTTPDefaultErrorHandler(),
        urllib.request.HTTPErrorProcessor(),
        GuardedRedirect(allow_redirect),
    ):
        opener.add_handler(handler)
    return opener


def error_text(body, status):
    if isinstance(body, dict):
        text = body.get("message") or body.get("error")
        if isinstance(text, str) and text:
            return text
    return f"HTTP {status}"


def retry_after(headers):
    """Seconds to wait from a Retry-After header, which can be either a
    number of seconds or an HTTP date."""
    value = headers.get("Retry-After")
    if not value:
        return None
    try:
        return max(0.0, float(value))
    except ValueError:
        pass
    try:
        return max(0.0, parsedate_to_datetime(value).timestamp() - time.time())
    except (TypeError, ValueError):
        return None


class Comick:
    """Thin client that keeps us inside both our own and the server's limits.

    Two caps from .env apply to every request: COMICK_UPLOADS_PER_SECOND
    spaces out request starts, and COMICK_REQUESTS_PER_MINUTE keeps a
    rolling minute under the API's per IP limit. On top of that the server
    sends x-ratelimit-remaining and -reset, and once remaining hits zero
    every thread waits for the reset. A 429 gets one retry after
    Retry-After (or the reset window if that's missing).
    """

    def __init__(self, base, token, per_second, per_minute, user_agent=USER_AGENT, on_wait=None):
        self.base = base.rstrip("/")
        self.per_second = per_second
        self.cookie = f"{COOKIE_NAME}={token}"
        self.user_agent = user_agent
        # 5% over the exact spacing. Requests arrive with a few tens of ms
        # of network jitter, and without the slack the server can still
        # count one more than the cap inside a single second.
        self.interval = 1.05 / per_second
        # Same idea for the minute: stay a little under, not right on it.
        self.minute_cap = max(1, int(per_minute * 0.95))
        self.on_wait = on_wait
        self.lock = threading.Lock()
        self.next_slot = 0.0
        self.blocked_until = 0.0
        self.recent = deque()
        # Redirects stay on the API's own scheme and host, the cookie
        # never goes anywhere else.
        self.opener = urllib.request.build_opener(GuardedRedirect(same_origin))

    def _wait_turn(self):
        # Spacing is measured from when a request really went out, not when
        # it was scheduled. Otherwise a thread that wakes up late lets the
        # next one fire right behind it and the server sees a burst.
        while True:
            with self.lock:
                now = time.monotonic()
                while self.recent and now - self.recent[0] >= MINUTE_WINDOW:
                    self.recent.popleft()
                ready = max(self.next_slot, self.blocked_until)
                if len(self.recent) >= self.minute_cap:
                    ready = max(ready, self.recent[0] + MINUTE_WINDOW)
                if now >= ready:
                    self.next_slot = now + self.interval
                    self.recent.append(now)
                    return
            wait = ready - now
            if wait > 1 and self.on_wait:
                self.on_wait(wait)
            time.sleep(wait)

    def _block_for(self, seconds):
        with self.lock:
            self.blocked_until = max(self.blocked_until, time.monotonic() + seconds)

    def _read_limits(self, headers):
        try:
            remaining = int(headers.get("x-ratelimit-remaining"))
            reset = float(headers.get("x-ratelimit-reset"))
        except (TypeError, ValueError):
            return None
        if remaining <= 0:
            self._block_for(reset)
        return reset

    def _send(self, method, path, body):
        data = json.dumps(body).encode("utf-8") if body is not None else None
        request = urllib.request.Request(self.base + path, data=data, method=method, headers={
            "Cookie": self.cookie,
            "Accept": "application/json",
            "Content-Type": "application/json",
            "User-Agent": self.user_agent,
        })
        try:
            with self.opener.open(request, timeout=TIMEOUT) as response:
                return response.status, response.headers, response.read()
        except urllib.error.HTTPError as e:
            return e.code, e.headers, e.read()
        except (urllib.error.URLError, OSError) as e:
            reason = getattr(e, "reason", e)
            raise ApiError(0, f"can't reach {self.base} ({reason})")

    def request(self, method, path, body=None):
        for attempt in (1, 2):
            self._wait_turn()
            status, headers, raw = self._send(method, path, body)
            reset = self._read_limits(headers)

            # Cloudflare answers some requests with an HTML challenge page
            # instead of the API. Parsing that as JSON would just produce a
            # confusing error further down, so call it out here.
            content_type = (headers.get("Content-Type") or "").lower()
            if "text/html" in content_type:
                raise ApiError(status, f"got an HTML page instead of JSON (HTTP {status}), "
                                       "probably a Cloudflare challenge, try again later")
            try:
                parsed = json.loads(raw) if raw else None
            except ValueError:
                parsed = None

            if status == 429 and attempt == 1:
                wait = retry_after(headers)
                if wait is None:
                    wait = reset if reset is not None else 10
                self._block_for(wait)
                if self.on_wait:
                    self.on_wait(wait)
                continue
            if status >= 400:
                raise ApiError(status, error_text(parsed, status))
            return parsed
        raise AssertionError("unreachable")


def worker_count(per_second, jobs):
    """How many requests of a batch to keep in flight at once.

    The client already spaces request starts to per_second, so this only
    decides how many can be waiting on ComicK at the same time. A request
    takes about a second, so twice the rate keeps the full rate in use
    even when ComicK is slow, and the limiter stops it going any faster.
    """
    return max(1, min(MAX_WORKERS, math.ceil(per_second * 2), jobs))


def connect(settings, user_agent=USER_AGENT, on_wait=None):
    return Comick(settings["base"], settings["token"], settings["per_second"],
                  settings["per_minute"], user_agent=user_agent, on_wait=on_wait)


def normalize_number(value):
    """Chapter and episode numbers as comparable strings: 12, 12.5, never
    12.0. Anything that isn't a number comes back as is."""
    try:
        n = Decimal(str(value))
    except InvalidOperation:
        return str(value)
    if not n.is_finite():
        return str(value)
    whole = n.to_integral_value()
    return str(whole) if n == whole else str(n.normalize())


def number_key(value):
    """Sort key that puts numbered entries in order and the rest last."""
    try:
        n = Decimal(str(value))
        if n.is_finite():
            return (0, n, "")
    except InvalidOperation:
        pass
    return (1, Decimal(0), str(value))


# comick-localhost.russhvithdesign.in is a fan made front end over the same
# API, so its links name the same comics as comick.dev ones.
COMICK_HOSTS = ("comick.dev", "comick-localhost.russhvithdesign.in")
SLUG_SECTIONS = ("comic", "anime")


def slug_from(text):
    """Pull the slug out of a ComicK comic or anime link.

    Anything that isn't one of those links comes back as typed (minus
    surrounding slashes), so a bare slug passes straight through.
    """
    text = (text or "").strip()
    if "/" not in text:
        return text
    url = urlparse(text if "://" in text else "https://" + text)
    host = (url.hostname or "").lower()
    if host.startswith("www."):
        host = host[4:]
    if not any(host == h or host.endswith("." + h) for h in COMICK_HOSTS):
        return text.strip("/")
    parts = [p for p in url.path.split("/") if p]
    for i, part in enumerate(parts[:-1]):
        if part.lower() in SLUG_SECTIONS:
            return unquote(parts[i + 1])
    return text.strip("/")


def comic_hid(api, slug, anime=False):
    path = f"/comic/{quote(slug)}/" + ("?media_type=anime" if anime else "")
    body = api.request("GET", path) or {}
    hid = (body.get("comic") or {}).get("hid") if isinstance(body, dict) else None
    if not hid:
        raise ApiError(0, "the comic lookup didn't include a hid")
    return hid


def list_entries(api, hid, episodes=False, lang=None):
    """Every chapter (or episode) of a comic, oldest first.

    Pages through 100 at a time until we have `total` of them or a page
    comes back short, whichever happens first.
    """
    entries, page = [], 1
    while True:
        query = "entry_type=episode" if episodes else (f"lang={quote(lang)}" if lang else "")
        query += ("&" if query else "") + f"limit={PAGE_SIZE}&page={page}&chap-order=1"
        body = api.request("GET", f"/v1.0/comic/{quote(hid)}/chapters?{query}") or {}
        chapters = body.get("chapters") if isinstance(body, dict) else None
        if not isinstance(chapters, list):
            raise ApiError(0, "chapter list came back in a shape we don't understand")
        entries.extend(item for item in chapters if isinstance(item, dict))
        total = body.get("total")
        if len(chapters) < PAGE_SIZE or (isinstance(total, int) and len(entries) >= total):
            return entries
        page += 1
