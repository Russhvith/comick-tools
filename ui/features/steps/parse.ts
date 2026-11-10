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

/** Title languages upload_episodes.py knows, in the casing the formatter writes. */
export const TITLE_LANGUAGES = [
  "English",
  "Japanese",
  "Romaji",
  "German",
  "Spanish (Latin America)",
  "Spanish (Spain)",
  "French",
  "Italian",
  "Portuguese (Brazil)",
  "Russian",
  "Arabic",
  "Hindi",
  "Indonesian",
  "Malay",
  "Thai",
  "Vietnamese",
  "Chinese (Simplified)",
  "Chinese (Traditional)",
] as const;

export type EpisodeDetails = {
  number: string;
  type: string;
  titles: { language: string; value: string }[];
  duration: string;
  aired: string;
  description: string;
  preview: string;
  source: string;
  /** Fields we don't edit, carried through so a save never drops them. */
  extra: { key: string; value: string }[];
};

const KNOWN = ["duration", "aired", "description", "preview", "source"] as const;
type Known = (typeof KNOWN)[number];

type Block = { start: number; end: number };

function splitLines(text: string) {
  return { lines: text.split(/\r?\n/), eol: text.includes("\r\n") ? "\r\n" : "\n" };
}

/**
 * Where each episode sits in the file: its header line up to the last
 * non blank line before the next header. Blank lines between episodes stay
 * outside the block so a rewrite keeps the spacing.
 */
function findBlocks(lines: string[]): Block[] {
  const starts = lines.flatMap((line, i) => (HEADER.test(line.trim()) ? [i] : []));
  return starts.map((start, n) => {
    let end = (starts[n + 1] ?? lines.length) - 1;
    while (end > start && !lines[end].trim()) end--;
    return { start, end };
  });
}

/** The raw text of one episode, for noticing it changed underneath an edit. */
export function episodeBlockText(text: string, index: number): string | null {
  const { lines } = splitLines(text);
  const block = findBlocks(lines)[index];
  return block ? lines.slice(block.start, block.end + 1).join("\n") : null;
}

/** Everything in one episode, read the way upload_episodes.parse_output reads it. */
export function readEpisode(text: string, index: number): EpisodeDetails | null {
  const { lines } = splitLines(text);
  const block = findBlocks(lines)[index];
  if (!block) return null;

  const header = HEADER.exec(lines[block.start].trim())!;
  const details: EpisodeDetails = {
    number: header[1],
    type: (header[2] ?? "main").toLowerCase(),
    titles: [],
    duration: "",
    aired: "",
    description: "",
    preview: "",
    source: "",
    extra: [],
  };

  // A line that isn't a field continues the one before it, same as the
  // uploader, so hand wrapped descriptions come through whole.
  let append: ((more: string) => void) | null = null;
  for (const raw of lines.slice(block.start + 1, block.end + 1)) {
    const line = raw.trim();
    if (!line) continue;
    const field = FIELD.exec(line);
    if (!field) {
      append?.(line);
      continue;
    }
    const key = field[1].trim();
    const value = (field[2] ?? "").trim();
    const lower = key.toLowerCase();
    if (lower.endsWith(" title")) {
      const title = { language: key.slice(0, -" title".length).trim(), value };
      details.titles.push(title);
      append = (more) => (title.value = `${title.value} ${more}`.trim());
    } else if ((KNOWN as readonly string[]).includes(lower)) {
      const k = lower as Known;
      details[k] = value;
      append = (more) => (details[k] = `${details[k]} ${more}`.trim());
    } else {
      const entry = { key, value };
      details.extra.push(entry);
      append = (more) => (entry.value = `${entry.value} ${more}`.trim());
    }
  }
  return details;
}

// Every value has to stay on one line, or a pasted line break could start
// what the uploader reads as a new field.
const flat = (value: string) => value.replace(/\s+/g, " ").trim();

