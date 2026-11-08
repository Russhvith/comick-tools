# CLAUDE.md

Monorepo of Python staff tools for ComicK. Each tool lives in its own folder under `tools/public/` (any account can use it) or `tools/admin/` (needs admin rights). Today that is `tools/public/crunchyroll-importer/` and `tools/admin/mass-deleter/`. Repo wide guides are in `docs/`. Code more than one tool needs (console output, .env loading, the rate limited ComicK API client) lives in `lib/comick_tools/`, and scripts put `lib/` on `sys.path` themselves since they're run directly.

## Web UI

- `ui/` is a Next.js app (Node 20.9+, TypeScript) that runs the tools in a browser console. It lists tools from each tool's `tool.json`.
- Layout: feature folders under `ui/features/` for app logic, atomic design (`atoms`, `molecules`, `organisms`, `templates`) under `ui/components/` for shared UI. `components/` never imports from `features/`. Server only code goes in `ui/lib/server/`. Details in `ui/README.md`.
- Visual design copies comick.dev: tokens in `ui/app/globals.css`, Inter, Lucide icons. Monospace only for the console, key hints and file paths.
- The Windows 7 rule below covers the Python tools, not `ui/`. The UI is optional and every tool must keep working from the command line.
- Every script prompt needs a matching flag that skips it, since the UI turns filled fields into flags.
- The server listens on 127.0.0.1 only and checks Host and Origin on every route. Keep it that way.
- Releases: bump `VERSION`, tag `vX.Y.Z`, publish a GitHub release. The UI's update check reads the latest release.

## Compatibility

- Tools must run on Windows 7, which caps Python at 3.8. Nothing newer than 3.8 in syntax or stdlib (no `match`, no `str.removeprefix`, no `datetime.fromisoformat` on strings ending in Z, no `list[str]` style hints evaluated at runtime).
- Win 7 and 8 consoles have no ANSI colour and no glyphs for symbols like the tick, so terminal styling falls back to plain ASCII there.
- Check with `vermin -t=3.8- --violations <file>` before committing.

## Config

- One shared `.env` at the repo root. Tools load it by path relative to their own file, not the working directory.
- `.env` is gitignored. `.env.example` is tracked and must list every variable, empty, with a short comment.
- Auth is the `__Secure-comick-auth.session_token` cookie, stored as `COMICK_SESSION_TOKEN`. Send it as a cookie, never log it. Details in `docs/auth.md`.

## Writing style (applies to code comments, docs, commit messages, PR text)

- Write like a senior developer. It should not read as AI generated.
- First person, but no "I" or "me". Use "we" or plain imperative: "Retry once since the first call after a cold start tends to fail."
- Comments explain why, not what.
- No HTML tags used as comments.
- No em-dashes anywhere. Use commas, periods, or parentheses.
- Skip filler phrasing ("This function is responsible for", "It's worth noting").

## Commits

- Imperative subject line, short.
- Body follows the writing style above.
- Never add a `Co-Authored-By` trailer for Claude or any AI tool.
- Commit automatically at the end of each turn that changes files (standing permission from the repo owner).

## Adding a tool

Follow `docs/contributing.md`: kebab-case folder under `tools/public/` or `tools/admin/`, `README.md`, `requirements.txt`, `tool.json`, a `data/` folder (with `.gitkeep`) that input and output files default to, new env vars into `.env.example`, row in the root README tools table.
