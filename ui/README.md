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

## Pages

- `/` is the homepage: what the tools are, who made them, some numbers, a year of commits as a calendar, the last 30 days as a chart and a changelog grouped by release tag. All of it comes from the local git clone, so it works while the repo is private.
- `/tools/<group>/<tool>`, like `/tools/public/crunchyroll-importer`, is a tool. `/tools` opens the first one. Switching tools changes the address without reloading, so a running console keeps going and the back button works.
- `/403` is a forbidden page, there for when something needs it.
- Any other address goes to the homepage. Unknown `/api/...` paths answer with a JSON 404 instead.

## What's on a tool page

The look follows comick.dev: same dark palette, Inter, Lucide icons, the sticky top bar and left sidebar.

- **Sidebar** with every tool, grouped into public and admin. Admin tools are marked in red.
- **A form per script**, built from the tool's `tool.json`. Filled fields become flags. Empty ones are asked in the console.
- **Steps** for tools that run in order. The Crunchyroll Importer shows four:
  1. Paste the response. Once it's valid the step shows the series, season and episode count instead of the JSON.
  2. Format. Locked until step 1 is valid. If any episode in the formatted file is tagged recap or filler, it asks before replacing them.
  3. Check the episode types. One row per episode with a Main / Recap / Filler switch. A change rewrites only that episode's header line and saves straight away, with undo.
  4. Upload. Locked until there are formatted episodes.
- **Data files** of a tool without steps open in an editor next to the form. Steps that show a file also have a raw text option.
- **Console** running the script. Click in it and type to answer a prompt, press Enter to send. `Ctrl + C` or the Stop button ends the run.
- **Recent runs** on the right. Clicking one replays its output, including the answers typed into it. The last 100 are kept in `.state/runs/` at the repo root (gitignored, or wherever `COMICK_TOOLS_STATE_DIR` points), one small `.json` per run plus a `.log` of its output, so they survive restarts. A run that was going when the server stopped shows as stopped.
- **Command menu** on `Ctrl K` (`⌘ K` on a Mac) to jump to any tool, file or recent run, stop the current run, or check for updates.

| Shortcut | Does |
| --- | --- |
| `Ctrl K` | Open the command menu |
| `Ctrl Enter` | Run the form on screen |
| `Ctrl S` | Save the open data file |
| `Ctrl C` in the console | Stop the run |

Saving a data file shows an undo toast for a few seconds. Starting a run sends an idempotency key, so a double click or a retried request can't start the same script twice.

## Code layout

```
ui/
  app/            routes: the page and the API
  features/       one folder per feature, each with its own components and hooks
    tools/        tool header and the script form
    steps/        the step flow and the views it shows for data files
    runs/         console, terminal, recent runs, run API calls
    files/        data file editor
    updates/      version check, update and restart
    command/      what the command menu lists
    workbench/    puts the features together into the page
  components/     shared UI, in atomic design layers
    atoms/        Button, TextInput, Kbd, Spinner, Skeleton...
    molecules/    Field, Card, Banner, NavItem, SegmentedControl
    organisms/    TopBar, Sidebar, CommandPalette, Toaster
    templates/    AppShell, the page frame
  config/         site details, tool icons, shortcuts
  hooks/          shared hooks (data fetching, hotkeys, view transitions)
  lib/            small helpers, and lib/server for code only the API runs
  types/          types shared by the API and the page
```

Rules of thumb:

- Anything that knows about tools, runs, files or updates lives in its feature folder. `components/` stays generic and never imports from `features/`.
- A component only uses layers below it: atoms use nothing, molecules use atoms, organisms use both, templates arrange organisms.
- Code under `lib/server` touches the filesystem and spawns processes. Only API routes and the server rendered page import it, never a client component.
- Colours, radii and fonts are tokens in `app/globals.css`. Use the variables, not raw values.

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
- Every API route refuses requests whose `Host` isn't localhost (stops DNS rebinding) and writes whose `Origin` is another site (stops a page in the same browser posting to it). `proxy.ts` runs the same check in front of every page too.
- Only scripts and flags listed in a `tool.json` can run. Values go to the script as single `--flag=value` arguments, never through a shell.
- Only files a `tool.json` lists can be opened or saved, and only inside that tool's folder.
