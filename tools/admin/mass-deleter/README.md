# mass-deleter

Deletes chapters or anime episodes on ComicK in bulk.

**Deletes can't be undone.** Run with `--dry-run` first if there's any doubt about the selection.

Only for trusted users, moderators and admins. Any other account is turned away before anything else happens.

## Setup

Do the repo wide [setup](../../../docs/setup.md) first. Standard library only, so there's nothing to `pip install`.

## Config

Read from the root `.env`. Real environment variables win over the file.

| Variable | Default | Notes |
| --- | --- | --- |
| `COMICK_SESSION_TOKEN` | none, required | See [auth.md](../../../docs/auth.md). |
| `COMICK_UPLOADS_PER_SECOND` | `5` | Cap on requests per second to the ComicK API. |
| `COMICK_REQUESTS_PER_MINUTE` | `200` | Cap on requests per rolling minute. The API allows 200 per IP. |
| `COMICK_API_BASE` | `https://api.comick.dev` | Only worth changing for testing against a local server. |

## Usage

```bash
python tools/admin/mass-deleter/mass_delete.py
```

It asks for everything it needs:

```
  ✓ Signed in as russ  trusted

  ? Comic or anime slug: some-manga
  ? Delete chapters or episodes? [c/e] c
  ? Language code, or 'all' for every language: [en] en
  ✓ Found 174 chapters  1 to 130, languages: en
    › Alpha Scans  131 chapters
    › Beta Team    43 chapters
  ? Only from group (blank for any): Beta Team
  ? Which numbers? e.g. 1-10, 12.5 or all: 1-30

  About to permanently delete 10 chapters from some-manga
    Chapter  Vol  Lang  Group      hid
    Ch 3     -    en    Beta Team  en003b
    Ch 6     -    en    Beta Team  en006b
    ...

  ? Reason for deleting: Duplicate uploads, Alpha Scans already has these
    Reason sent: Duplicate uploads, Alpha Scans already has these. Mass deleted by ComicK MassDeleter. (https://github.com/Russhvith/comick-tools)

  ? This can't be undone. Type DELETE to delete 10 chapters: DELETE
  ✓ Ch 3     en  Beta Team  en003b  412 ms
  ✓ Ch 6     en  Beta Team  en006b  398 ms
  ...
```

Every answer can also come from a flag, which skips that prompt. The `DELETE` confirmation is always asked.

| Flag | Notes |
| --- | --- |
| `--slug` | comic or anime slug |
| `--type` | `chapter` or `episode` |
| `--lang` | chapter language code, or `all`. Ignored for episodes |
| `--group` | only chapters from this scanlation group, matched case insensitively |
| `--select` | numbers and ranges like `1-10, 12.5 15`, or `all` |
| `--reason` | why they're being deleted |
| `--dry-run` | go through everything, including the permission checks, but send no deletes |

### What a run does

1. **Checks the cookie.** No `COMICK_SESSION_TOKEN` in `.env` and it stops.
2. **Checks the account** with `GET /v2.0/sessions/whoami`. It needs `active: true`, `state: "active"`, and a role of `trusted`, `moderator` or `admin`. Anything else stops the run there.
3. **Lists the chapters or episodes.** Looks up the comic's hid from the slug (`?media_type=anime` for episodes), then pages through `/v1.0/comic/{hid}/chapters`, 100 at a time, filtered by language for chapters or `entry_type=episode` for episodes.
4. **Narrows it down** by group (chapters only) and by number. Ranges include decimals, so `12-13` also picks `12.5`. Chapters without a number only get picked by `all`.
5. **Checks permission for each one** with `GET /{chapter|episode}/{hid}/manage_permissions`. Anything without `can_delete: true` is listed and left out.
6. **Shows the full list** (number, volume or type, language or air date, group or title, hid) and asks for a reason. The reason has `Mass deleted by ComicK MassDeleter. (https://github.com/Russhvith/comick-tools)` added to the end, and the whole thing has to fit in 500 characters.
7. **Waits for `DELETE`** typed exactly. Anything else cancels.
8. **Deletes** with `DELETE /{chapter|episode}/{hid}`, printing a line per item as it finishes.

### When things go wrong

- **404** on a delete means it's already gone. It's listed separately and doesn't count as a failure.
- **403** or any other error is shown against that item and the run carries on with the rest. Nothing gets retried blindly.
- **401** partway through stops the run, since every later request would fail too.
- **429** waits for `Retry-After` (or the `x-ratelimit-reset` window) and retries once. A limit message from ComicK stops the run and lists what wasn't sent.
- **Cloudflare** sometimes answers with an HTML challenge page instead of JSON. That's reported as such rather than as a confusing parse error.

Exit code is 1 if anything failed or wasn't sent, 0 otherwise.
