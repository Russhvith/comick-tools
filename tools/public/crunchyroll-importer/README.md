# crunchyroll-importer

Pulls a Crunchyroll season into ComicK in two steps:

1. `format_episodes.py` turns Crunchyroll's episode list into `data/output.txt` plus preview images.
2. `upload_episodes.py` sends that file to an anime on ComicK.

Between the two, open `output.txt` and fix anything that needs a human, mostly the `(main)` / `(recap)` / `(filler)` tags.

## Setup

Do the repo wide [setup](../../../docs/setup.md) first. Both scripts only use the standard library, so there's nothing to `pip install`.

## Config

Read from the root `.env`. Real environment variables win over the file.

| Variable | Default | Notes |
| --- | --- | --- |
| `COMICK_SESSION_TOKEN` | none, required for uploads | See [auth.md](../../../docs/auth.md). |
| `COMICK_UPLOADS_PER_SECOND` | `5` | Cap on requests to the ComicK API. Decimals work, e.g. `0.5`. |
| `COMICK_API_BASE` | `https://api.comick.dev` | Only worth changing for testing against a local server. |

## Usage

### format_episodes.py

Turns a Crunchyroll episode list into a readable text file. Standard library only, no `.env` needed.

1. Get the season's episode list into `data/input.json`, see [Getting input.json](#getting-inputjson) below.
2. Run:

   ```bash
   python tools/public/crunchyroll-importer/format_episodes.py
   ```

#### Getting input.json

Crunchyroll's site loads each season's episodes from its own API, and that response is exactly what the formatter reads. Grab it from the browser:

1. Open the anime's page on Crunchyroll, logged in. If it has more than one season, pick the one you want from the season dropdown.
2. Open DevTools (`F12`) and go to the **Network** tab.
3. Paste this into the filter box at the top left of the Network tab:

   ```
   https://www.crunchyroll.com/content/v2/cms/seasons
   ```

4. Refresh the page (`F5`). One request shows up, named `episodes?preferred_audio_language=...`:

   ![Network tab filtered to the season episodes request](assets/network-tab.png)

