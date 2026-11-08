"""Upload the episodes in output.txt to an anime on ComicK.

Reads the file format_episodes.py writes, including any hand edits to the
(main) / (recap) / (filler) tags, compares it with what the anime already
has, and adds the rest through the ComicK API using the session cookie
from the root .env.
"""

import argparse
import os
import re
import sys
import threading
import time
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime
from decimal import Decimal
from pathlib import Path
from urllib.parse import quote, urlparse, urlunparse

# Scripts run straight from their folder, so the shared lib isn't on the
# import path until we put it there.
sys.path.insert(0, str(Path(__file__).resolve().parents[3] / "lib"))

from comick_tools.api import ApiError, comic_hid, connect, list_entries, normalize_number  # noqa: E402
from comick_tools.console import err, human_size, human_time, out, plural, short  # noqa: E402
from comick_tools.env import SettingsError, comick_settings  # noqa: E402

TOOL_DIR = Path(__file__).resolve().parent
DATA_DIR = TOOL_DIR / "data"

TEMP_IMAGE_HOST = "tmp2.comick.pictures"
USER_AGENT = "comick-tools/crunchyroll-importer"
TIMEOUT = 30

# Goes on every review mode request so moderators know where a batch came
# from. Anything passed with --note gets added after it.
MODERATOR_NOTE = "Auto Uploaded using ComicK Crunchyroll Importer. (https://github.com/Russhvith/comick-tools)"
MAX_NOTE = 2000

EPISODE_TYPES = ("main", "recap", "filler")

# Labels the formatter writes, mapped to ComicK's language codes. English,
# Japanese and Romaji have their own boxes on the site, everything else is
# an extra row.
TITLE_LANGS = {
    "english": "en",
    "japanese": "ja",
    "romaji": "ja-ro",
    "japanese (romaji)": "ja-ro",
    "german": "de",
    "spanish (latin america)": "es-la",
    "spanish (spain)": "es",
    "french": "fr",
    "italian": "it",
    "portuguese (brazil)": "pt-br",
    "russian": "ru",
    "arabic": "ar",
    "hindi": "hi",
    "indonesian": "id",
    "malay": "ms",
    "thai": "th",
    "vietnamese": "vi",
    "chinese (simplified)": "zh",
    "chinese (traditional)": "zh-hk",
}
FIRST_LANGS = ("en", "ja", "ja-ro")

IMAGE_TYPES = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".gif": "image/gif",
    ".avif": "image/avif",
}

HEADER_RE = re.compile(r"^Episode\s+(\S+?):\s*(?:\(\s*(\w+)\s*\))?\s*$")
FIELD_RE = re.compile(r"^([A-Za-z][A-Za-z ()]*?):(?:\s(.*))?$")
NUMBER_RE = re.compile(r"^\d{1,4}(\.\d)?$")
DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
URL_IN_TEXT_RE = re.compile(r"https?://|www\.", re.IGNORECASE)


def parse_args():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--slug", help="the anime's slug on ComicK, asked for if left out")
    parser.add_argument("-i", "--input", type=Path, default=DATA_DIR / "output.txt")
    parser.add_argument(
        "--note",
        default="",
        help="extra moderator note added after the importer credit, only sent in request mode",
    )
    parser.add_argument("--dry-run", action="store_true", help="check everything but upload nothing")
    parser.add_argument("-y", "--yes", action="store_true", help="skip the confirmation prompt")
    return parser.parse_args()


# Reading output.txt


