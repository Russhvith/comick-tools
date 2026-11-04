# comick-tools

Staff tools for ComicK. One repo, one folder per tool, one shared `.env`.

## Tools

| Folder | What it does |
| --- | --- |
| [crunchyroll-importer](tools/crunchyroll-importer/README.md) | Pulls a Crunchyroll list into ComicK. |
| [mass-deleter](tools/mass-deleter/README.md) | Bulk deletes entries on ComicK. |

## Quick start

```bash
git clone <repo-url> comick-tools
cd comick-tools
python -m venv .venv
cp .env.example .env
```

Then fill in `.env` and follow the README of whichever tool you need.

## Guides

- [Setup](docs/setup.md): Python, venv, and the shared `.env`.
- [Auth](docs/auth.md): grabbing the session cookie the tools log in with.
- [Contributing](docs/contributing.md): comment style, commit style, adding a new tool.

## Layout

```
comick-tools/
  .env.example          shared config template, copy to .env
  docs/                 repo wide guides
  tools/
    crunchyroll-importer/
    mass-deleter/
```
