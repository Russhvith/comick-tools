# run

Launchers that check everything ComicK Tools needs is installed, say where to get whatever isn't, and then start it. Pick the folder for your system and double click `start` (or run it from a terminal). `check` only does the checks.

| System | Start | Check only | What it starts |
| --- | --- | --- | --- |
| Windows 11 | `windows\start.bat` | `windows\check.bat` | the web UI |
| Windows 10 | `windows\win10\start.bat` | `windows\win10\check.bat` | the web UI |
| Windows 7 | `windows\win7\start.bat` | `windows\win7\check.bat` | a menu of the command line tools |
| macOS | `macos/start.command` | `macos/check.command` | the web UI |
| Linux | `linux/start.sh` | `linux/check.sh` | the web UI |

## What gets checked

| | Needed | For | Where to get it |
| --- | --- | --- | --- |
| Python | 3.8 or newer | every tool | [python.org](https://www.python.org/downloads/) |
| Node.js | 20.9 or newer | the web UI | [nodejs.org](https://nodejs.org/en/download) |
| npm | comes with Node | the web UI | [nodejs.org](https://nodejs.org/en/download) |
| git | any, optional | in-app updates, the homepage's activity | [git-scm.com](https://git-scm.com/downloads) |

Anything missing is listed with its download link, and nothing starts until the required ones are there. The check script exits with 1 in that case, so it works in other scripts too.

## How the Windows versions differ

- **Windows 11** is the default and the one the others build on.
- **Windows 10** runs the same checks and starts the same UI, in plain text, since consoles on older Windows 10 builds print colour codes as junk.
- **Windows 7** can't run the web UI, because Node 20.9 doesn't install there. It checks only Python and git, links to the last versions that still install on Windows 7 (Python 3.8.10, Git 2.46.2), and opens a menu of every tool's scripts instead. The scripts ask for anything they need in the same window.

## Notes

- The first start installs the web UI's packages with `npm install`. After that, in-app updates install their own.
- On Windows, if Python is only reachable through the `py` launcher, the UI is pointed at the Python the check found. On macOS and Linux it's pointed at whichever of `python3` or `python` passed.
- macOS may need `chmod +x run/macos/*.command` once if the files lost their executable bit, for example when copied from a zip.