def parse_output(text):
    """Split output.txt into episodes.

    Lines that don't start a known field are treated as a continuation of
    the previous one, so a description someone rewrapped by hand still
    comes through whole.
    """
    episodes, current, last_key = [], None, None
    for lineno, raw in enumerate(text.splitlines(), start=1):
        line = raw.strip()
        header = HEADER_RE.match(line)
        if header:
            current = {"number": header.group(1), "type": (header.group(2) or "main").lower(),
                       "line": lineno, "fields": {}, "titles": []}
            episodes.append(current)
            last_key = None
            continue
        if current is None or not line:
            continue

        field = FIELD_RE.match(line)
        if field:
            key, value = field.group(1).strip(), (field.group(2) or "").strip()
            if key.lower().endswith(" title"):
                current["titles"].append([key[: -len(" title")].strip(), value])
                last_key = ("title", len(current["titles"]) - 1)
            else:
                current["fields"][key.lower()] = value
                last_key = ("field", key.lower())
            continue

        if last_key and last_key[0] == "field":
            fields = current["fields"]
            fields[last_key[1]] = (fields[last_key[1]] + " " + line).strip()
        elif last_key:
            title = current["titles"][last_key[1]]
            title[1] = (title[1] + " " + line).strip()
    return episodes


def parse_duration(text):
    parts = text.split(":")
    if not 2 <= len(parts) <= 3 or not all(p.isdigit() for p in parts):
        return None
    numbers = [int(p) for p in parts]
    if len(numbers) == 2:
        numbers.insert(0, 0)
    hours, minutes, seconds = numbers
    if minutes > 59 or seconds > 59 or hours > 24:
        return None
    return hours * 3600 + minutes * 60 + seconds


def json_number(text):
    # 12 goes out as an int and 12.5 as a float, the same as the site form.
    value = Decimal(text)
    return int(value) if value == value.to_integral_value() else float(value)


def validate(raw, base_dir):
    """Turn one parsed block into an upload job, or a list of problems.

    The rules mirror the add episode form on comick.dev so we catch
    anything it would reject before spending a request on it.
    """
    problems = []
    fields = raw["fields"]

    number = raw["number"]
    if not NUMBER_RE.match(number):
        problems.append("episode number must be 0 to 9999 with at most one decimal")

    ep_type = raw["type"]
    if ep_type not in EPISODE_TYPES:
        problems.append(f"type must be main, recap or filler, not {ep_type!r}")

    titles, seen = {}, set()
    for label, value in raw["titles"]:
        value = value.strip()
        if not value:
            continue
        lang = TITLE_LANGS.get(label.lower())
        if not lang:
            problems.append(f"unknown title language {label!r}")
            continue
        if lang in seen:
            problems.append("only one episode title may be added per language")
            continue
        if len(value) > 255:
            problems.append(f"{label} title is over 255 characters")
        seen.add(lang)
        titles[lang] = value
    if "en" not in titles:
        problems.append("English title is required")
    ordered = [lang for lang in FIRST_LANGS if lang in titles]
    ordered += [lang for lang in titles if lang not in FIRST_LANGS]

    aired = fields.get("aired", "")
    try:
        if not DATE_RE.match(aired):
            raise ValueError
        datetime.strptime(aired, "%Y-%m-%d")
    except ValueError:
        problems.append(f"aired date {aired or '(empty)'} isn't a real yyyy-mm-dd date")

    duration = parse_duration(fields.get("duration", ""))
    if duration is None or not 1 <= duration <= 86400:
        problems.append("duration must be between 0:01 and 24:00:00")

    synopsis = fields.get("description", "").strip() or None
    if synopsis and len(synopsis) > 10000:
        problems.append("description is over 10,000 characters")
    if synopsis and URL_IN_TEXT_RE.search(synopsis):
        problems.append("description can't contain links (http://, https:// or www.)")

    preview = fields.get("preview", "").strip() or None
    preview_kind = None
    if preview:
        if re.match(r"^https?://", preview, re.IGNORECASE):
            preview_kind = "url"
        elif (base_dir / preview).is_file():
            preview_kind = "file"
            preview = str(base_dir / preview)
        else:
            problems.append(f"preview file {preview} not found")

    source = fields.get("source", "").strip() or None
    if source and not re.match(r"^https?://\S+$", source, re.IGNORECASE):
        problems.append("source must be a full http(s) link")

    if problems:
        return None, problems
    return {
        "number": normalize_number(number),
        "type": ep_type,
        "titles": [{"lang": lang, "title": titles[lang]} for lang in ordered],
        "aired": aired,
        "duration": duration,
        "synopsis": synopsis,
        "preview": preview,
        "preview_kind": preview_kind,
        "source": source,
    }, []


