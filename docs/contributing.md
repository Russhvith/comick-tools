# Contributing

## Comments

Write them the way a senior dev on the team would.

- Explain why, not what. If the code already says it, skip the comment.
- First person plural or plain imperative. "We retry here because the API drops the first request after a cold start." Not "I added a retry".
- No HTML tags in comments.
- No em-dashes. Use a comma, a period, or parentheses.
- Keep it short and plain. No filler like "This function is responsible for".

Good:

```python
# ComicK rate limits at roughly 60 req/min, so stay under it with headroom.
time.sleep(1.2)
```

Bad:

```python
# I added this sleep. It waits 1.2 seconds before the next request.
time.sleep(1.2)
```

## License header

Every source file (`.py`, `.ts`, `.tsx`, `.js`, `.mjs`, `.css`) starts with these two lines, in that language's comment style, then a blank line:

```python
# SPDX-License-Identifier: GPL-3.0-only
# Copyright (C) 2026 Russhvith
```

`//` for TypeScript and JavaScript, `/* ... */` for CSS. It goes above `"use client"` and above a module docstring, both of which still work after a comment. JSON, Markdown, SVG and the generated `ui/next-env.d.ts` don't get one.

## Legal documents

`legal/terms.txt` and `legal/privacy.txt` are the source for the Terms of Service and Privacy Policy pages in the web interface, and the scripts point people at them when run from a terminal. Keep them plain ASCII, wrapped at 76 characters, in this shape: a title block, `Release date:` and `Effective date:` lines, then `N. Title` headings with paragraphs, `- ` lists and four-space indented drawings.

When a tool starts connecting to a new service or storing something new, update section 5 or 4 of the privacy policy and its dates in the same change. Every claim in it has to match the code.

## Commits

- Short subject line in imperative mood: `Add dry run flag to mass deleter`.
- Body, when needed, follows the same rules as comments: why over what, no "I", no em-dashes.
- No `Co-Authored-By` trailers for AI tools.

## Adding a new tool

1. Make a kebab-case folder under `tools/public/` if any account can use it, or `tools/admin/` if it needs admin rights, e.g. `tools/public/chapter-fixer/`.
2. Add a `README.md` (copy the layout from an existing tool) and a `requirements.txt`.
3. Add a `data/` folder with an empty `.gitkeep`. Input and output files default to that folder and stay out of git.
4. Load config from the root `.env` and talk to ComicK through `lib/comick_tools` (`env.comick_settings()`, `api.connect()`), which already handles the cookie and rate limits. See [setup.md](setup.md).
5. Any new env var goes into `.env.example` with a one line comment.
6. Add a row to the tools table in the root `README.md`.
7. Add `--accept-terms` to the script's arguments and call `require_terms(args.accept_terms)` from `comick_tools.terms` right after `out.header(...)`, so nobody uses the tool before accepting the Terms of Service.
8. Add a `tool.json` so the web UI lists it. Copy one from an existing tool. Its `name` is in Title Case, like "Crunchyroll Importer". Each script declares its flags as `bool`, `text` or `select` fields, and the UI builds the form from them. Only declared scripts and flags can be run from the UI, and only listed `files` can be edited.

Mark scripts that talk to ComicK with `"needsCookie": true`, so the UI warns when `.env` has no cookie.

A tool that runs in order can add `steps`, and the UI shows them as a numbered flow instead of tabs:

```json
"steps": [
  { "id": "input", "title": "Paste the response", "file": "data/input.json", "view": "crunchyroll-input" },
  { "id": "format", "title": "Format", "script": "format", "needs": "input", "produces": "review" },
  { "id": "review", "title": "Check the types", "file": "data/output.txt", "view": "episode-list" }
]
```

- A step is either a `file` shown through a `view`, or a `script`. Views live in `ui/features/steps/views/` and are listed in its `index.ts`.
- `needs` locks a script until that step is ready. Until then the step only says it is waiting for that one.
- `produces` names the file step a script writes. The UI marks the script up to date when that output is newer than its input, and asks before replacing hand edits the file step reports.

Every prompt a script has should also have a flag, and a flag that's passed should skip its prompt. The UI relies on that: filled in fields become flags, empty ones are left for the script to ask.

## Releasing a version

The UI compares the root `VERSION` file with the latest GitHub release and offers an update when the release is newer.

1. Bump `VERSION` (`0.1.0` to `0.2.0`, say), run `python legal/packages.py --write` so `legal/packages.txt` matches the dependencies, and commit both.
2. Tag the commit `v` plus the version and push both:

   ```bash
   git tag v0.2.0
   git push origin main --tags
   ```

3. Publish a GitHub release for the tag, with notes on what changed:

   ```bash
   gh release create v0.2.0 --title "v0.2.0" --notes "..."
   ```

Drafts and prereleases don't count as the latest release, so they don't trigger the update prompt.
