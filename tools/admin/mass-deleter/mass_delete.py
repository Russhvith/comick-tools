"""Delete chapters or anime episodes on ComicK in bulk.

Walks through picking a comic, a language and which chapters (or
episodes) to remove, shows the full list, and only sends deletes after
a typed confirmation. Needs a trusted, moderator or admin account.
"""

import argparse
import re
import sys
import threading
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from decimal import Decimal, InvalidOperation
from pathlib import Path
from urllib.parse import quote

# Scripts run straight from their folder, so the shared lib isn't on the
# import path until we put it there.
sys.path.insert(0, str(Path(__file__).resolve().parents[3] / "lib"))

from comick_tools.api import ApiError, comic_hid, connect, list_entries, normalize_number, number_key  # noqa: E402
from comick_tools.console import err, human_time, out, plural  # noqa: E402
from comick_tools.env import SettingsError, comick_settings  # noqa: E402

USER_AGENT = "comick-tools/mass-deleter"
WHOAMI_PATH = "/v2.0/sessions/whoami"
ALLOWED_ROLES = ("trusted", "moderator", "admin")
# Appended to every reason so reviewers and the audit log can tell these
# came from a script, and where to find it.
REASON_SUFFIX = "Mass deleted by ComicK MassDeleter. (https://github.com/Russhvith/comick-tools)"
MAX_REASON = 500
CONFIRM_WORD = "DELETE"
WORKERS = 4


def parse_args():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--slug", help="comic or anime slug, asked for if left out")
    parser.add_argument("--type", choices=("chapter", "episode"), help="what to delete, asked for if left out")
    parser.add_argument("--lang", help="chapter language code, or 'all'. Ignored for episodes")
    parser.add_argument("--select", help="numbers and ranges like '1-10, 12.5', or 'all'")
    parser.add_argument("--group", help="only chapters from this scanlation group")
    parser.add_argument("--reason", help="why these are being deleted, asked for if left out")
    parser.add_argument("--dry-run", action="store_true", help="go through everything but send no deletes")
    return parser.parse_args()


# Prompts


def ask(question, default=None, hint=None):
    suffix = out.dim(f" [{hint or default}]") if (hint or default) else ""
    try:
        answer = input(f"  {out.paint('?', '1;36')} {question}{suffix} ").strip()
    except EOFError:
        # Windows reports NUL as a terminal, so a script with stdin from
        # nowhere only shows up here.
        out.say()
        err.fail("No terminal to answer prompts", [("Fix", "run it from a terminal, deletes need a person")])
        sys.exit(1)
    return answer or (default or "")


def ask_until(question, check, default=None, hint=None):
    while True:
        answer = ask(question, default, hint)
        problem = check(answer)
        if not problem:
            return answer
        out.say(f"    {out.paint(problem, '33')}")


# Account check


def account_fields(me):
    """Pull active / state / role / username out of whoami.

    The session itself carries `active`, the identity behind it carries
    `state` and the username, and the ComicK profile (`user_info`, with
    `info` as an older copy of the same thing) carries the role.
    """
    identity = me.get("identity") if isinstance(me.get("identity"), dict) else {}
    traits = identity.get("traits") if isinstance(identity.get("traits"), dict) else {}
    profile = next((me[k] for k in ("user_info", "info") if isinstance(me.get(k), dict)), {})
    role = profile.get("role")
    return {
        "active": me.get("active"),
        "state": identity.get("state"),
        "roles": [role.lower()] if isinstance(role, str) else [],
        "name": traits.get("username"),
    }


def check_account(api):
    try:
        me = api.request("GET", WHOAMI_PATH)
    except ApiError as e:
        if e.is_auth:
            err.fail("Session cookie was rejected", [("Fix", "grab a fresh one, see docs/auth.md")])
        else:
            err.fail("Couldn't load the account behind this cookie", [("whoami", e.message)])
        sys.exit(1)
    if not isinstance(me, dict):
        err.fail("Couldn't load the account behind this cookie", [("whoami", "unexpected response")])
        sys.exit(1)

    info = account_fields(me)
    who = info["name"] or "this account"
    if info["active"] is not True or info["state"] != "active":
        err.fail(f"{who} isn't active, nothing to do", [
            ("active", str(info["active"])),
            ("state", str(info["state"])),
        ])
        sys.exit(1)
    allowed = [r for r in info["roles"] if r in ALLOWED_ROLES]
    if not allowed:
        err.fail("Only trusted users, moderators and admins can mass delete", [
            ("Account", who),
            ("Role", ", ".join(info["roles"]) or "none"),
        ])
        sys.exit(1)
    out.step(f"Signed in as {who}", allowed[0])


