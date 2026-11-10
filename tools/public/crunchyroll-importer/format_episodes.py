"""Turn a Crunchyroll episode list dump into a plain text summary.

Reads the JSON returned by Crunchyroll's season episodes endpoint and writes
one block per episode with its number, title, duration, description and a
preview image. Previews get downloaded next to the output and the text points
at the local files, unless --no-images asks for Crunchyroll's URLs instead.
The uploader skips previews that are still links.
"""

import argparse
import json
import os
import re
import socket
import sys
import time
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime
from decimal import Decimal, InvalidOperation
from pathlib import Path
from urllib.parse import urlparse

# Scripts run straight from their folder, so the shared lib isn't on the
# import path until we put it there.
sys.path.insert(0, str(Path(__file__).resolve().parents[3] / "lib"))

from comick_tools.console import err, human_size, human_time, out, plural, short  # noqa: E402

DATA_DIR = Path(__file__).resolve().parent / "data"

IMAGE_EXTS = {".png", ".jpg", ".jpeg", ".webp", ".gif", ".avif"}
CONTENT_TYPES = {
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/webp": ".webp",
    "image/gif": ".gif",
    "image/avif": ".avif",
}
# Crunchyroll's image CDN is happy with parallel requests, and eight keeps a
# full season to a second or two without hammering it.
DOWNLOAD_WORKERS = 8
DOWNLOAD_TIMEOUT = 20
DOWNLOAD_RETRIES = 2

# Anything less than this and the output block can't be built, so we bail
# before writing a half finished file.
REQUIRED_FIELDS = ("episode", "title", "duration_ms", "episode_air_date", "description")

LOCALE_NAMES = {
    "ja-JP": "Japanese",
    "de-DE": "German",
    "es-419": "Spanish (Latin America)",
    "es-ES": "Spanish (Spain)",
    "fr-FR": "French",
    "it-IT": "Italian",
    "pt-BR": "Portuguese (Brazil)",
    "ru-RU": "Russian",
    "ar-SA": "Arabic",
    "hi-IN": "Hindi",
    "id-ID": "Indonesian",
    "ms-MY": "Malay",
    "th-TH": "Thai",
    "vi-VN": "Vietnamese",
    "zh-CN": "Chinese (Simplified)",
    "zh-HK": "Chinese (Traditional)",
}


def parse_args():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("-i", "--input", type=Path, default=DATA_DIR / "input.json")
    parser.add_argument("-o", "--output", type=Path, default=DATA_DIR / "output.txt")
    parser.add_argument(
        "--keep-numbers",
        action="store_true",
        help="use Crunchyroll's episode numbers as is instead of restarting the season at 1",
    )
    parser.add_argument(
        "--no-images",
        dest="images",
        action="store_false",
        help="skip downloading previews and link Crunchyroll's URLs instead",
    )
    return parser.parse_args()


def pick_preview(ep):
    # Thumbnails come as a list of size variants nested one level deep. The
    # widest one is the most useful for a preview, so grab that.
    best, best_width = None, -1
    for group in (ep.get("images") or {}).get("thumbnail") or ():
        for variant in group:
            width = variant.get("width", 0)
            if variant.get("source") and width > best_width:
                best, best_width = variant["source"], width
    return best


def format_duration(ms):
    total = round(ms / 1000)
    hours, rest = divmod(total, 3600)
    minutes, seconds = divmod(rest, 60)
    if hours:
        return f"{hours}:{minutes:02}:{seconds:02}"
    return f"{minutes}:{seconds:02}"


def format_aired(stamp):
    # Air dates always come through as midnight UTC, so the date alone is
    # the useful part. Parsing just the date also sidesteps fromisoformat,
    # which on Python 3.8 (last one for Windows 7) rejects the trailing Z.
    try:
        return datetime.strptime(stamp[:10], "%Y-%m-%d").date().isoformat()
    except (ValueError, TypeError):
        return None


def to_number(value):
    try:
        n = Decimal(str(value))
    except InvalidOperation:
        return None
    # "NaN" and "Infinity" parse fine as Decimal but blow up on comparison.
    return n if n.is_finite() else None


def show_number(n):
    # Decimal keeps 0.5 exact. Whole numbers print without a trailing ".0".
    whole = n.to_integral_value()
    return str(whole) if n == whole else str(n.normalize())


