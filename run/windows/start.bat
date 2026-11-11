@echo off
rem SPDX-License-Identifier: GPL-3.0-only
rem Copyright (C) 2026 Russhvith

rem Starts the ComicK Tools web UI on Windows 11, after checking that
rem Python, Node and npm are installed. Double click it, or run it from a
rem terminal. Close the window or press Ctrl+C to stop the server.

setlocal EnableExtensions
title ComicK Tools

call "%~dp0check.bat" ui
if errorlevel 1 goto :failed

cd /d "%~dp0..\..\ui" || goto :failed

rem Only the first run needs this. In-app updates install their own
rem packages, so an existing node_modules is left alone.
if not exist "node_modules\" (
  echo   Installing the web UI's packages, first run only...
  echo.
  call npm install || goto :failed
  echo.
)

rem npm start prints the address once the server is up.
call npm start || goto :failed
exit /b 0

:failed
echo.
pause
exit /b 1
