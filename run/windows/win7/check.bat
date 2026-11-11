@echo off
rem SPDX-License-Identifier: GPL-3.0-only
rem Copyright (C) 2026 Russhvith

rem Windows 7 version of run\windows\check.bat. The web UI needs Node 20.9,
rem which doesn't install on Windows 7, so this only checks what the
rem command line tools need, and links to the last Python (3.8.10) and git
rem that still install there. Plain text, since the Windows 7 console has
rem no colour codes.

setlocal
set "COMICK_RUN_PLAIN=1"
set "COMICK_RUN_WIN7=1"
call "%~dp0..\check.bat" cli %*
set "CHECK_RESULT=%errorlevel%"
if "%~1"=="" pause
endlocal & set "COMICK_TOOLS_PYTHON=%COMICK_TOOLS_PYTHON%" & exit /b %CHECK_RESULT%
