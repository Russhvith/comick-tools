@echo off
rem SPDX-License-Identifier: GPL-3.0-only
rem Copyright (C) 2026 Russhvith

rem Runs the tools on Windows 7, where the web UI can't. Checks Python,
rem then shows a menu of every tool's scripts and runs the one picked in
rem this window. Anything a script needs, it asks for here.

setlocal EnableExtensions
title ComicK Tools
set "COMICK_RUN_PLAIN=1"
set "COMICK_RUN_WIN7=1"

call "%~dp0..\check.bat" cli
if errorlevel 1 goto :failed

"%COMICK_TOOLS_PYTHON%" "%~dp0menu.py"
if errorlevel 1 goto :failed
exit /b 0

:failed
echo.
pause
exit /b 1