function renderEpisode(d: EpisodeDetails): string[] {
  const out = [`Episode ${flat(d.number)}: (${d.type})`];
  for (const t of d.titles) out.push(`${t.language} Title: ${flat(t.value)}`.trimEnd());
  // Same order format_episodes.py writes.
  out.push(`Duration: ${flat(d.duration)}`.trimEnd());
  out.push(`Aired: ${flat(d.aired)}`.trimEnd());
  out.push(`Description: ${flat(d.description)}`.trimEnd());
  if (flat(d.preview)) out.push(`Preview: ${flat(d.preview)}`);
  if (flat(d.source)) out.push(`Source: ${flat(d.source)}`);
  for (const e of d.extra) out.push(`${e.key}: ${flat(e.value)}`.trimEnd());
  return out;
}

/** Swap one episode for new details. Nothing outside its lines changes. */
export function writeEpisode(text: string, index: number, details: EpisodeDetails): string {
  const { lines, eol } = splitLines(text);
  const block = findBlocks(lines)[index];
  if (!block) throw new Error(`Episode ${index + 1} isn't in the file anymore`);
  lines.splice(block.start, block.end - block.start + 1, ...renderEpisode(details));
  return lines.join(eol);
}

const NUMBER = /^\d{1,4}(\.\d)?$/;
const LINK_IN_TEXT = /https?:\/\/|www\./i;

function durationSeconds(text: string): number | null {
  const parts = text.split(":");
  if (parts.length < 2 || parts.length > 3 || !parts.every((p) => /^\d+$/.test(p))) return null;
  const [h, m, s] = (parts.length === 2 ? ["0", ...parts] : parts).map(Number);
  if (m > 59 || s > 59 || h > 24) return null;
  return h * 3600 + m * 60 + s;
}

function realDate(text: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return false;
  const [y, m, d] = text.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

export type EpisodeProblems = Partial<Record<"number" | "type" | "titles" | "duration" | "aired" | "description" | "source", string>> & {
  /** Per title row, by position. */
  title?: Record<number, string>;
};

/**
 * The checks upload_episodes.validate runs, so anything saved here is
 * something the uploader will take. `otherNumbers` are the rest of the
 * file's episodes, for catching a duplicate.
 */
export function checkEpisode(d: EpisodeDetails, otherNumbers: string[]): EpisodeProblems {
  const problems: EpisodeProblems = {};
  const number = flat(d.number);
  if (!NUMBER.test(number)) problems.number = "0 to 9999, with at most one decimal, like 12 or 12.5";
  else if (otherNumbers.some((n) => Number(n) === Number(number))) problems.number = `Episode ${number} is already in the file`;

  if (!isEpisodeType(d.type)) problems.type = "Pick main, recap or filler";

  const title: Record<number, string> = {};
  const seen = new Set<string>();
  d.titles.forEach((t, i) => {
    const language = t.language.toLowerCase();
    if (!TITLE_LANGUAGES.some((l) => l.toLowerCase() === language) && language !== "japanese (romaji)") {
      title[i] = `The uploader doesn't know the language "${t.language}"`;
    } else if (flat(t.value) && seen.has(language)) {
      title[i] = "Only one title per language";
    } else if (flat(t.value).length > 255) {
      title[i] = `${flat(t.value).length} of 255 characters`;
    }
    if (flat(t.value)) seen.add(language);
  });
  if (Object.keys(title).length) problems.title = title;
  if (!d.titles.some((t) => t.language.toLowerCase() === "english" && flat(t.value))) problems.titles = "An English title is required";

  const seconds = durationSeconds(flat(d.duration));
  if (seconds === null || seconds < 1 || seconds > 86400) problems.duration = "Like 23:40 or 1:02:05, up to 24:00:00";

  if (!realDate(flat(d.aired))) problems.aired = "A real date as yyyy-mm-dd";

  const description = flat(d.description);
  if (description.length > 10000) problems.description = `${description.length} of 10,000 characters`;
  else if (LINK_IN_TEXT.test(description)) problems.description = "ComicK doesn't allow links in descriptions";

  const source = flat(d.source);
  if (source && !/^https?:\/\/\S+$/i.test(source)) problems.source = "A full link starting with http:// or https://";

  return problems;
}

export const hasProblems = (p: EpisodeProblems) => Object.keys(p).length > 0;