# Picking what to delete


def parse_selection(text):
    """'1-10, 12.5 15' into a matcher. Returns (matcher, problem)."""
    text = text.strip().lower()
    if text == "all":
        return (lambda n: True), None
    singles, ranges = set(), []
    for token in re.split(r"[,\s]+", text):
        if not token:
            continue
        bounds = token.split("-")
        try:
            if len(bounds) == 1:
                singles.add(Decimal(bounds[0]))
            elif len(bounds) == 2:
                low, high = Decimal(bounds[0]), Decimal(bounds[1])
                if low > high:
                    low, high = high, low
                ranges.append((low, high))
            else:
                raise InvalidOperation
        except InvalidOperation:
            return None, f"can't read {token!r}, use numbers and ranges like 1-10, 12.5 or 'all'"
    if not singles and not ranges:
        return None, "pick at least one number, a range, or 'all'"

    def matcher(number):
        return number in singles or any(low <= number <= high for low, high in ranges)

    return matcher, None


def as_decimal(value):
    try:
        n = Decimal(str(value))
        return n if n.is_finite() else None
    except InvalidOperation:
        return None


def describe(entries, episodes):
    numbers = [as_decimal(e.get("chap")) for e in entries]
    numbers = sorted(n for n in numbers if n is not None)
    span = f"{normalize_number(numbers[0])} to {normalize_number(numbers[-1])}" if numbers else "no numbers"
    if episodes:
        return span
    langs = sorted({e.get("lang") or "?" for e in entries})
    return f"{span}, languages: {', '.join(langs)}"


def group_counts(entries):
    counts = {}
    for e in entries:
        name = group_of(e)
        counts[name] = counts.get(name, 0) + 1
    return sorted(counts.items(), key=lambda kv: (-kv[1], kv[0].lower()))


def group_of(entry):
    name = entry.get("group_name")
    if isinstance(name, list):
        name = ", ".join(str(n) for n in name)
    return name or "(no group)"


def entry_row(entry, episodes):
    number = normalize_number(entry.get("chap")) if entry.get("chap") not in (None, "") else "-"
    if episodes:
        profile = entry.get("anime_episode_profiles") or {}
        aired = str(profile.get("aired_at") or "")[:10] or "-"
        return [f"Ep {number}", profile.get("episode_type") or "-", aired, entry.get("title") or "", entry["hid"]]
    vol = f"vol {entry['vol']}" if entry.get("vol") not in (None, "") else "-"
    return [f"Ch {number}", vol, entry.get("lang") or "-", group_of(entry), entry["hid"]]


def print_table(rows, header):
    widths = [max(len(str(r[i])) for r in rows + [header]) for i in range(len(header))]
    # The title or group column can get long, keep the table readable.
    widths[3] = min(widths[3], 40)

    def fit(value, width):
        value = str(value)
        return (value[: width - 3] + "...") if len(value) > width else value.ljust(width)

    out.say("    " + out.dim("  ".join(fit(h, w) for h, w in zip(header, widths))))
    for row in rows:
        out.say("    " + "  ".join(fit(v, w) for v, w in zip(row, widths)))


# Deleting


def check_permissions(api, kind, entries):
    """Ask manage_permissions about every entry, a few at a time."""
    allowed, refused, failed = [], [], []

    def check(entry):
        try:
            perms = api.request("GET", f"/{kind}/{quote(entry['hid'])}/manage_permissions") or {}
            return entry, perms.get("can_delete") is True, None
        except ApiError as e:
            return entry, False, e

    with ThreadPoolExecutor(max_workers=WORKERS) as pool:
        futures = [pool.submit(check, e) for e in entries]
        for count, future in enumerate(as_completed(futures), start=1):
            entry, ok, problem = future.result()
            if problem and problem.is_auth:
                out.end_progress()
                err.fail("Session cookie was rejected", [("Fix", "grab a fresh one, see docs/auth.md")])
                sys.exit(1)
            if problem:
                failed.append((entry, problem))
            elif ok:
                allowed.append(entry)
            else:
                refused.append(entry)
            out.progress(f"Checking permissions {count}/{len(entries)}")
    out.end_progress()
    return allowed, refused, failed


