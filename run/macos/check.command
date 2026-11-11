#!/bin/sh
# SPDX-License-Identifier: GPL-3.0-only
# Copyright (C) 2026 Russhvith

# macOS version of the dependency check. Double click it in Finder, or run
# it from Terminal. The checks themselves are shared with Linux in
# run/linux/check.sh, with macOS download links.

here=$(cd "$(dirname "$0")" && pwd)
COMICK_RUN_OS=macos sh "$here/../linux/check.sh" "$@"
status=$?
# Finder opens this in a Terminal window that closes when it ends, so wait
# for a key when started without arguments.
if [ $# -eq 0 ]; then
  printf '  Press Return to close.'
  read -r _
fi
exit $status
