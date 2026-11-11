@echo off
rem SPDX-License-Identifier: GPL-3.0-only
rem Copyright (C) 2026 Russhvith

rem Windows 10 version of run\windows\start.bat. Starts the web UI the same
rem way, with the checks in plain text instead of colour.

set "COMICK_RUN_PLAIN=1"
call "%~dp0..\start.bat"