def delete_all(api, kind, entries, reason, episodes):
    stop = threading.Event()
    stop_reason = []
    rows = [entry_row(e, episodes) for e in entries]
    width = max(len(r[0]) for r in rows)
    # Column three is the aired date for episodes or the language for
    # chapters, column four the title or group. Pad both so lines align.
    width3 = max(len(str(r[2])) for r in rows)
    width4 = min(40, max(len(str(r[3])) for r in rows))

    def run(entry):
        if stop.is_set():
            return entry, "skipped", 0
        t = time.perf_counter()
        try:
            api.request("DELETE", f"/{kind}/{quote(entry['hid'])}", {"reason": reason})
            return entry, None, time.perf_counter() - t
        except ApiError as e:
            if e.is_auth or e.is_limit:
                stop.set()
                stop_reason.append(e)
                return entry, "skipped", 0
            return entry, e, time.perf_counter() - t

    done, gone, failed, skipped = [], [], [], []
    with ThreadPoolExecutor(max_workers=WORKERS) as pool:
        futures = [pool.submit(run, e) for e in entries]
        for count, future in enumerate(as_completed(futures), start=1):
            entry, problem, took = future.result()
            row = entry_row(entry, episodes)
            label = row[0].ljust(width)
            out.end_progress()
            if problem == "skipped":
                skipped.append(entry)
            elif problem is None:
                done.append(entry)
                fourth = str(row[3])
                fourth = (fourth[: width4 - 3] + "...") if len(fourth) > width4 else fourth.ljust(width4)
                detail = f"{str(row[2]).ljust(width3)}  {fourth}"
                out.say(f"  {out.paint(out.ok, '32')} {label}  {detail}  "
                        + out.dim(f"{entry['hid']}  {human_time(took)}"))
            elif problem.is_not_found:
                gone.append(entry)
                out.say(f"  {out.paint('-', '33')} {label}  {out.paint('already gone', '33')}  {out.dim(entry['hid'])}")
            else:
                failed.append((entry, problem))
                out.say(f"  {out.paint(out.bad, '31')} {label}  {out.paint(problem.message, '31')}  "
                        + out.dim(entry["hid"]))
            out.progress(f"Deleting {count}/{len(entries)}")
    out.end_progress()
    return done, gone, failed, skipped, (stop_reason[0] if stop_reason else None)


def sort_entries(entries):
    return sorted(entries, key=lambda e: (number_key(e.get("chap")), e.get("lang") or "", group_of(e).lower()))


