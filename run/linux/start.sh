#!/bin/sh
# SPDX-License-Identifier: GPL-3.0-only
# Copyright (C) 2026 Russhvith

# Starts the ComicK Tools web UI after checking that Python, Node and npm
# are installed. Ctrl+C stops the server.

here=$(cd "$(dirname "$0")" && pwd)

sh "$here/check.sh" ui || exit 1

# The UI runs the tools with python3 unless told otherwise. Point it at the
# Python the check passed, in case only "python" is new enough.
for cand in python3 python; do
  if command -v "$cand" >/dev/null 2>&1 && "$cand" -c 'import sys; sys.exit(0 if sys.version_info >= (3, 8) else 3)' >/dev/null 2>&1; then
    COMICK_TOOLS_PYTHON=${COMICK_TOOLS_PYTHON:-$(command -v "$cand")}
    export COMICK_TOOLS_PYTHON
    break
  fi
done

cd "$here/../../ui" || exit 1

# Only the first run needs this. In-app updates install their own
# packages, so an existing node_modules is left alone.
if [ ! -d node_modules ]; then
  echo "  Installing the web UI's packages, first run only..."
  echo
  npm install || exit 1
  echo
fi

# npm start prints the address once the server is up.
exec npm start
