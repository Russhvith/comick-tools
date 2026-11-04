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

Each tool keeps its own `requirements.txt`. Install the one you need:

```bash
pip install -r tools/admin/mass-deleter/requirements.txt
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
| `COMICK_API_BASE` | no | ComicK API origin. Defaults to `https://api.comick.dev`, only change it for testing. |

`.env` is gitignored. Only `.env.example` gets committed, so any new variable goes in there too, empty, with a short comment.

## Loading it from a tool

Tools sit three levels below the root (`tools/<admin|public>/<tool>/`), so point `python-dotenv` at the repo root instead of relying on the working directory:

```python
from pathlib import Path
from dotenv import load_dotenv

# Root .env is shared across tools, so resolve it relative to this file.
load_dotenv(Path(__file__).resolve().parents[3] / ".env")
```