# Talking to ComicK


def put_file(url, data, content_type):
    # Presigned bucket URLs carry their own auth in the query string, and
    # sending the ComicK cookie there would leak it to the storage host.
    request = urllib.request.Request(url, data=data, method="PUT", headers={
        "Content-Type": content_type,
        "User-Agent": USER_AGENT,
    })
    last = None
    for attempt in range(3):
        try:
            with urllib.request.urlopen(request, timeout=TIMEOUT * 2):
                return
        except urllib.error.HTTPError as e:
            if e.code < 500:
                raise ApiError(e.code, f"image upload rejected (HTTP {e.code})")
            last = ApiError(e.code, f"image upload failed (HTTP {e.code})")
        except (urllib.error.URLError, OSError) as e:
            last = ApiError(0, f"image upload failed ({getattr(e, 'reason', e)})")
        time.sleep(0.5 * (attempt + 1))
    raise last


def fetch_bytes(url):
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    try:
        with urllib.request.urlopen(request, timeout=TIMEOUT) as response:
            return response.read(), response.headers.get_content_type()
    except urllib.error.HTTPError as e:
        raise ApiError(e.code, f"couldn't download preview (HTTP {e.code})")
    except (urllib.error.URLError, OSError) as e:
        raise ApiError(0, f"couldn't download preview ({getattr(e, 'reason', e)})")


def temp_url(presigned):
    # Uploads land in the bucket, but ComicK wants them referenced through
    # its temp image host. Same path, different origin, no signature.
    parts = urlparse(presigned)
    return urlunparse(("https", TEMP_IMAGE_HOST, parts.path, "", "", ""))


def load_preview(job):
    if job["preview_kind"] == "file":
        path = Path(job["preview"])
        ext = path.suffix.lower()
        return path.read_bytes(), ext, IMAGE_TYPES.get(ext, "application/octet-stream")
    data, content_type = fetch_bytes(job["preview"])
    ext = next((e for e, t in IMAGE_TYPES.items() if t == content_type), None)
    ext = ext or Path(urlparse(job["preview"]).path).suffix.lower() or ".jpg"
    return data, ext, IMAGE_TYPES.get(ext, content_type)


def upload_one(api, slug, mode, note, job):
    previews, size = [], 0
    if job["preview"]:
        data, ext, content_type = load_preview(job)
        name = f"{job['number']}{ext}"
        urls = (api.request("POST", "/presign", {"files": [name]}) or {}).get("urls") or []
        if len(urls) != 1:
            raise ApiError(0, "presign didn't return an upload URL")
        put_file(urls[0], data, content_type)
        previews.append(temp_url(urls[0]))
        size = len(data)

    payload = {
        "episode_number": json_number(job["number"]),
        "episode_type": job["type"],
        "titles": job["titles"],
        "aired_at": job["aired"],
        "synopsis": job["synopsis"],
        "duration_seconds": job["duration"],
        "previews": previews,
    }
    endpoint = "request-episode" if mode == "request" else "add-episode"
    if mode == "request":
        if job["source"]:
            payload["sourceUrl"] = job["source"]
        if note:
            payload["moderatorNote"] = note

    api.request("POST", f"/v1.0/comic/{quote(slug)}/{endpoint}", payload)
    return size


def load_existing(api, hid):
    """Every episode ComicK has for this anime, keyed by episode number."""
    existing = {}
    for item in list_entries(api, hid, episodes=True):
        if item.get("chap") not in (None, ""):
            profile = item.get("anime_episode_profiles") or {}
            existing[normalize_number(item["chap"])] = {
                "title": item.get("title"),
                "type": profile.get("episode_type"),
                "aired": str(profile.get("aired_at") or "")[:10],
                "duration": profile.get("duration"),
            }
    return existing