def season_offset(episodes):
    """How much to subtract so the season starts at 1.

    Crunchyroll often numbers later seasons straight on from the previous
    one (season 3 starting at 49). We take the lowest whole episode number
    and shift everything so it becomes 1. Recaps like 48.5 shift with it
    and land on 0.5, which keeps them in the right spot.

    A season whose lowest whole number is 0 or 1 is already numbered per
    season, so it's left alone. That covers seasons with an episode 0
    prologue.
    """
    lowest = None
    for ep in episodes:
        if isinstance(ep, dict):
            n = to_number(ep.get("episode"))
            if n is not None and n == n.to_integral_value() and (lowest is None or n < lowest):
                lowest = n
    if lowest is None or lowest <= 1:
        return Decimal(0)
    return lowest - 1


def title_lines(ep):
    # Crunchyroll only sends the title in whatever locale the request asked
    # for. If that isn't English we label it with the language instead of
    # pretending it's the English title.
    locale = (ep.get("language_presentation") or {}).get("text_locale") or "en-US"
    if locale.startswith("en"):
        return f"English Title: {ep['title']}"
    language = LOCALE_NAMES.get(locale, locale)
    return f"English Title:\n{language} Title: {ep['title']}"


def collect(episodes, offset):
    """Validate and pull out everything the output needs in one pass.

    Returns (entries, problems). Entries are only worth using when problems
    is empty, but we keep going after the first bad entry so the report
    lists everything wrong in one run instead of one per run.
    """
    entries, problems = [], []
    for index, ep in enumerate(episodes, start=1):
        if not isinstance(ep, dict):
            problems.append((f"Entry {index}", "not an object"))
            continue

        missing = [field for field in REQUIRED_FIELDS if ep.get(field) in (None, "")]
        aired = format_aired(ep.get("episode_air_date"))
        if "episode_air_date" not in missing and not aired:
            missing.append("episode_air_date (bad date)")
        preview = pick_preview(ep)
        if not preview:
            missing.append("images.thumbnail")

        if missing:
            label = ep.get("episode") or ep.get("id") or f"#{index}"
            problems.append((f"Episode {label}", ", ".join(missing)))
            continue

        if not problems:
            # Non numeric labels like "SP" pass through untouched.
            n = to_number(ep["episode"])
            number = show_number(n - offset) if n is not None else str(ep["episode"])
            entries.append({"number": number, "ep": ep, "aired": aired, "preview": preview})
    return entries, problems


def render(entry, preview):
    ep = entry["ep"]
    # Crunchyroll has nothing that marks filler or recaps, so every episode
    # starts as main and staff swap the tag by hand where it's wrong.
    # Descriptions occasionally carry line breaks, which would split the
    # field across lines and confuse the uploader, so flatten them.
    description = " ".join(ep["description"].split())
    block = (
        f"Episode {entry['number']}: (main)\n"
        f"{title_lines(ep)}\n"
        f"Duration: {format_duration(ep['duration_ms'])}\n"
        f"Aired: {entry['aired']}\n"
        f"Description: {description}\n"
        f"Preview: {preview}"
    )
    # Reviewers on ComicK want a link to check request mode episodes
    # against, and the watch page is the obvious one.
    if ep.get("id"):
        slug = ep.get("slug_title") or ""
        block += f"\nSource: https://www.crunchyroll.com/watch/{ep['id']}/{slug}".rstrip("/")
    return block


def file_stem(number, taken):
    # Episode labels end up as file names, so strip anything Windows won't
    # accept. Duplicates (possible with --keep-numbers on messy dumps) get
    # a -2, -3 suffix instead of overwriting each other.
    stem = re.sub(r"[^A-Za-z0-9._-]", "_", number).strip(".") or "episode"
    candidate, n = stem, 1
    while candidate.lower() in taken:
        n += 1
        candidate = f"{stem}-{n}"
    taken.add(candidate.lower())
    return candidate


def clear_images(folder):
    """Permanently delete images from the last run. Returns how many went.

    Only image files directly inside the folder are touched, so anything
    else someone parks there survives. Deleted with unlink, which bypasses
    the recycle bin.
    """
    if not folder.is_dir():
        return 0
    removed = 0
    for path in folder.iterdir():
        if path.is_file() and path.suffix.lower() in IMAGE_EXTS:
            path.unlink()
            removed += 1
    return removed


def fetch(url):
    request = urllib.request.Request(url, headers={"User-Agent": "comick-tools/crunchyroll-importer"})
    last_error = None
    for attempt in range(DOWNLOAD_RETRIES + 1):
        try:
            with urllib.request.urlopen(request, timeout=DOWNLOAD_TIMEOUT) as response:
                content_type = response.headers.get_content_type()
                return response.read(), content_type
        except urllib.error.HTTPError as e:
            # 4xx won't fix itself on a retry, so don't waste time on it.
            if e.code < 500:
                raise
            last_error = e
        except (urllib.error.URLError, OSError) as e:
            last_error = e
        time.sleep(0.5 * (attempt + 1))
    raise last_error


