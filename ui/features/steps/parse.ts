export const EPISODE_TYPES = ["main", "recap", "filler"] as const;
export type EpisodeType = (typeof EPISODE_TYPES)[number];

export type InputSummary = {
  series: string;
  season: string | null;
  count: number;
  first: string;
  last: string;
};

export type InputParse =
  | { state: "empty" }
  | { state: "invalid"; message: string }
  | { state: "ok"; summary: InputSummary };

/** What the pasted Crunchyroll response holds, without showing all of it. */
export function parseCrunchyrollInput(text: string): InputParse {
  if (!text.trim()) return { state: "empty" };

  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch (error) {
    // The engine's message names the position, which is what someone who
    // pasted half a response needs to see.
    return { state: "invalid", message: `Not valid JSON. ${(error as Error).message}` };
  }

  const data = (body as { data?: unknown } | null)?.data;
  if (!Array.isArray(data) || data.length === 0) {
    return { state: "invalid", message: "Valid JSON, but there are no episodes under data. Copy the response of the season episodes request." };
  }

  const episodes = data as Array<Record<string, unknown>>;
  const missing = episodes.findIndex((e) => !e || typeof e !== "object" || e.episode === undefined);
  if (missing !== -1) {
    return { state: "invalid", message: `Entry ${missing + 1} of data has no episode number, so this isn't a season episodes response.` };
  }

  const first = episodes[0];
  const last = episodes[episodes.length - 1];
  return {
    state: "ok",
    summary: {
      series: String(first.series_title ?? "Unknown series"),
      season: first.season_title ? String(first.season_title) : null,
      count: episodes.length,
      first: String(first.episode),
      last: String(last.episode),
    },
  };
}

export type EpisodeRow = {
  /** Which header this is, counting from the top. Used to rewrite just that line. */
  index: number;
  number: string;
  /** Kept as written so a typo in the file shows up instead of vanishing. */
  type: string;
  title: string;
  aired: string | null;
};

// Same patterns as upload_episodes.py, so what we show is what it will read.
const HEADER = /^Episode\s+(\S+?):\s*(?:\(\s*(\w+)\s*\))?\s*$/;
const FIELD = /^([A-Za-z][A-Za-z ()]*?):(?:\s(.*))?$/;

export function parseEpisodes(text: string): EpisodeRow[] {
  const rows: EpisodeRow[] = [];
  let current: EpisodeRow | null = null;
  let hasEnglish = false;

  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    const header = HEADER.exec(line);
    if (header) {
      current = { index: rows.length, number: header[1], type: (header[2] ?? "main").toLowerCase(), title: "", aired: null };
      hasEnglish = false;
      rows.push(current);
      continue;
    }
    if (!current) continue;

    const field = FIELD.exec(line);
    if (!field) continue;
    const key = field[1].trim();
    const value = (field[2] ?? "").trim();
    if (key.toLowerCase() === "aired") current.aired = value || null;
    else if (/ title$/i.test(key) && value) {
      // English wins, otherwise the first title the file has.
      const english = /^english title$/i.test(key);
      if (english || (!hasEnglish && !current.title)) current.title = value;
      if (english) hasEnglish = true;
    }
  }
  return rows;
}

/**
 * Change one episode's type by rewriting only its header line. Everything
 * else in the file, line endings included, stays exactly as it was.
 */
export function setEpisodeType(text: string, index: number, type: EpisodeType): string {
  let seen = -1;
  return text.replace(/^(Episode[ \t]+\S+?:)[ \t]*(?:\([ \t]*\w+[ \t]*\))?[ \t]*$/gm, (match, head: string) =>
    ++seen === index ? `${head} (${type})` : match,
  );
}

export function isEpisodeType(value: string): value is EpisodeType {
  return (EPISODE_TYPES as readonly string[]).includes(value);
}
