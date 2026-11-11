#!/bin/sh
# SPDX-License-Identifier: GPL-3.0-only
# Copyright (C) 2026 Russhvith

# Checks that everything ComicK Tools needs is installed, in a version that
# works, and says where to get whatever isn't.
#
#   ./check.sh        checks for the web UI (Python, Node, npm, git)
#   ./check.sh cli    checks for the command line tools only (Python, git)
#
# Exits 1 when something required is missing. run/macos calls this too,
# with COMICK_RUN_OS=macos for the macOS download links.

mode=${1:-ui}

if [ -t 1 ]; then
  ok=$(printf '\033[32m'); bad=$(printf '\033[31m'); warn=$(printf '\033[33m'); dim=$(printf '\033[90m'); end=$(printf '\033[0m')
else
  ok=; bad=; warn=; dim=; end=
fi

if [ "$COMICK_RUN_OS" = macos ]; then
  os_name="macOS $(sw_vers -productVersion 2>/dev/null)"
  py_link="https://www.python.org/downloads/macos/"
  node_link="https://nodejs.org/en/download"
  git_link="https://git-scm.com/downloads/mac"
else
  os_name=$(uname -sr)
  py_link="https://www.python.org/downloads/source/ (or python3 from your package manager)"
  node_link="https://nodejs.org/en/download (or nodejs from your package manager, if it's 20.9 or newer)"
  git_link="https://git-scm.com/downloads/linux"
fi

failed=
say() { printf '  %s\n' "$1"; }
hint() { printf '      %s%s%s\n' "$dim" "$1" "$end"; }

echo
say "ComicK Tools, checking what's installed"
echo
say "${ok}+${end} $os_name"

# Python 3.8 or newer. python3 first, which is what the UI runs by default.
py=
for cand in python3 python; do
  if command -v "$cand" >/dev/null 2>&1 && "$cand" -c 'import sys; sys.exit(0 if sys.version_info >= (3, 8) else 3)' >/dev/null 2>&1; then
    py=$cand
    break
  fi
done
if [ -n "$py" ]; then
  say "${ok}+${end} Python $("$py" -c 'import sys; print(sys.version.split()[0])')    ${dim}$(command -v "$py")${end}"
else
  old=
  for cand in python3 python; do
    command -v "$cand" >/dev/null 2>&1 && old=$("$cand" -c 'import sys; print(sys.version.split()[0])' 2>/dev/null) && [ -n "$old" ] && break
  done
  if [ -n "$old" ]; then
    say "${bad}x${end} Python $old    3.8 or newer is needed"
  else
    say "${bad}x${end} Python    not found"
  fi
  hint "Install it from $py_link"
  failed=1
fi

if [ "$mode" = ui ]; then
  # Node 20.9 or newer, the oldest Next.js 16 supports.
  if command -v node >/dev/null 2>&1; then
    node_ver=$(node -v)
    if node -e 'const v=process.versions.node.split(".").map(Number);process.exit(v[0]>20||(v[0]==20&&v[1]>=9)?0:3)' >/dev/null 2>&1; then
      say "${ok}+${end} Node.js $node_ver"
    else
      say "${bad}x${end} Node.js $node_ver    20.9 or newer is needed"
      hint "Install the LTS version from $node_link"
      failed=1
    fi
  else
    say "${bad}x${end} Node.js    not found"
    hint "Install the LTS version from $node_link"
    failed=1
  fi

  # npm comes with Node, so it only goes missing with a broken install.
  if command -v npm >/dev/null 2>&1; then
    say "${ok}+${end} npm $(npm -v 2>/dev/null)"
  else
    say "${bad}x${end} npm    not found"
    hint "It comes with Node.js, reinstall it from $node_link"
    failed=1
  fi
fi

# git is only for updates and the homepage's activity, so it's a warning.
if command -v git >/dev/null 2>&1; then
  say "${ok}+${end} git $(git --version | cut -d' ' -f3)"
else
  say "${warn}!${end} git    not found, optional"
  hint "Needed for in-app updates and the homepage's activity. Get it from $git_link"
fi

echo
if [ -n "$failed" ]; then
  say "${bad}Something required is missing.${end} Install it, then run this again."
  echo
  exit 1
fi
say "${ok}Everything needed is installed.${end}"
echo
exit 0
