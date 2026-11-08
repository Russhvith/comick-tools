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
7. Add a `tool.json` so the web UI lists it. Copy one from an existing tool. Each script declares its flags as `bool`, `text` or `select` fields, and the UI builds the form from them. Only declared scripts and flags can be run from the UI, and only listed `files` can be edited.

Every prompt a script has should also have a flag, and a flag that's passed should skip its prompt. The UI relies on that: filled in fields become flags, empty ones are left for the script to ask.

## Releasing a version

The UI compares the root `VERSION` file with the latest GitHub release and offers an update when the release is newer.

1. Bump `VERSION` (`0.1.0` to `0.2.0`, say) and commit it.
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