def download(entry, stem, folder):
    data, content_type = fetch(entry["preview"])
    # Trust the server's content type over the URL, since image CDNs often
    # serve webp behind a .png path.
    ext = CONTENT_TYPES.get(content_type) or os.path.splitext(urlparse(entry["preview"]).path)[1].lower()
    if ext not in IMAGE_EXTS:
        ext = ".png"
    name = stem + ext
    (folder / name).write_bytes(data)
    return name, len(data)


def describe_error(e):
    if isinstance(e, urllib.error.HTTPError):
        return f"HTTP {e.code}"
    reason = e.reason if isinstance(e, urllib.error.URLError) else e
    if isinstance(reason, socket.gaierror):
        return "host not found"
    if isinstance(reason, (socket.timeout, TimeoutError)):
        return "timed out"
    return str(reason) or type(reason).__name__


def download_all(entries, folder):
    """Fetch every preview in parallel.

    Returns ({index: relative path}, failures, total bytes). A failed image
    keeps its Crunchyroll URL in the output rather than sinking the run.
    """
    folder.mkdir(parents=True, exist_ok=True)
    taken = set()
    jobs = [(i, e, file_stem(e["number"], taken)) for i, e in enumerate(entries)]

    local, failures, total = {}, [], 0
    with ThreadPoolExecutor(max_workers=DOWNLOAD_WORKERS) as pool:
        futures = {pool.submit(download, e, stem, folder): (i, e) for i, e, stem in jobs}
        for done, future in enumerate(as_completed(futures), start=1):
            i, entry = futures[future]
            try:
                name, size = future.result()
                local[i] = f"{folder.name}/{name}"
                total += size
            except Exception as e:
                # Broad on purpose, any failure just falls back to the URL.
                failures.append((f"Episode {entry['number']}", describe_error(e)))
            out.progress(f"Downloading images {done}/{len(jobs)}")
    out.end_progress()
    return local, failures, total


def main():
    args = parse_args()
    started = time.perf_counter()
    out.header("crunchyroll-importer", "format episodes")

    try:
        raw = args.input.read_bytes()
    except FileNotFoundError:
        err.fail("Input file not found", [("Looked in", short(args.input))])
        sys.exit(1)

    try:
        # json.loads takes bytes directly, which skips a full decode copy.
        payload = json.loads(raw)
    except json.JSONDecodeError as e:
        err.fail("Input is not valid JSON", [(f"Line {e.lineno}", e.msg)])
        sys.exit(1)

    episodes = payload.get("data") if isinstance(payload, dict) else None
    if not isinstance(episodes, list) or not episodes:
        err.fail("Fields missing, aborted", [("data", "no episodes found")])
        sys.exit(1)

    out.step(f"Read {short(args.input)}", f"{len(episodes)} episodes, {human_size(len(raw))}")

    offset = Decimal(0) if args.keep_numbers else season_offset(episodes)
    entries, problems = collect(episodes, offset)
    if problems:
        err.fail("Fields missing, aborted", problems)
        sys.exit(1)
    out.step("All required fields present")

    if args.keep_numbers:
        out.step("Kept Crunchyroll numbering", "--keep-numbers")
    elif offset:
        out.step(f"Renumbered {show_number(offset + 1)} to 1", f"shifted by {show_number(offset)}")
    else:
        out.step("Numbering already starts at 0 or 1", "left as is")

    # Wiping happens on every run that gets this far, --no-images runs
    # included, so a stale folder never sits next to an output.txt that no
    # longer points at it. A run that failed validation above leaves the
    # previous images alone.
    images_dir = args.output.parent / "images"
    removed = clear_images(images_dir)
    if removed:
        out.step(f"Deleted {plural(removed, 'old image')}", short(images_dir))

    local = {}
    if args.images:
        t0 = time.perf_counter()
        local, failures, total = download_all(entries, images_dir)
        took = time.perf_counter() - t0
        if local:
            out.step(
                f"Downloaded {plural(len(local), 'image')}",
                f"{short(images_dir)}, {human_size(total)}, {human_time(took)}",
            )
        if failures:
            out.warn(f"{plural(len(failures), 'image')} failed, these upload without a preview", failures)

    blocks = [render(e, local.get(i, e["preview"])) for i, e in enumerate(entries)]
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text("\n\n".join(blocks) + "\n", encoding="utf-8")
    out.step(f"Wrote {short(args.output)}")

    elapsed = human_time(time.perf_counter() - started)
    out.say()
    out.say(f"  {out.bold(f'{len(blocks)} episodes')} {out.dim(f'in {elapsed}')}")
    out.say()


if __name__ == "__main__":
    main()
