# comick-tools

Tools for ComicK users, from anyone uploading episodes to moderators cleaning up. One repo, one folder per tool, one shared `.env`.

## Tools

Tools are split by who can run them:

- `tools/public/` works with any ComicK account.
- `tools/admin/` needs a trusted, moderator or admin account, and can do real damage if misused.

| Tool | Group | What it does |
| --- | --- | --- |
| [crunchyroll-importer](tools/public/crunchyroll-importer/README.md) | public | Pulls a Crunchyroll list into ComicK. |
| [mass-deleter](tools/admin/mass-deleter/README.md) | admin | Bulk deletes chapters or anime episodes on ComicK. |

## Quick start

```bash
git clone https://github.com/Russhvith/comick-tools.git
cd comick-tools
python -m venv .venv
cp .env.example .env
```

Then fill in `.env` and either run the tools from the command line (each tool's README has the commands) or start the web UI:

```bash
cd ui
npm install
npm start
```

It opens on http://127.0.0.1:4321 with every tool in a menu, a form for its options and a console showing the script as it runs. It also checks GitHub for new releases and can update and restart itself. Details in [ui/README.md](ui/README.md).

The web UI needs Node 20.9 or newer, which doesn't install on Windows 7. The tools themselves still run on Windows 7 from the command line.

## Guides

- [Setup](docs/setup.md): Python, venv, and the shared `.env`.
- [Auth](docs/auth.md): grabbing the session cookie the tools log in with.
- [Contributing](docs/contributing.md): comment style, commit style, adding a new tool, releasing a version.
- [Web UI](ui/README.md): running it, updates, and how it stays local.

## Layout

```
comick-tools/
  .env.example          shared config template, copy to .env
  VERSION               current version, compared against GitHub releases
  docs/                 repo wide guides
  lib/comick_tools/     code shared by the tools (console, .env, API client)
  tools/
    admin/              needs admin rights
      mass-deleter/
    public/             any account
      crunchyroll-importer/
  ui/                   Next.js web UI for running the tools
```
