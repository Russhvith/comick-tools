"""Turn a Crunchyroll episode list dump into a plain text summary.

Reads the JSON returned by Crunchyroll's season episodes endpoint and writes
one block per episode with its number, title, duration, description and a
preview image.
"""

import argparse
import json
import sys
from pathlib import Path

TOOL_DIR = Path(__file__).resolve().parent

# Anything less than this and the output block can't be built, so we bail
# before writing a half finished file.
REQUIRED_FIELDS = ("episode", "title", "duration_ms", "description", "images")

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
    parser.add_argument("-i", "--input", type=Path, default=TOOL_DIR / "input.json")
    parser.add_argument("-o", "--output", type=Path, default=TOOL_DIR / "output.txt")
    return parser.parse_args()


def find_missing(episodes):
    """Return a list of human readable problems, empty if everything is there."""
    problems = []
    for index, ep in enumerate(episodes, start=1):
        if not isinstance(ep, dict):
            problems.append(f"entry {index}: not an object")
            continue

        missing = [field for field in REQUIRED_FIELDS if ep.get(field) in (None, "")]
        if "images" not in missing and not pick_preview(ep):
            missing.append("images.thumbnail")

        if missing:
            label = ep.get("episode") or ep.get("id") or f"#{index}"
            problems.append(f"episode {label}: {', '.join(missing)}")
    return problems


def pick_preview(ep):
    # Thumbnails come as a list of size variants nested one level deep. The
    # widest one is the most useful for a preview, so grab that.
    groups = (ep.get("images") or {}).get("thumbnail") or []
    variants = [v for group in groups for v in group if v.get("source")]
    if not variants:
        return None
    return max(variants, key=lambda v: v.get("width", 0))["source"]


def format_duration(ms):
    total = round(ms / 1000)
    hours, rest = divmod(total, 3600)
    minutes, seconds = divmod(rest, 60)
    if hours:
        return f"{hours}:{minutes:02}:{seconds:02}"
    return f"{minutes}:{seconds:02}"


def title_lines(ep):
    # Crunchyroll only sends the title in whatever locale the request asked
    # for. If that isn't English we label it with the language instead of
    # pretending it's the English title.
    locale = (ep.get("language_presentation") or {}).get("text_locale") or "en-US"
    if locale.startswith("en"):
        return [f"English Title: {ep['title']}"]
    language = LOCALE_NAMES.get(locale, locale)
    return ["English Title:", f"{language} Title: {ep['title']}"]


def format_episode(ep):
    lines = [f"Episode {ep['episode']}:"]
    lines += title_lines(ep)
    lines += [
        f"Duration: {format_duration(ep['duration_ms'])}",
        f"Description: {ep['description'].strip()}",
        f"Preview: {pick_preview(ep)}",
    ]
    return "\n".join(lines)


def main():
    args = parse_args()

    try:
        payload = json.loads(args.input.read_text(encoding="utf-8"))
    except FileNotFoundError:
        sys.exit(f"Input file not found: {args.input}")
    except json.JSONDecodeError as err:
        sys.exit(f"Input is not valid JSON: {err}")

    episodes = payload.get("data") if isinstance(payload, dict) else None
    if not isinstance(episodes, list) or not episodes:
        sys.exit("Fields missing, aborted: no episodes under 'data'")

    problems = find_missing(episodes)
    if problems:
        print("Fields missing, aborted:", file=sys.stderr)
        for problem in problems:
            print(f"  {problem}", file=sys.stderr)
        sys.exit(1)

    blocks = [format_episode(ep) for ep in episodes]
    args.output.write_text("\n\n".join(blocks) + "\n", encoding="utf-8")
    print(f"Wrote {len(blocks)} episodes to {args.output}")


if __name__ == "__main__":
    main()
