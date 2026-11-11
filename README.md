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

The easiest way is a launcher from [run/](run/README.md): it checks that Python, Node and git are installed in versions that work, links to whatever is missing, and starts the web UI (or, on Windows 7, a menu of the tools). Double click `run\windows\start.bat` on Windows 11, or the one for your system.

By hand:

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
  LICENSE               GNU GPL v3
  VERSION               current version, compared against GitHub releases
  docs/                 repo wide guides
  legal/                terms, privacy policy, open-source package list
  lib/comick_tools/     code shared by the tools (console, .env, API client)
  tools/
    admin/              needs admin rights
      mass-deleter/
    public/             any account
      crunchyroll-importer/
  ui/                   Next.js web UI for running the tools
  run/                  launchers that check dependencies and start it, per OS
```

## Legal

By using ComicK Tools you agree to the [Terms of Service](legal/terms.txt) and the [Privacy Policy](legal/privacy.txt). In short, everything runs on your computer, nothing is sent to us, and your ComicK cookie is only ever sent to ComicK's API. [legal/packages.txt](legal/packages.txt) lists the open-source packages the tools use. The web interface shows all three under Legal in the sidebar, with the package list always read live.

## License

Copyright (C) 2026 Russhvith

ComicK Tools is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License, version 3, as published by the Free Software Foundation. It comes with no warranty. The full text is in [LICENSE](LICENSE).

In short, anyone can use, change and share it, and anyone who shares a modified version has to share its source under the same license.
