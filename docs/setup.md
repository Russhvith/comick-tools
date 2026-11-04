# Setup

## Requirements

- Python 3.11 or newer
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
pip install -r tools/mass-deleter/requirements.txt
```

## The shared .env

All tools read the same `.env` in the repo root, so the token only has to be set once.

```bash
cp .env.example .env
```

| Variable | Required | Notes |
| --- | --- | --- |
| `COMICK_SESSION_TOKEN` | yes | Session cookie value. See [auth.md](auth.md). |

`.env` is gitignored. Only `.env.example` gets committed, so any new variable goes in there too, empty, with a short comment.

## Loading it from a tool

Tools sit two levels below the root (`tools/<tool>/`), so point `python-dotenv` at the repo root instead of relying on the working directory:

```python
from pathlib import Path
from dotenv import load_dotenv

# Root .env is shared across tools, so resolve it relative to this file.
load_dotenv(Path(__file__).resolve().parents[2] / ".env")
```
