# Setup

## Requirements

- Python 3.8 or newer. 3.8 is the last release that installs on Windows 7, so every tool stays compatible with it.
- git

## Virtual environment

One venv at the repo root covers every tool.

Windows (PowerShell):

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
```

macOS / Linux:

```bash
python -m venv .venv
source .venv/bin/activate
```

Each tool keeps its own `requirements.txt`. The current ones only use the standard library, so there's nothing to install yet. When a tool does need packages:

```bash
pip install -r tools/<admin|public>/<tool>/requirements.txt
```

## The shared .env

All tools read the same `.env` in the repo root, so the token only has to be set once.

```bash
cp .env.example .env
```

| Variable | Required | Notes |
| --- | --- | --- |
| `COMICK_SESSION_TOKEN` | yes | Session cookie value. See [auth.md](auth.md). |
| `COMICK_UPLOADS_PER_SECOND` | no | Cap on ComicK API requests per second. Defaults to 5. |
| `COMICK_REQUESTS_PER_MINUTE` | no | Cap on ComicK API requests per rolling minute. Defaults to 200, the API's per IP limit. |
| `COMICK_API_BASE` | no | ComicK API origin. Defaults to `https://api.comick.dev`, only change it for testing. |

`.env` is gitignored. Only `.env.example` gets committed, so any new variable goes in there too, empty, with a short comment.

## Loading it from a tool

Tools don't read `.env` themselves. `lib/comick_tools` does it, finds the file from its own location so the working directory doesn't matter, and hands back everything needed to talk to ComicK:

```python
import sys
from pathlib import Path

# Scripts run straight from their folder, so put the shared lib on the path.
sys.path.insert(0, str(Path(__file__).resolve().parents[3] / "lib"))

from comick_tools.api import connect
from comick_tools.env import comick_settings

api = connect(comick_settings(), "comick-tools/my-tool")
me = api.request("GET", "/me")
```

`connect` gives back a client that adds the cookie, keeps to both rate limits and retries a 429 once.