def differences(job, item):
    """Fields where the file and ComicK disagree, as (field, ours, theirs).

    Only compares what the API actually sent back, so a sparse listing
    just means fewer checks rather than false alarms.
    """
    diffs = []
    if item["aired"] and item["aired"] != job["aired"]:
        diffs.append(("aired", job["aired"], item["aired"]))
    if item["type"] and item["type"] != job["type"]:
        diffs.append(("type", job["type"], item["type"]))
    ours = job["titles"][0]["title"]
    if item["title"] and item["title"].strip() != ours:
        diffs.append(("title", ours, item["title"].strip()))
    if isinstance(item["duration"], int) and item["duration"] != job["duration"]:
        diffs.append(("duration", f"{job['duration']} s", f"{item['duration']} s"))
    return diffs


# Run


def confirm(question):
    # The web UI pipes stdin but has a person typing into it.
    if not sys.stdin.isatty() and os.environ.get("COMICK_TOOLS_FORCE_TTY") != "1":
        err.fail("No terminal to ask for confirmation", [("Fix", "pass --yes to upload without the prompt")])
        sys.exit(1)
    out.say()
    try:
        answer = input(f"  {out.paint('?', '1;36')} {question} {out.dim('[y/N]')} ").strip().lower()
    except EOFError:
        # Windows reports NUL as a terminal, so isatty alone doesn't catch
        # a script with stdin redirected from nowhere.
        out.say()
        err.fail("No terminal to ask for confirmation", [("Fix", "pass --yes to upload without the prompt")])
        sys.exit(1)
    return answer in ("y", "yes")


def ask_slug():
    # Same rule as the confirmation: flags cover everything, prompts only
    # fill in what's missing.
    while True:
        try:
            answer = input(f"  {out.paint('?', '1;36')} Anime slug on ComicK: ").strip()
        except EOFError:
            out.say()
            err.fail("No anime slug", [("Fix", "pass --slug or run it from a terminal")])
            sys.exit(1)
        if answer:
            return answer
        out.say(f"    {out.paint('a slug is needed', '33')}")


def compact(numbers):
    return ", ".join(numbers) if len(numbers) <= 12 else ", ".join(numbers[:12]) + f" and {len(numbers) - 12} more"


