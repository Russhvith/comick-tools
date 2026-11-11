# SPDX-License-Identifier: GPL-3.0-only
# Copyright (C) 2026 Russhvith

"""Pick a tool script and run it, for Windows 7 where the web UI can't run.

Lists the scripts every tool.json declares, the same ones the web UI
shows, and runs the chosen one in this console. The scripts ask for
anything they need themselves, so nothing is passed in.
"""

import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
TOOLS = ROOT / "tools"
GROUPS = ("public", "admin")


def load_scripts():
    found = []
    for group in GROUPS:
        group_dir = TOOLS / group
        if not group_dir.is_dir():
            continue
        for tool_dir in sorted(p for p in group_dir.iterdir() if p.is_dir()):
            manifest = tool_dir / "tool.json"
            try:
                tool = json.loads(manifest.read_text(encoding="utf-8"))
            except (OSError, ValueError):
                # A broken manifest hides that one tool, same as in the UI.
                continue
            name = str(tool.get("name") or tool_dir.name)
            for script in tool.get("scripts") or []:
                path = tool_dir / str(script.get("file") or "")
                if path.is_file():
                    found.append((group, name, str(script.get("title") or path.name), path))
    return found


def main():
    scripts = load_scripts()
    if not scripts:
        print("  No tools found under " + str(TOOLS))
        return 1
    while True:
        print()
        print("  ComicK Tools")
        print()
        for i, (group, name, title, _) in enumerate(scripts, start=1):
            note = "  (needs a trusted, moderator or admin account)" if group == "admin" else ""
            print("  {:>2}. {}: {}{}".format(i, name, title, note))
        print("   q. Quit")
        print()
        try:
            choice = input("  Pick a number: ").strip().lower()
        except (EOFError, KeyboardInterrupt):
            print()
            return 0
        if choice in ("q", "quit", "exit"):
            return 0
        if not choice.isdigit() or not 1 <= int(choice) <= len(scripts):
            print("  That isn't one of the numbers above.")
            continue
        path = scripts[int(choice) - 1][3]
        try:
            subprocess.call([sys.executable, str(path)], cwd=str(ROOT))
        except KeyboardInterrupt:
            # Ctrl+C stops the script, not the menu.
            pass


if __name__ == "__main__":
    sys.exit(main())
