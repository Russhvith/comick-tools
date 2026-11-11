#!/bin/sh
# SPDX-License-Identifier: GPL-3.0-only
# Copyright (C) 2026 Russhvith

# Starts the ComicK Tools web UI on macOS. Double click it in Finder, or run
# it from Terminal. Ctrl+C stops the server. Shares the start script with
# Linux, with macOS download links in the checks.

here=$(cd "$(dirname "$0")" && pwd)
COMICK_RUN_OS=macos sh "$here/../linux/start.sh"
status=$?
if [ $status -ne 0 ]; then
  printf '  Press Return to close.'
  read -r _
fi
exit $status
