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
Episode 49:
English Title: Demons and Strategies
Duration: 24:30
Description: Rimuru has returned to Jura after having attended Walpurgis...
Preview: https://www.crunchyroll.com/imgsrv/display/thumbnail/1920x1080/...
```

Flags:

| Flag | Default |
| --- | --- |
| `-i`, `--input` | `data/input.json` |
| `-o`, `--output` | `data/output.txt` |

Every episode needs `episode`, `title`, `duration_ms`, `description` and at least one thumbnail. If any are missing the script prints which episodes and fields, exits with code 1, and writes nothing.

## Notes

- Episode numbers come from the `episode` string, so recaps like `48.5` keep their decimal. `episode_number` drops it.
- Crunchyroll returns the title in one language only, whichever the account locale is set to. With a non English locale the `English Title` line is left blank and the title shows up under that language instead, e.g. `Japanese Title:`. Switch the account to English to get English titles.
- Preview is the widest thumbnail available, normally 1920x1080.
- Everything in `data/` is gitignored apart from `.gitkeep`.
