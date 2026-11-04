"""Turn a Crunchyroll episode list dump into a plain text summary.

Reads the JSON returned by Crunchyroll's season episodes endpoint and writes
one block per episode with its number, title, duration, description and a
preview image.
"""

import argparse
import json
import os
import sys
import time
from datetime import datetime
from decimal import Decimal, InvalidOperation
from pathlib import Path

DATA_DIR = Path(__file__).resolve().parent / "data"

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


def enable_windows_vt(stream):
    # Older Windows consoles print escape codes as garbage until VT
    # processing is switched on for the handle. Returns False if that
    # isn't possible, so we fall back to plain text.
    import ctypes

    kernel32 = ctypes.windll.kernel32
    handle = kernel32.GetStdHandle(-12 if stream is sys.stderr else -11)
    mode = ctypes.c_uint32()
    if not kernel32.GetConsoleMode(handle, ctypes.byref(mode)):
        return False
    return bool(kernel32.SetConsoleMode(handle, mode.value | 0x0004))


class Console:
    """Just enough styling for a nice terminal, without pulling in rich.

    Colour turns off when output is piped or NO_COLOR is set, and the
    symbols fall back to ASCII when the stream can't encode them (old
    Windows code pages mostly).
    """

    def __init__(self, stream):
        self.stream = stream
        self.color = stream.isatty() and "NO_COLOR" not in os.environ
        if self.color and os.name == "nt":
            self.color = enable_windows_vt(stream)

        try:
            "✓✗›─".encode(stream.encoding or "ascii")
            self.ok, self.bad, self.arrow, self.rule = "✓", "✗", "›", "─"
        except (UnicodeEncodeError, LookupError):
            self.ok, self.bad, self.arrow, self.rule = "+", "x", ">", "-"

    def paint(self, text, code):
        return f"\033[{code}m{text}\033[0m" if self.color else text

    def dim(self, text):
        return self.paint(text, "2")

    def bold(self, text):
        return self.paint(text, "1")

    def say(self, text=""):
        print(text, file=self.stream)

    def header(self, tool, action):
        self.say()
        self.say(f"  {self.paint(f' {tool} ', '1;30;43')} {self.dim(action)}")
        self.say()

    def step(self, text, detail=""):
        mark = self.paint(self.ok, "32")
        self.say(f"  {mark} {text}" + (f"  {self.dim(detail)}" if detail else ""))

    def fail(self, text, rows=()):
        # stdout is buffered when piped, so push the header out first or
        # the error lands above it.
        sys.stdout.flush()
        self.say(f"  {self.paint(self.bad, '31')} {self.paint(text, '1;31')}")
        if rows:
            width = max(len(label) for label, _ in rows)
            for label, detail in rows:
                self.say(f"    {self.dim(self.arrow)} {label.ljust(width)}  {self.paint(detail, '33')}")
        self.say()


out = Console(sys.stdout)
err = Console(sys.stderr)


def parse_args():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("-i", "--input", type=Path, default=DATA_DIR / "input.json")
    parser.add_argument("-o", "--output", type=Path, default=DATA_DIR / "output.txt")
    parser.add_argument(
        "--keep-numbers",
        action="store_true",
        help="use Crunchyroll's episode numbers as is instead of restarting the season at 1",
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
    # the useful part.
    try:
        return datetime.fromisoformat(stamp.replace("Z", "+00:00")).date().isoformat()
    except (ValueError, AttributeError):
        return None


def to_number(value):
    try:
        return Decimal(str(value))
    except InvalidOperation:
        return None


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


def build(episodes, offset):
    """Validate and format in one pass.

    Returns (blocks, problems). Blocks are only worth writing when problems
    is empty, but we keep going after the first bad entry so the report
    lists everything wrong in one run instead of one per run.
    """
    blocks, problems = [], []
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
            number = show_number(n - offset) if n is not None else ep["episode"]
            blocks.append(
                f"Episode {number}:\n"
                f"{title_lines(ep)}\n"
                f"Duration: {format_duration(ep['duration_ms'])}\n"
                f"Aired: {aired}\n"
                f"Description: {ep['description'].strip()}\n"
                f"Preview: {preview}"
            )
    return blocks, problems


def human_size(n):
    for unit in ("B", "KB", "MB"):
        if n < 1024 or unit == "MB":
            return f"{n:.0f} {unit}" if unit == "B" else f"{n:.1f} {unit}"
        n /= 1024


def short(path):
    try:
        return str(path.resolve().relative_to(Path.cwd()))
    except ValueError:
        return str(path)


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
    blocks, problems = build(episodes, offset)
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

    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text("\n\n".join(blocks) + "\n", encoding="utf-8")
    out.step(f"Wrote {short(args.output)}")

    elapsed = (time.perf_counter() - started) * 1000
    out.say()
    out.say(f"  {out.bold(f'{len(blocks)} episodes')} {out.dim(f'in {elapsed:.0f} ms')}")
    out.say()


if __name__ == "__main__":
    main()
