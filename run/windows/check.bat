@echo off
rem SPDX-License-Identifier: GPL-3.0-only
rem Copyright (C) 2026 Russhvith

rem Checks that everything ComicK Tools needs is installed, in a version
rem that works, and says where to get whatever isn't.
rem
rem   check.bat        checks for the web UI (Python, Node, npm, git)
rem   check.bat cli    checks for the command line tools only (Python, git)
rem
rem Exits 1 when something required is missing. When called from another
rem script it hands back COMICK_TOOLS_PYTHON, the full path of the Python
rem that passed, so the UI runs the tools with that one.
rem
rem The win10 and win7 folders call this with COMICK_RUN_PLAIN (no colour)
rem and COMICK_RUN_WIN7 (links to the last releases that install there).

setlocal EnableExtensions EnableDelayedExpansion

set "MODE=%~1"
set "STANDALONE="
if "%MODE%"=="" (
  set "MODE=ui"
  rem Started on its own, likely by a double click, so keep the window
  rem open at the end instead of flashing the result away.
  set "STANDALONE=1"
)

set "C_OK=" & set "C_BAD=" & set "C_WARN=" & set "C_DIM=" & set "C_END="
if not defined COMICK_RUN_PLAIN (
  for /f %%e in ('echo prompt $E^| cmd') do set "ESC=%%e"
  set "C_OK=!ESC![32m" & set "C_BAD=!ESC![31m" & set "C_WARN=!ESC![33m" & set "C_DIM=!ESC![90m" & set "C_END=!ESC![0m"
)

if defined COMICK_RUN_WIN7 (
  set "PY_LINK=https://www.python.org/downloads/release/python-3810/"
  set "PY_NOTE=3.8.10 is the last Python that installs on Windows 7"
  set "GIT_LINK=https://github.com/git-for-windows/git/releases/tag/v2.46.2.windows.1"
) else (
  set "PY_LINK=https://www.python.org/downloads/windows/"
  set "PY_NOTE=tick the Add python.exe to PATH box in the installer"
  set "GIT_LINK=https://git-scm.com/downloads/win"
)
set "NODE_LINK=https://nodejs.org/en/download"

set "FAILED="
echo.
echo   ComicK Tools, checking what's installed
echo.

rem Windows itself. 6.x is Windows 7 or 8, where current Node won't install.
rem Windows 11 still calls itself 10.0, the build number tells them apart.
set "WIN_MAJOR=0" & set "WIN_MINOR=0" & set "WIN_BUILD=0"
for /f "tokens=4-6 delims=.] " %%a in ('ver') do (
  set "WIN_MAJOR=%%a" & set "WIN_MINOR=%%b" & set "WIN_BUILD=%%c"
)
set "WIN_VER=%WIN_MAJOR%.%WIN_MINOR%"
if "%WIN_VER%"=="6.1" set "WIN_VER=7"
if "%WIN_VER%"=="6.2" set "WIN_VER=8"
if "%WIN_VER%"=="6.3" set "WIN_VER=8.1"
if "%WIN_MAJOR%"=="10" (
  if %WIN_BUILD% GEQ 22000 (set "WIN_VER=11") else (set "WIN_VER=10")
)
set "WIN_VER=%WIN_VER% (build %WIN_BUILD%)"
if %WIN_MAJOR% LSS 10 (
  if /i "%MODE%"=="ui" (
    echo   %C_BAD%x%C_END% Windows !WIN_VER!    the web UI needs Windows 10 or newer
    echo       %C_DIM%Use run\windows\win7\start.bat to run the tools from the command line.%C_END%
    set "FAILED=1"
  ) else (
    echo   %C_OK%+%C_END% Windows !WIN_VER!
  )
) else (
  echo   %C_OK%+%C_END% Windows !WIN_VER!
)

