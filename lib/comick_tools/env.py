# SPDX-License-Identifier: GPL-3.0-only
# Copyright (C) 2026 Russhvith

"""Shared config from the root .env."""

import os
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]

DEFAULT_API = "https://api.comick.dev"
DEFAULT_PER_SECOND = 5
DEFAULT_PER_MINUTE = 200


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
    path = path or REPO_ROOT / ".env"
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
