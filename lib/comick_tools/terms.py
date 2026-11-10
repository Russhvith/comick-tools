# SPDX-License-Identifier: GPL-3.0-only
# Copyright (C) 2026 Russhvith

"""Asking for the Terms before a tool does anything.

Every tool calls require_terms() right after its header. Once accepted,
COMICK_AGREED_TO_TERMS=true is saved in .env and nobody is asked again.
"""

import os
import sys

from .console import err, out
from .env import set_env_values, terms_accepted

YES = ("", "y", "yes", "true")
NO = ("n", "no", "false")


def require_terms(accept=False):
    """Return once the Terms are accepted, or exit if they aren't.

    accept is the --accept-terms flag, which accepts without asking, the
    same as answering yes.
    """
    if terms_accepted():
        return
    if os.environ.get("COMICK_TOOLS_UI") == "1":
        # The web interface asks in its own window before it starts any
        # tool, so getting here means that was skipped. Don't prompt in
        # its console.
        err.fail("The Terms of Service haven't been accepted", [("Fix", "accept them in the web interface first")])
        sys.exit(1)
    if accept:
        _save()
        return

    interactive = sys.stdin.isatty() or os.environ.get("COMICK_TOOLS_FORCE_TTY") == "1"
    if not interactive:
        err.fail("The Terms of Service haven't been accepted", [
            ("Read", "legal/terms.txt and legal/privacy.txt"),
            ("Fix", "run this in a terminal to answer, or pass --accept-terms"),
        ])
        sys.exit(1)

    out.say("  Before you start, read the Terms of Service in legal/terms.txt")
    out.say("  and the Privacy Policy in legal/privacy.txt.")
    while True:
        try:
            answer = input(f"  {out.paint('?', '1;36')} Do you agree to the Terms of Service? [Y/n] ").strip().lower()
        except EOFError:
            # A closed input is not a yes, even though Enter alone would be.
            out.say()
            err.fail("No answer, so the Terms weren't accepted", [("Fix", "run this in a terminal to answer, or pass --accept-terms")])
            sys.exit(1)
        if answer in YES:
            _save()
            return
        if answer in NO:
            err.fail("You need to accept the Terms of Service to use ComicK Tools", [("Read", "legal/terms.txt")])
            sys.exit(1)
        out.say(f"    {out.paint('type y or n', '33')}")


def _save():
    try:
        set_env_values({"COMICK_AGREED_TO_TERMS": "true"})
    except OSError as e:
        # Accepted for this run anyway. It just gets asked again next time.
        out.warn("Couldn't save the answer to .env, so it will be asked again", [("Error", str(e))])
    out.step("Terms of Service accepted", "saved in .env")
    out.say()
