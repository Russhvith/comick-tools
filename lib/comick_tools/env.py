# SPDX-License-Identifier: GPL-3.0-only
# Copyright (C) 2026 Russhvith

"""Shared config from the root .env."""

import os
import re
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]

DEFAULT_API = "https://api.comick.dev"
DEFAULT_PER_SECOND = 5
DEFAULT_PER_MINUTE = 200


def env_path():
    """The .env in use. COMICK_TOOLS_ENV_FILE points elsewhere, which keeps
    tests away from the real one."""
    override = os.environ.get("COMICK_TOOLS_ENV_FILE")
    return Path(override) if override else REPO_ROOT / ".env"


class SettingsError(Exception):
    def __init__(self, title, rows):
        super().__init__(title)
        self.title = title
        self.rows = rows


def load_env(path=None):
    """Read KEY=VALUE pairs from the root .env without needing python-dotenv.

    Real environment variables win over the file, same as dotenv, which
    makes one off overrides on the command line easy.
    """
    path = path or env_path()
    values = {}
    try:
        text = path.read_text(encoding="utf-8-sig")
    except FileNotFoundError:
        text = ""
    for line in text.splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        key = key.strip()
        if key.startswith("export "):
            key = key[len("export "):].strip()
        value = value.strip()
        if len(value) >= 2 and value[0] == value[-1] and value[0] in "\"'":
            value = value[1:-1]
        values[key] = value
    values.update({k: v for k, v in os.environ.items() if k in values or k.startswith("COMICK_")})
    return values


_KEY_LINE = re.compile(r"^(\s*(?:export\s+)?)([A-Za-z_][A-Za-z0-9_]*)(\s*=\s*)(.*)$")


def _format_value(value):
    """A value as it should appear in .env, quoted only when it has to be."""
    value = str(value)
    if any(c in value for c in "\r\n\0"):
        # A line break in a pasted value would start a new setting.
        raise ValueError("values can't contain line breaks")
    if value == "" or not re.search(r"[\s#'\"]", value):
        return value
    if '"' not in value:
        return '"' + value + '"'
    if "'" not in value:
        return "'" + value + "'"
    raise ValueError("values can't contain both kinds of quote")


def set_env_values(updates, path=None):
    """Write keys into .env, leaving every other line exactly as it was.

    A key already in the file is changed in place, keeping any export
    prefix. A new one goes at the end. A missing or empty .env starts
    from .env.example, so its comments come along. The write goes
    through a temp file and a rename, so a crash can't leave half a file.
    """
    path = Path(path) if path else env_path()
    formatted = {key: _format_value(value) for key, value in updates.items()}
    raw = path.read_bytes() if path.exists() else b""
    if not raw.strip():
        # Missing or empty: start from the template, so the comments that
        # explain each setting end up in the real file too.
        example = REPO_ROOT / ".env.example" if path == REPO_ROOT / ".env" else path.with_name(".env.example")
        raw = example.read_bytes() if example.exists() else b""
    bom = raw.startswith(b"\xef\xbb\xbf")
    text = raw.decode("utf-8-sig")
    newline = "\r\n" if "\r\n" in text else "\n"
    lines = text.splitlines()

    for key, value in formatted.items():
        # The last copy of a key is the one load_env ends up with.
        for i in range(len(lines) - 1, -1, -1):
            match = _KEY_LINE.match(lines[i])
            if match and match.group(2) == key:
                lines[i] = match.group(1) + key + match.group(3) + value
                break
        else:
            lines.append(key + "=" + value)

    data = (newline.join(lines) + newline).encode("utf-8")
    if bom:
        data = b"\xef\xbb\xbf" + data
    temp = path.with_name(path.name + ".tmp")
    temp.write_bytes(data)
    try:
        os.replace(str(temp), str(path))
    except OSError:
        # Windows can refuse the rename while something has .env open.
        path.write_bytes(data)
        temp.unlink()


def terms_accepted(env=None):
    env = load_env() if env is None else env
    return str(env.get("COMICK_AGREED_TO_TERMS", "")).strip().lower() == "true"


def _positive(env, name, default):
    raw = env.get(name) or default
    try:
        value = float(raw)
        if value <= 0:
            raise ValueError
    except ValueError:
        raise SettingsError(f"{name} must be a positive number", [("Got", str(raw))])
    return value


def comick_settings(env=None):
    """Everything needed to talk to ComicK, or a SettingsError explaining
    what's missing."""
    env = load_env() if env is None else env
    token = env.get("COMICK_SESSION_TOKEN", "").strip()
    if not token:
        raise SettingsError("No session cookie set", [
            ("Missing", "COMICK_SESSION_TOKEN in .env"),
            ("Fix", "copy __Secure-comick-auth.session_token from the browser, see docs/auth.md"),
        ])
    return {
        "token": token,
        "base": env.get("COMICK_API_BASE") or DEFAULT_API,
        "per_second": _positive(env, "COMICK_UPLOADS_PER_SECOND", DEFAULT_PER_SECOND),
        "per_minute": _positive(env, "COMICK_REQUESTS_PER_MINUTE", DEFAULT_PER_MINUTE),
    }
