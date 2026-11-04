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

1. Make a folder under `tools/` in kebab-case, e.g. `tools/chapter-fixer/`.
2. Add a `README.md` (copy the layout from an existing tool) and a `requirements.txt`.
3. Load config from the root `.env`, see [setup.md](setup.md).
4. Any new env var goes into `.env.example` with a one line comment.
5. Add a row to the tools table in the root `README.md`.
