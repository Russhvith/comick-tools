@echo off
rem SPDX-License-Identifier: GPL-3.0-only
rem Copyright (C) 2026 Russhvith

rem Windows 10 version of run\windows\check.bat. Same checks, in plain text,
rem since consoles on older Windows 10 builds print colour codes as junk.

setlocal
set "COMICK_RUN_PLAIN=1"
call "%~dp0..\check.bat" %*
endlocal & set "COMICK_TOOLS_PYTHON=%COMICK_TOOLS_PYTHON%" & exit /b %errorlevel%
