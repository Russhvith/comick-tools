# CLAUDE.md

Monorepo of Python staff tools for ComicK. Each tool lives in its own folder under `tools/` (`tools/crunchyroll-importer/`, `tools/mass-deleter/`). Repo wide guides are in `docs/`.

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

Follow `docs/contributing.md`: kebab-case folder under `tools/`, `README.md`, `requirements.txt`, new env vars into `.env.example`, row in the root README tools table.
