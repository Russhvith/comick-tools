# ui

A local web page for running the tools. Pick a tool from the menu, fill in what you know, and the script runs with its output in a console on the page. Anything left blank gets asked in the console, the same as on the command line.

It runs on your own machine only and isn't meant to be put on a server.

## Requirements

- Node 20.9 or newer.
- Python on the `PATH` as `python` (Windows) or `python3` (everything else). Set `COMICK_TOOLS_PYTHON` to use something else.

**Not for Windows 7.** Current Node doesn't install there. The tools themselves still run on Windows 7 from the command line, see the root README.

## Running it

```bash
cd ui
npm install
npm start
```

Then open http://127.0.0.1:4321. The first `npm start` builds the app, which takes a few seconds.

`npm start` runs the production server under `scripts/serve.mjs`, which is what lets the in-app update restart it. `npm run dev` is the hot reloading dev server for working on the UI itself.

| Variable | Default | Notes |
| --- | --- | --- |
| `COMICK_TOOLS_PORT` | `4321` | Port for `npm start` |
| `COMICK_TOOLS_PYTHON` | `python` / `python3` | Python used to run the scripts |
| `COMICK_TOOLS_REPO` | `Russhvith/comick-tools` | GitHub repo the update check looks at |

Everything else (session cookie, rate limits) comes from the root `.env`, same as the scripts.

## What's on the page

- **Menu** with every tool, grouped into public and admin. Admin tools are shown in pink.
- **A form per script**, built from the tool's `tool.json`. Filled fields become flags. Empty ones are asked in the console.
- **Data files** a tool declares, like the importer's `input.json` and `output.txt`, open in an editor next to the form. Paste the Crunchyroll response straight in, or fix episode types after formatting, then save.
- **Console** running the script. Click in it and type to answer a prompt, press Enter to send. `Ctrl + C` or the Stop button ends the run.
- **Recent runs** in the menu. Clicking one replays its output, including the answers typed into it.

## Updates

The menu shows the current version (from the root `VERSION` file) and checks the latest GitHub release. When a newer one is out, an **Update** button appears. Clicking it opens the update in the console:

1. Stops if there are local changes or a script is still running. Data files and `.env` don't count, they're gitignored.
2. `git fetch` and `git pull --ff-only` on the current branch. Nothing gets merged or overwritten.
3. `npm ci` if the UI's dependencies changed.
4. `npm run build`, then restarts the server on the new build. The page reloads by itself when it's back.

Under `npm run dev` there's no restart step. The dev server picks up the new code on its own.

## Security

The server can run scripts that delete things and run git, so:

- It listens on `127.0.0.1` only.
- Every API route refuses requests whose `Host` isn't localhost (stops DNS rebinding) and writes whose `Origin` is another site (stops a page in the same browser posting to it).
- Only scripts and flags listed in a `tool.json` can run. Values go to the script as single `--flag=value` arguments, never through a shell.
- Only files a `tool.json` lists can be opened or saved, and only inside that tool's folder.
