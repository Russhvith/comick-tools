# comick-tools

Staff tools for ComicK. One repo, one folder per tool, one shared `.env`.

## Tools

Tools are split by who can run them:

- `tools/public/` works with any ComicK account.
- `tools/admin/` needs a staff account with admin rights, and can do real damage if misused.

| Tool | Group | What it does |
| --- | --- | --- |
| [crunchyroll-importer](tools/public/crunchyroll-importer/README.md) | public | Pulls a Crunchyroll list into ComicK. |
| [mass-deleter](tools/admin/mass-deleter/README.md) | admin | Bulk deletes entries on ComicK. |

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
    admin/              needs admin rights
      mass-deleter/
    public/             any account
      crunchyroll-importer/
```
