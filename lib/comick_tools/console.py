"""Terminal output shared by every tool, plus the small formatters used in
status lines."""

import os
import sys
from pathlib import Path

# Windows 7 and 8 consoles can't do ANSI colour at all, and their default
# raster font has no glyphs for the tick and cross, so both get skipped
# there rather than printing boxes and escape junk.
LEGACY_WINDOWS = os.name == "nt" and sys.getwindowsversion().major < 10


def enable_windows_vt(stream):
    # Windows 10 consoles still need VT processing switched on per handle
    # before escape codes render. Returns False if that isn't possible, so
    # we fall back to plain text.
    import ctypes
    from ctypes import wintypes

    kernel32 = ctypes.windll.kernel32
    # Without an explicit restype the handle comes back as a 32 bit int and
    # gets truncated on 64 bit Python.
    kernel32.GetStdHandle.restype = wintypes.HANDLE
    handle = kernel32.GetStdHandle(-12 if stream is sys.stderr else -11)
    mode = wintypes.DWORD()
    if not kernel32.GetConsoleMode(handle, ctypes.byref(mode)):
        return False
    return bool(kernel32.SetConsoleMode(handle, mode.value | 0x0004))


class Console:
    """Just enough styling for a nice terminal, without pulling in rich.

    Colour turns off when output is piped, NO_COLOR is set or the console
    is older than Windows 10. Symbols fall back to ASCII on those old
    consoles and whenever the stream can't encode them.
    """

    def __init__(self, stream):
        self.stream = stream
        self.color = stream.isatty() and "NO_COLOR" not in os.environ and not LEGACY_WINDOWS
        if self.color and os.name == "nt":
            self.color = enable_windows_vt(stream)

        fancy = not LEGACY_WINDOWS
        if fancy:
            try:
                "✓✗›".encode(stream.encoding or "ascii")
            except (UnicodeEncodeError, LookupError):
                fancy = False
        self.ok, self.bad, self.arrow = ("✓", "✗", "›") if fancy else ("+", "x", ">")
        self.live = stream.isatty()

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

    def progress(self, text):
        # Redraws one line in place. Skipped when piped since a log full of
        # carriage returns is worse than no progress at all.
        if self.live:
            self.stream.write(f"\r  {self.dim(self.arrow)} {text}   ")
            self.stream.flush()

    def end_progress(self):
        if self.live:
            self.stream.write("\r" + " " * 70 + "\r")

    def rows(self, rows, color="33"):
        width = max(len(label) for label, _ in rows)
        for label, detail in rows:
            self.say(f"    {self.dim(self.arrow)} {label.ljust(width)}  {self.paint(detail, color)}")

    def section(self, title, color="1"):
        self.say()
        self.say(f"  {self.paint(title, color)}")

    def warn(self, text, rows=()):
        self.say(f"  {self.paint('!', '1;33')} {self.paint(text, '33')}")
        if rows:
            self.rows(rows)

    def fail(self, text, rows=()):
        # stdout is buffered when piped, so push the header out first or
        # the error lands above it.
        sys.stdout.flush()
        self.say(f"  {self.paint(self.bad, '31')} {self.paint(text, '1;31')}")
        if rows:
            self.rows(rows)
        self.say()


out = Console(sys.stdout)
err = Console(sys.stderr)


def human_size(n):
    for unit in ("B", "KB", "MB"):
        if n < 1024 or unit == "MB":
            return f"{n:.0f} {unit}" if unit == "B" else f"{n:.1f} {unit}"
        n /= 1024


def human_time(seconds):
    # Steps up a unit once the smaller one stops being easy to read, so a
    # quick run says 40 ms and an image heavy one says 3.2 s, not 3195 ms.
    # Round before picking the unit, otherwise 59.96 s prints as "60.0 s".
    if round(seconds * 1000) < 1000:
        return f"{seconds * 1000:.0f} ms"
    if round(seconds, 1) < 60:
        return f"{seconds:.1f} s"
    minutes, secs = divmod(round(seconds), 60)
    if minutes < 60:
        return f"{minutes} m {secs:02} s"
    hours, minutes = divmod(minutes, 60)
    return f"{hours} h {minutes:02} m"


def plural(n, word):
    return f"{n} {word}" if n == 1 else f"{n} {word}s"


def short(path):
    try:
        return str(path.resolve().relative_to(Path.cwd()))
    except ValueError:
        return str(path)