def main():
    args = parse_args()
    started = time.perf_counter()
    out.header("crunchyroll-importer", "upload episodes to ComicK")
    if not args.slug:
        args.slug = ask_slug()
        out.say()

    try:
        settings = comick_settings()
    except SettingsError as e:
        err.fail(e.title, e.rows)
        sys.exit(1)

    note = " ".join(part for part in (MODERATOR_NOTE, args.note.strip()) if part)
    if len(note) > MAX_NOTE:
        err.fail("Moderator note is too long", [
            ("Limit", f"{MAX_NOTE} characters including the importer credit"),
            ("Yours", f"{len(note)} characters"),
        ])
        sys.exit(1)

    try:
        text = args.input.read_text(encoding="utf-8")
    except FileNotFoundError:
        err.fail("Input file not found", [("Looked in", short(args.input)), ("Fix", "run format_episodes.py first")])
        sys.exit(1)

    raw_episodes = parse_output(text)
    if not raw_episodes:
        err.fail("No episodes found", [("In", short(args.input))])
        sys.exit(1)

    jobs, problems, seen = [], [], set()
    for raw in raw_episodes:
        job, issues = validate(raw, args.input.parent)
        label = f"Episode {raw['number']} (line {raw['line']})"
        if job and job["number"] in seen:
            issues = ["episode number appears twice in the file"]
        if issues:
            problems.extend((label, issue) for issue in issues)
        else:
            seen.add(job["number"])
            jobs.append(job)
    if problems:
        err.fail("Fix these in output.txt first, nothing was uploaded", problems)
        sys.exit(1)
    types = {t: sum(1 for j in jobs if j["type"] == t) for t in EPISODE_TYPES}
    breakdown = ", ".join(f"{n} {t}" for t, n in types.items() if n)
    out.step(f"Read {plural(len(jobs), 'episode')} from {short(args.input)}", breakdown)

    api = connect(settings, USER_AGENT,
                  on_wait=lambda secs: out.progress(f"Rate limited, waiting {human_time(secs)}"))

    try:
        permission = api.request("GET", f"/comic/{quote(args.slug)}/check-add-episode-permission") or {}
    except ApiError as e:
        if e.is_auth:
            err.fail("Session cookie was rejected", [("Fix", "grab a fresh one, see docs/auth.md")])
        else:
            err.fail("Can't add episodes to this anime", [(args.slug, e.message)])
        sys.exit(1)
    mode = permission.get("mode")
    if mode == "request":
        out.step("Community review mode", "episodes stay private until reviewers give them 2 net votes")
    else:
        out.step("Direct add mode", "episodes go live straight away")

    try:
        hid = comic_hid(api, args.slug, anime=True)
    except ApiError as e:
        err.fail("Couldn't find this anime on ComicK, nothing was uploaded", [(args.slug, e.message)])
        sys.exit(1)
    try:
        existing = load_existing(api, hid)
    except ApiError as e:
        err.fail("Couldn't read the episodes already on ComicK, nothing was uploaded", [
            ("Anime", f"{args.slug} ({hid})"),
            ("Error", e.message),
        ])
        sys.exit(1)
    if existing:
        latest = max(existing, key=Decimal)
        out.step(f"ComicK already has {plural(len(existing), 'episode')}", f"latest is {latest}, hid {hid}")
    else:
        out.step("ComicK has no episodes for this anime yet", f"hid {hid}")

    pending, same, changed = [], [], []
    for job in jobs:
        item = existing.get(job["number"])
        if item is None:
            pending.append(job)
            continue
        diffs = differences(job, item)
        (changed if diffs else same).append((job, diffs))

    if not pending:
        out.step("Nothing new to upload")
    elif args.dry_run:
        out.step(f"Dry run, would upload {plural(len(pending), 'episode')}", compact([j["number"] for j in pending]))
    elif not args.yes and not confirm(
        f"Upload {plural(len(pending), 'episode')} to {args.slug}"
        + (" for review" if mode == "request" else "") + "?"
    ):
        out.say()
        out.warn("Cancelled, nothing was uploaded")
        report(same, changed, [], [], [], started, "nothing uploaded")
        return

    done, failed, skipped, total_bytes = [], [], [], 0
    if pending and not args.dry_run:
        out.say()
        stop = threading.Event()
        stop_reason = []
        workers = max(1, min(4, int(settings["per_second"]), len(pending)))

        def run(job):
            if stop.is_set():
                return job, None, "skipped", 0
            t = time.perf_counter()
            try:
                size = upload_one(api, args.slug, mode, note, job)
                return job, size, None, time.perf_counter() - t
            except ApiError as e:
                if e.is_auth or e.is_limit:
                    # Nothing past this point will get through either, and
                    # the warning below already says why, so count these
                    # with the rest of the unsent ones.
                    stop.set()
                    stop_reason.append(e)
                    return job, None, "skipped", 0
                return job, None, e, time.perf_counter() - t
            except Exception as e:
                # A bad image file or similar shouldn't take the whole batch
                # down with it, so report it against this episode only.
                return job, None, ApiError(0, str(e) or type(e).__name__), time.perf_counter() - t

        width = max(len(f"Episode {j['number']}") for j in pending)
        t0 = time.perf_counter()
        with ThreadPoolExecutor(max_workers=workers) as pool:
            futures = [pool.submit(run, job) for job in pending]
            for count, future in enumerate(as_completed(futures), start=1):
                job, size, problem, took = future.result()
                if problem == "skipped":
                    skipped.append(job)
                elif problem:
                    failed.append((job, problem))
                    episode_line(job, width, problem.message, took, ok=False)
                else:
                    done.append(job)
                    total_bytes += size or 0
                    episode_line(job, width, f"{human_size(size)}" if size else "no preview", took)
                out.progress(f"Uploading {count}/{len(pending)}")
        out.end_progress()
        out.say()

        if done:
            verb = "Sent for review" if mode == "request" else "Uploaded"
            out.step(f"{verb}: {plural(len(done), 'episode')}",
                     f"{human_size(total_bytes)} of previews, {human_time(time.perf_counter() - t0)}")
        if stop_reason:
            reason = stop_reason[0]
            if reason.is_auth:
                out.warn("Session cookie was rejected partway through, stopped uploading",
                         [("Fix", "grab a fresh one, see docs/auth.md")])
            else:
                out.warn("ComicK says we've hit a limit, stopped uploading", [("ComicK", reason.message)])

    report(same, changed, failed, skipped, done, started, "dry run, nothing uploaded" if args.dry_run else None)
    sys.exit(1 if failed or skipped else 0)