5. Click it, then open the **Response** tab on the right.
6. Click anywhere inside the response text, press `Ctrl + A` to select all of it, then `Ctrl + C`.
7. Paste it into `tools/public/crunchyroll-importer/data/input.json` (create the file if it's not there) and save.

The file should start with `{"data":[` (or `{` followed by `"data": [` if DevTools pretty printed it). If it starts with anything else, the wrong request or the wrong tab got copied.

- More than one `episodes?...` row usually means the page loaded a second season too. The `Request URL` under **Headers** has the season id (`/seasons/GRVDN2M0R/episodes`), and the right one is whichever matches the season picked in step 1.
- Use **Response**, not **Preview**. Preview shows a collapsible tree and `Ctrl + A` there doesn't copy the JSON.
- The episode titles come back in the language the Crunchyroll account is set to, so keep it on English.

Output lands in `tools/public/crunchyroll-importer/data/output.txt`:

```
Episode 1: (main)
English Title: Demons and Strategies
Duration: 24:30
Aired: 2024-04-05
Description: Rimuru has returned to Jura after having attended Walpurgis...
Preview: images/1.png
Source: https://www.crunchyroll.com/watch/G14U411V1/demons-and-strategies
```

`Source` is the Crunchyroll watch page. The uploader sends it to reviewers when the anime is in request mode.

Flags:

| Flag | Default |
| --- | --- |
| `-i`, `--input` | `data/input.json` |
| `-o`, `--output` | `data/output.txt` |
| `--keep-numbers` | off, so episodes get renumbered |
| `--no-images` | off, so previews get downloaded |

Every episode needs `episode`, `title`, `duration_ms`, `episode_air_date`, `description` and at least one thumbnail. If any are missing the script prints which episodes and fields, exits with code 1, and writes nothing:

```
  ✗ Fields missing, aborted
    › Episode 48.5  images.thumbnail
    › Episode 49    description
```

Terminal colour turns off when output is piped or `NO_COLOR` is set. On Windows 7 and 8 the output is plain ASCII (`+`, `x`, `>`) since those consoles can't show colour or the symbols. Without the image download a 5000 episode file runs in roughly 40 ms.

### Images

Every run downloads the previews into `data/images/`, named after the episode number in the output, and `Preview` points at the local file:

```
Preview: images/1.png
```

```
data/
  input.json
  output.txt
  images/
    0.5.png
    1.png
    2.png
    ...
```

- Names follow the output numbering, so they match `Episode` lines with or without `--keep-numbers`.
- The extension comes from what the server actually sent, not the URL.
- Downloads run eight at a time. A full season of 1080p PNGs is about 30 MB and a few seconds.
- An image that fails (404, no connection) keeps its Crunchyroll URL in the output and gets listed as a warning. The rest of the run carries on.
- `--no-images` skips the download and leaves `Preview` as the Crunchyroll URL, which keeps the run under a second.

**Every run permanently deletes the previous images** in `data/images/`, `--no-images` runs included, so the folder never drifts out of sync with `output.txt`. They skip the recycle bin. Only image files are removed, anything else in the folder is left alone. A run that aborts on missing fields leaves the old images untouched.

### Renumbering

Crunchyroll often numbers later seasons straight on from the last one, so Slime season 3 starts at 49. By default the script restarts each dump at 1:

1. Find the lowest whole episode number in the file.
2. If it's 0 or 1 the season is already numbered per season, so nothing changes.
3. Otherwise subtract (lowest - 1) from every episode. Half episodes shift with the rest.

| Crunchyroll | Output | Why |
| --- | --- | --- |
| 48.5, 49, 50 ... 65, 65.5, 66 ... 72 | 0.5, 1, 2 ... 17, 17.5, 18 ... 24 | lowest whole is 49, shift by 48 |
| 0, 1, 2, 3 | 0, 1, 2, 3 | starts at 0, left alone |
| 1, 2, 3 | 1, 2, 3 | already starts at 1 |
| 13, 14, 14.5, 15 | 1, 2, 2.5, 3 | shift by 12 |
| SP, 25, 26 | SP, 1, 2 | non numeric labels pass through |

Pass `--keep-numbers` to skip all of this and print Crunchyroll's numbers as is.

### upload_episodes.py

Sends `data/output.txt` to an anime on ComicK. The slug is required:

```bash
python tools/public/crunchyroll-importer/upload_episodes.py --slug that-time-i-got-reincarnated-as-a-slime
```

| Flag | Default |
| --- | --- |
| `--slug` | required, the anime's slug on ComicK |
| `-i`, `--input` | `data/output.txt` |
| `--dry-run` | off. Checks everything and shows what would go up, sends nothing |
| `-y`, `--yes` | off, so it asks before uploading |
| `--note` | empty. Extra moderator note, added after the importer credit |

What a run does, in order:

1. **Checks the cookie.** No `COMICK_SESSION_TOKEN` in `.env` and it stops straight away. The cookie goes on every ComicK API request, never on the image bucket.
2. **Validates output.txt** against the same rules as the site form: episode number 0 to 9999 with one decimal at most, type `main` / `recap` / `filler`, an English title, a real `yyyy-mm-dd` date, a duration between 1 second and 24 hours, no links in the description, titles under 255 characters, one title per language. Every problem is listed at once with its line number and nothing gets uploaded until they're fixed.
3. **Checks permission** for the slug. Direct mode adds episodes straight away. Request mode sends them to community review, where they stay private until they get 2 net votes. A rejected cookie or a slug the account can't edit stops the run.
4. **Reads the episodes ComicK already has.** Looks up the anime's `hid` from the slug (`/comic/{slug}/?media_type=anime`), then pages through `/v1.0/comic/{hid}/chapters?entry_type=episode`, 100 at a time, until it has them all. Any episode number that's already there gets skipped.
5. **Asks for confirmation**, then uploads: each preview goes through `/presign`, gets PUT to the bucket and is referenced through `tmp2.comick.pictures`, then the episode is submitted.

Each episode prints a line as soon as it finishes, in the order uploads complete:

```
  ✓ Episode 3     Peaceful Days                             main      1.5 MB  436 ms
  ✓ Episode 17.5  Digression: Luminus Memories              recap     1.3 MB  642 ms
  ✗ Episode 7     Episode synopsis is too similar to an existing one
```

The time on each line includes any wait for the rate limit, so one that sat out a 429 shows a few extra seconds.

At the end it lists anything that failed, anything not sent, and the episodes that already existed:

```
  Already on ComicK with the same date (1)
    › Episodes  0.5

  Already on ComicK but different (1), edit these on the website
    › Episode 1 aired  file: 2024-04-05   comick: 2024-04-06
    › Episode 1 type   file: main   comick: filler
    The uploader never overwrites existing episodes.
```

**Rate limits.** Requests are spaced to stay under `COMICK_UPLOADS_PER_SECOND`. The API also sends `x-ratelimit-remaining` and `x-ratelimit-reset`. When remaining hits zero everything pauses until the reset, and a 429 gets one retry once the reset window is over. If ComicK answers with a limit message (a daily request cap, say) the run stops, says so, and lists what wasn't sent so it can be picked up later. Rerunning is safe since anything that made it is now an existing episode.

**Moderator note.** Every review mode request carries `Auto Uploaded using ComicK Crunchyroll Importer. https://github.com/Russhvith/comick-tools` so moderators know where it came from. `--note` adds text after it, and the whole note has to stay under 2,000 characters. Direct adds don't send a note.

**Titles.** `English Title` is required. `Japanese Title` and a `Romaji Title` line (add it by hand) fill the `ja` and `ja-ro` boxes. Other languages the formatter writes, like `German Title`, go in as extra rows.

## Notes

- Episode numbers come from the `episode` string, so recaps like `48.5` keep their decimal. `episode_number` drops it.
- Every episode is tagged `(main)`. Crunchyroll has no field for filler or recaps, so swap the tag by hand where it's wrong, e.g. `(recap)` on the `.5` digressions.
- `Aired` is the date part of `episode_air_date`. Crunchyroll always sends midnight UTC there, so the time is dropped.
- Crunchyroll returns the title in one language only, whichever the account locale is set to. With a non English locale the `English Title` line is left blank and the title shows up under that language instead, e.g. `Japanese Title:`. Switch the account to English to get English titles.
- Preview is the widest thumbnail available, normally 1920x1080.
- Everything in `data/` is gitignored apart from `.gitkeep`.
- ComicK language codes for extra title rows (`es-la`, `pt-br`, `zh-hk` and so on) are also guessed from the main site's chapter languages. They live in `TITLE_LANGS` in the same file.
