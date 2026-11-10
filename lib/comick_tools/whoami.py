# SPDX-License-Identifier: GPL-3.0-only
# Copyright (C) 2026 Russhvith

"""Print the ComicK account behind the .env cookie as one line of JSON.

The web UI runs this rather than calling the API itself, since Cloudflare
answers Node's fetch with a challenge page but lets this client through.
Only what the UI shows comes out: the email is turned into its Gravatar
hash here and goes no further, and the cookie is never printed.
"""

import hashlib
import json
import sys
from pathlib import Path

# Run as a file by the UI, so the package root has to be on the path.
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from comick_tools.api import ApiError, connect  # noqa: E402
from comick_tools.env import SettingsError, comick_settings, terms_accepted  # noqa: E402

WHOAMI_PATH = "/v2.0/sessions/whoami"


def as_dict(value):
    return value if isinstance(value, dict) else {}


def main():
    # Nothing goes to ComicK before the Terms are accepted. The UI checks
    # first, this is the backstop.
    if not terms_accepted():
        print(json.dumps({"state": "not-agreed"}))
        return
    try:
        settings = comick_settings()
    except SettingsError:
        print(json.dumps({"state": "no-cookie"}))
        return
    try:
        me = connect(settings, "comick-tools/ui").request("GET", WHOAMI_PATH)
    except ApiError as e:
        state = "rejected" if e.is_auth else "error"
        print(json.dumps({"state": state, "message": e.message}))
        return

    me = as_dict(me)
    identity = as_dict(me.get("identity"))
    traits = as_dict(identity.get("traits"))
    # user_info is the current name for the profile, info the older copy.
    profile = as_dict(me.get("user_info") or me.get("info"))
    email = str(traits.get("email") or "").strip().lower()
    print(json.dumps({
        "state": "ok",
        "active": me.get("active") is True and identity.get("state") == "active",
        "id": identity.get("id"),
        "username": traits.get("username"),
        "email_hash": hashlib.md5(email.encode("utf-8")).hexdigest() if email else None,
        "created_at": identity.get("created_at"),
        "role": profile.get("role"),
        "karma": profile.get("karma"),
        "uploads": profile.get("uploaded_chapter_count"),
        "comments": profile.get("comment_count"),
        "following": profile.get("user_comic_follow_count"),
        "last_active": profile.get("last_activity_at"),
    }))


if __name__ == "__main__":
    main()