TYPE_COLORS = {"main": "2", "recap": "36", "filler": "35"}
TITLE_WIDTH = 40


def episode_line(job, width, detail, took, ok=True):
    """One line per finished episode, printed as soon as it's done.

    Lines show up in the order uploads finish rather than episode order,
    which is the honest picture of what's happening. The summary at the
    end is sorted.
    """
    out.end_progress()
    label = f"Episode {job['number']}".ljust(width)
    if not ok:
        out.say(f"  {out.paint(out.bad, '31')} {label}  {out.paint(detail, '31')}")
        return
    title = job["titles"][0]["title"]
    if len(title) > TITLE_WIDTH:
        title = title[: TITLE_WIDTH - 3].rstrip() + "..."
    kind = out.paint(job["type"].ljust(6), TYPE_COLORS.get(job["type"], "2"))
    out.say(
        f"  {out.paint(out.ok, '32')} {label}  {title.ljust(TITLE_WIDTH)}  {kind}  "
        + out.dim(f"{detail.rjust(8)}  {human_time(took).rjust(6)}")
    )


def by_number(job):
    return Decimal(job["number"])


def report(same, changed, failed, skipped, done, started, headline=None):
    # Uploads finish in whatever order the threads get to them, so put the
    # lists back in episode order before showing them.
    failed = sorted(failed, key=lambda pair: by_number(pair[0]))
    skipped = sorted(skipped, key=by_number)
    same = sorted(same, key=lambda pair: by_number(pair[0]))
    changed = sorted(changed, key=lambda pair: by_number(pair[0]))
    if failed:
        out.section(f"Failed ({len(failed)})", "1;31")
        out.rows([(f"Episode {j['number']}", e.message) for j, e in failed], "31")
    if skipped:
        out.section(f"Not sent ({len(skipped)})", "1;33")
        out.rows([("Episodes", compact([j["number"] for j in skipped]))])
    if same:
        out.section(f"Already on ComicK with the same date ({len(same)})", "1;32")
        out.rows([("Episodes", compact([j["number"] for j, _ in same]))], "2")
    if changed:
        out.section(f"Already on ComicK but different ({len(changed)}), edit these on the website", "1;35")
        rows = []
        for job, diffs in changed:
            for field, ours, theirs in diffs:
                rows.append((f"Episode {job['number']} {field}", f"file: {ours}   comick: {theirs}"))
        out.rows(rows, "35")
        out.say(f"    {out.dim('The uploader never overwrites existing episodes.')}")

    out.say()
    headline = headline or plural(len(done), "episode") + " uploaded"
    out.say(f"  {out.bold(headline[0].upper() + headline[1:])} {out.dim('in ' + human_time(time.perf_counter() - started))}")
    out.say()


if __name__ == "__main__":
    main()
