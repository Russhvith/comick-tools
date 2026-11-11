# AGENTS.md

Instructions for AI coding agents working in this repository (Claude Code, Cursor, Codex, Copilot and the like). People should start with [README.md](README.md) and [docs/contributing.md](docs/contributing.md) instead.

## The project

Monorepo of Python tools for ComicK users (not just staff), plus a local web UI that runs them.

- Each tool lives in its own folder under `tools/public/` (any account can use it) or `tools/admin/` (needs trusted, moderator or admin). Today that is `tools/public/crunchyroll-importer/` and `tools/admin/mass-deleter/`.
- Code more than one tool needs (console output, .env loading, the rate limited ComicK API client, the Terms prompt) lives in `lib/comick_tools/`. Scripts put `lib/` on `sys.path` themselves since they're run directly.
- `run/` has launchers per OS that check dependencies and start the UI (Windows 11 default, `win10/`, `win7/`, `macos/`, `linux/`).
- Repo wide guides are in `docs/`. How it fits together: [docs/architecture.md](docs/architecture.md). How it looks: [docs/design.md](docs/design.md).

## Web UI

- `ui/` is a Next.js app (Node 20.9+, TypeScript) that runs the tools in a browser console. It lists tools from each tool's `tool.json`.
- Layout: feature folders under `ui/features/` for app logic, atomic design (`atoms`, `molecules`, `organisms`, `templates`) under `ui/components/` for shared UI. `components/` never imports from `features/`. Server only code goes in `ui/lib/server/`. Details in `ui/README.md`.
- Visual design copies comick.dev: tokens in `ui/app/globals.css`, Inter, Lucide icons. Monospace only for the console, key hints and file paths. Sizes in rem so the UI scales on large screens. Check phone (320px) to 4K when changing layout.
- The UI is optional and every tool must keep working from the command line.
- Every script prompt needs a matching flag that skips it, since the UI turns filled fields into flags.
- The server listens on this computer only. `ui/scripts/server.mjs` runs Next inside its own HTTP server so `ui/scripts/gate.mjs` checks every request and WebSocket upgrade first, dev endpoints included: the socket's peer address, Host, and Sec-Fetch-Site (no cross-site requests to `/api`, `/_next` or `/__nextjs`). Routes and pages also run the Host and Origin check in `ui/lib/server/guard.ts` (pages through `ui/proxy.ts`), and pages refuse to be framed (`ui/next.config.mjs`). Keep all of it. Never go back to plain `next start` or `next dev`. The one exception is `COMICK_TOOLS_NETWORK=true`, which the user turns on themselves: then it listens on every interface and both checks also accept other devices and this machine's own names and addresses, never arbitrary hosts.
- Never start a second server on port 4321 or run `next build` in `ui/` while the user's server is running: they share `ui/.next`.

## Compatibility

- Tools must run on Windows 7, which caps Python at 3.8. Nothing newer than 3.8 in syntax or stdlib (no `match`, no `str.removeprefix`, no `datetime.fromisoformat` on strings ending in Z, no `list[str]` style hints evaluated at runtime).
- Win 7 and 8 consoles have no ANSI colour and no glyphs for symbols like the tick, so terminal styling falls back to plain ASCII there. Use `comick_tools.console`.
- Check with `vermin -t=3.8- --violations <file>` before committing.
- Batch files are CRLF and shell launchers LF, pinned in `.gitattributes`.

## Config

- One shared `.env` at the repo root. Tools load it by path relative to their own file, not the working directory.
- `.env` is gitignored. `.env.example` is tracked and must list every variable, empty, with a short comment.
- Write to `.env` only through `set_env_values` (Python) or `writeEnv` (UI). They keep the rest of the file untouched. `COMICK_TOOLS_ENV_FILE` points both at a scratch file for tests.
- A new or changed `.env` variable also goes on the Settings page (`ui/features/settings/`, `ui/lib/server/settings.ts`, `ui/types/settings.ts`, `/api/settings`), in `docs/setup.md`, and in the legal docs when it changes what's stored or sent.
- Auth is the `__Secure-comick-auth.session_token` cookie, stored as `COMICK_SESSION_TOKEN`. Send it as a cookie, never log it, never send it to the browser. Details in `docs/auth.md`.

## License and legal

- GPL-3.0-only, full text in `LICENSE`.
- Every tool calls `require_terms(args.accept_terms)` from `lib/comick_tools/terms.py` right after its header, and declares `--accept-terms`. Nothing may reach ComicK before `COMICK_AGREED_TO_TERMS=true`: the UI server checks `termsAccepted()` before runs and account checks.
- Terms and privacy policy live in `legal/terms.txt` and `legal/privacy.txt`, shown in the UI under Legal. ASCII only, wrapped at 76 columns, `N. Title` headings. Any new network call or stored data means updating the privacy policy and its dates in the same change. `python legal/packages.py --write` refreshes `legal/packages.txt` after dependency changes.
- Every new `.py`, `.ts`, `.tsx`, `.js`, `.mjs` and `.css` file starts with `SPDX-License-Identifier: GPL-3.0-only` and `Copyright (C) 2026 Russhvith` as two comment lines, then a blank line. Not JSON, Markdown, SVG or `ui/next-env.d.ts`.

## Writing style

Applies to code comments, docs, commit messages and PR text.

- Write like a senior developer. It should not read as AI generated.
- First person, but no "I" or "me". Use "we" or plain imperative: "Retry once since the first call after a cold start tends to fail."
- Comments explain why, not what.
- No HTML tags used as comments.
- No em-dashes anywhere. Use commas, periods, or parentheses.
- Skip filler phrasing ("This function is responsible for", "It's worth noting").
- User facing docs (README, guides, issue forms) stay readable for people who don't code.

## Commits

- Imperative subject line, short.
- Body follows the writing style above.
- Never add a `Co-Authored-By` trailer for any AI tool.
- Never push, tag or publish a release unless asked.

## Keeping things in step

- A user visible change gets a line under `[Unreleased]` in `CHANGELOG.md`.
- Releases: add the version to `CHANGELOG.md`, bump `VERSION`, refresh `legal/packages.txt`, tag `vX.Y.Z`, publish a GitHub release. The UI's update check reads the latest release.
- A new tool follows `docs/contributing.md`: kebab-case folder under `tools/public/` or `tools/admin/`, `README.md`, `requirements.txt`, `tool.json`, a `data/` folder (with `.gitkeep`) that input and output files default to, new env vars into `.env.example` and Settings, row in the root README tools table.
