# crunchyroll-importer

Pulls a Crunchyroll list into ComicK.

## Setup

Do the repo wide [setup](../../docs/setup.md) first, then:

```bash
pip install -r tools/crunchyroll-importer/requirements.txt
```

## Config

Read from the root `.env`:

| Variable | Notes |
| --- | --- |
| `COMICK_SESSION_TOKEN` | See [auth.md](../../docs/auth.md). |

Anything Crunchyroll specific gets added here and to `.env.example` once the tool needs it.

## Usage

### format_episodes.py

Turns a Crunchyroll episode list into a readable text file. Standard library only, no `.env` needed.

1. Open the season on Crunchyroll with DevTools on the **Network** tab.
2. Find the request to `.../seasons/<season_id>/episodes` and copy the response.
3. Paste it into `tools/crunchyroll-importer/data/input.json`.
4. Run:

   ```bash
   python tools/crunchyroll-importer/format_episodes.py
   ```

Output lands in `tools/crunchyroll-importer/data/output.txt`:

```
Episode 1:
English Title: Demons and Strategies
Duration: 24:30
Aired: 2024-04-05
Description: Rimuru has returned to Jura after having attended Walpurgis...
Preview: https://www.crunchyroll.com/imgsrv/display/thumbnail/1920x1080/...
```

Flags:

| Flag | Default |
| --- | --- |
| `-i`, `--input` | `data/input.json` |
| `-o`, `--output` | `data/output.txt` |
| `--keep-numbers` | off, so episodes get renumbered |

Every episode needs `episode`, `title`, `duration_ms`, `episode_air_date`, `description` and at least one thumbnail. If any are missing the script prints which episodes and fields, exits with code 1, and writes nothing:

```
  ✗ Fields missing, aborted
    › Episode 48.5  images.thumbnail
    › Episode 49    description
```

Terminal colour turns off when output is piped or `NO_COLOR` is set. A 5000 episode file runs in roughly 40 ms.

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

## Notes

- Episode numbers come from the `episode` string, so recaps like `48.5` keep their decimal. `episode_number` drops it.
- `Aired` is the date part of `episode_air_date`. Crunchyroll always sends midnight UTC there, so the time is dropped.
- Crunchyroll returns the title in one language only, whichever the account locale is set to. With a non English locale the `English Title` line is left blank and the title shows up under that language instead, e.g. `Japanese Title:`. Switch the account to English to get English titles.
- Preview is the widest thumbnail available, normally 1920x1080.
- Everything in `data/` is gitignored apart from `.gitkeep`.