rem Python 3.8 or newer. "python" first, which is what the UI runs by
rem default, then the "py" launcher. The Microsoft Store placeholder that
rem answers to "python" without Python installed fails the version query
rem and counts as missing.
set "PY_EXE=" & set "PY_VER="
call :find_python python
if not defined PY_EXE call :find_python "py -3"
if defined PY_EXE (
  echo   %C_OK%+%C_END% Python !PY_VER!    %C_DIM%!PY_EXE!%C_END%
) else if defined PY_OLD (
  echo   %C_BAD%x%C_END% Python !PY_OLD!    3.8 or newer is needed
  echo       %C_DIM%Install it from %PY_LINK% ^(%PY_NOTE%^)%C_END%
  set "FAILED=1"
) else (
  echo   %C_BAD%x%C_END% Python    not found
  echo       %C_DIM%Install it from %PY_LINK% ^(%PY_NOTE%^)%C_END%
  set "FAILED=1"
)

if /i "%MODE%"=="ui" (
  rem Node 20.9 or newer, the oldest Next.js 16 supports.
  set "NODE_VER="
  for /f "usebackq delims=" %%v in (`node -v 2^>nul`) do set "NODE_VER=%%v"
  if not defined NODE_VER (
    echo   %C_BAD%x%C_END% Node.js    not found
    echo       %C_DIM%Install the LTS version from %NODE_LINK%%C_END%
    set "FAILED=1"
  ) else (
    node -e "const v=process.versions.node.split('.').map(Number);process.exit(v[0]>20||(v[0]==20&&v[1]>=9)?0:3)" >nul 2>&1
    if errorlevel 1 (
      echo   %C_BAD%x%C_END% Node.js !NODE_VER!    20.9 or newer is needed
      echo       %C_DIM%Install the LTS version from %NODE_LINK%%C_END%
      set "FAILED=1"
    ) else (
      echo   %C_OK%+%C_END% Node.js !NODE_VER!
    )
  )

  rem npm comes with Node, so it only goes missing with a broken install.
  set "NPM_VER="
  for /f "usebackq delims=" %%v in (`npm -v 2^>nul`) do set "NPM_VER=%%v"
  if defined NPM_VER (
    echo   %C_OK%+%C_END% npm !NPM_VER!
  ) else (
    echo   %C_BAD%x%C_END% npm    not found
    echo       %C_DIM%It comes with Node.js, reinstall it from %NODE_LINK%%C_END%
    set "FAILED=1"
  )
)

rem git is only for updates and the homepage's activity, so it's a warning.
set "GIT_VER="
for /f "usebackq tokens=3" %%v in (`git --version 2^>nul`) do set "GIT_VER=%%v"
if defined GIT_VER (
  echo   %C_OK%+%C_END% git !GIT_VER!
) else (
  echo   %C_WARN%^^!%C_END% git    not found, optional
  echo       %C_DIM%Needed for in-app updates and the homepage's activity. Get it from %GIT_LINK%%C_END%
)

echo.
if defined FAILED (
  echo   %C_BAD%Something required is missing.%C_END% Install it, then run this again.
  set "RESULT=1"
) else (
  echo   %C_OK%Everything needed is installed.%C_END%
  set "RESULT=0"
)
echo.
if defined STANDALONE pause

endlocal & set "COMICK_TOOLS_PYTHON=%PY_EXE%" & exit /b %RESULT%


rem Sets PY_EXE and PY_VER when the given command is Python 3.8 or newer,
rem or PY_OLD when it's an older one.
:find_python
set "CAND=%~1"
set "FOUND_VER="
for /f "usebackq delims=" %%v in (`%CAND% -c "import sys;print(sys.version.split()[0])" 2^>nul`) do set "FOUND_VER=%%v"
if not defined FOUND_VER exit /b 0
%CAND% -c "import sys;sys.exit(0 if sys.version_info>=(3,8) else 3)" >nul 2>&1
if errorlevel 1 (
  if not defined PY_OLD set "PY_OLD=%FOUND_VER%"
  exit /b 0
)
set "PY_VER=%FOUND_VER%"
for /f "usebackq delims=" %%p in (`%CAND% -c "import sys;print(sys.executable)" 2^>nul`) do set "PY_EXE=%%p"
exit /b 0