def main():
    args = parse_args()
    started = time.perf_counter()
    out.header("mass-deleter", "delete chapters or episodes on ComicK")

    try:
        settings = comick_settings()
    except SettingsError as e:
        err.fail(e.title, e.rows)
        sys.exit(1)
    api = connect(settings, USER_AGENT,
                  on_wait=lambda secs: out.progress(f"Rate limited, waiting {human_time(secs)}"))

    check_account(api)
    out.say()

    slug = args.slug or ask_until("Comic or anime slug:", lambda a: None if a.strip() else "a slug is needed")
    slug = slug.strip()
    kind = args.type or ask_until(
        "Delete chapters or episodes?", lambda a: None if a.lower() in ("c", "e", "chapter", "episode") else "type c or e",
        default="c", hint="c/e",
    ).lower()
    kind = "episode" if kind in ("e", "episode") else "chapter"
    episodes = kind == "episode"

    lang = None
    if not episodes:
        lang = (args.lang or ask("Language code, or 'all' for every language:", default="en")).strip().lower()
        if lang == "all":
            lang = None

    try:
        hid = comic_hid(api, slug, anime=episodes)
        entries = list_entries(api, hid, episodes=episodes, lang=lang)
    except ApiError as e:
        err.fail(f"Couldn't load {kind}s for {slug}", [("Error", e.message)])
        sys.exit(1)
    entries = [e for e in entries if e.get("hid")]
    if not entries:
        out.warn(f"No {kind}s found for {slug}" + (f" in {lang}" if lang else ""))
        out.say()
        return
    out.step(f"Found {plural(len(entries), kind)}", describe(entries, episodes))

    group = None
    if not episodes:
        groups = group_counts(entries)
        if len(groups) > 1 or args.group:
            out.rows([(name, plural(n, "chapter")) for name, n in groups[:15]], "2")
            if len(groups) > 15:
                out.say(f"    {out.dim(f'and {len(groups) - 15} more groups')}")
            group = (args.group if args.group is not None else ask("Only from group (blank for any):")).strip()

    while True:
        selection = args.select or ask("Which numbers? e.g. 1-10, 12.5 or all:")
        matcher, problem = parse_selection(selection)
        if problem:
            if args.select:
                err.fail("Bad --select", [("Problem", problem)])
                sys.exit(1)
            out.say(f"    {out.paint(problem, '33')}")
            continue
        picked = []
        for e in entries:
            n = as_decimal(e.get("chap"))
            if selection.strip().lower() != "all" and (n is None or not matcher(n)):
                continue
            if group and group_of(e).lower() != group.lower():
                continue
            picked.append(e)
        if picked or args.select:
            break
        out.say(f"    {out.paint('nothing matches that, try again', '33')}")
    if not picked:
        out.warn("Nothing matches that selection")
        out.say()
        return

    picked = sort_entries(picked)
    allowed, refused, check_failed = check_permissions(api, kind, picked)
    if refused or check_failed:
        out.warn(f"{plural(len(refused) + len(check_failed), kind)} can't be deleted with this account, left out",
                 [(entry_row(e, episodes)[0], "not allowed") for e in refused]
                 + [(entry_row(e, episodes)[0], p.message) for e, p in check_failed])
    if not allowed:
        out.say()
        return
    # Permission checks finish in whatever order the threads get to them.
    allowed = sort_entries(allowed)

    header = ["Episode", "Type", "Aired", "Title", "hid"] if episodes else ["Chapter", "Vol", "Lang", "Group", "hid"]
    out.section(f"About to permanently delete {plural(len(allowed), kind)} from {slug}", "1;31")
    print_table([entry_row(e, episodes) for e in allowed], header)
    out.say()

    def full_reason(text):
        # Close the sentence so the credit doesn't read as part of it.
        text = text.strip()
        if text and text[-1] not in ".!?":
            text += "."
        return f"{text} {REASON_SUFFIX}"

    def reason_problem(text):
        if not text.strip():
            return "a reason is required, reviewers and the audit log see it"
        full = full_reason(text)
        if len(full) > MAX_REASON:
            return f"too long by {len(full) - MAX_REASON} characters ({MAX_REASON} max including the MassDeleter credit)"
        return None

    if args.reason is not None and reason_problem(args.reason):
        err.fail("Bad --reason", [("Problem", reason_problem(args.reason))])
        sys.exit(1)
    reason = args.reason or ask_until("Reason for deleting:", reason_problem)
    reason = full_reason(reason)
    out.say(f"    {out.dim('Reason sent: ' + reason)}")

    if args.dry_run:
        out.say()
        out.step(f"Dry run, would delete {plural(len(allowed), kind)}")
        out.say()
        return

    out.say()
    answer = ask(f"This can't be undone. Type {out.bold(CONFIRM_WORD)} to delete {plural(len(allowed), kind)}:")
    if answer != CONFIRM_WORD:
        out.warn("Cancelled, nothing was deleted")
        out.say()
        return

    out.say()
    t0 = time.perf_counter()
    done, gone, failed, skipped, stopped = delete_all(api, kind, allowed, reason, episodes)
    out.say()
    if done:
        out.step(f"Deleted {plural(len(done), kind)}", human_time(time.perf_counter() - t0))
    if stopped:
        if stopped.is_auth:
            out.warn("Session cookie was rejected partway through, stopped",
                     [("Fix", "grab a fresh one, see docs/auth.md")])
        else:
            out.warn("ComicK says we've hit a limit, stopped", [("ComicK", stopped.message)])

    if gone:
        out.section(f"Already gone ({len(gone)})", "1;33")
        out.rows([("hid", ", ".join(e["hid"] for e in sort_entries(gone)))])
    if failed:
        out.section(f"Failed ({len(failed)})", "1;31")
        out.rows([(f"{entry_row(e, episodes)[0]} {e['hid']}", p.message)
                  for e, p in sorted(failed, key=lambda pair: number_key(pair[0].get("chap")))], "31")
    if skipped:
        out.section(f"Not sent ({len(skipped)})", "1;33")
        out.rows([("hid", ", ".join(e["hid"] for e in sort_entries(skipped)))])

    out.say()
    out.say(f"  {out.bold(plural(len(done), kind) + ' deleted')} {out.dim('in ' + human_time(time.perf_counter() - started))}")
    out.say()
    sys.exit(1 if failed or skipped else 0)


if __name__ == "__main__":
    main()
