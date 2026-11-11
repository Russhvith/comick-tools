// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2026 Russhvith

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { REPO_ROOT } from "./paths";

const run = promisify(execFile);

// Everything here comes from the local clone rather than GitHub's API, which
// can't see a private repo without a token. Unpushed commits show up too,
// which is fine for a page that runs on the same machine.

async function git(...args: string[]): Promise<string | null> {
  try {
    const { stdout } = await run("git", args, { cwd: REPO_ROOT, windowsHide: true, timeout: 10_000, maxBuffer: 8 * 1024 * 1024 });
    return stdout;
  } catch {
    // No git, a zip download, or a shallow clone missing a tag. The page
    // drops the section instead of failing.
    return null;
  }
}

const SEP = "\x1f";

/** Commits per day, keyed yyyy-mm-dd, over the last year. */
export async function commitsByDay(): Promise<Record<string, number> | null> {
  const out = await git("log", "--since=1.year", "--format=%ad", "--date=short");
  if (out === null) return null;
  const days: Record<string, number> = {};
  for (const day of out.split("\n")) if (day) days[day] = (days[day] ?? 0) + 1;
  return days;
}

export async function commitCount(): Promise<number | null> {
  const out = await git("rev-list", "--count", "HEAD");
  const n = out ? parseInt(out, 10) : NaN;
  return Number.isFinite(n) ? n : null;
}

export type ChangelogEntry = { hash: string; date: string; subject: string };
export type ChangelogSection = {
  /** A tag like v0.1.0, or null for commits after the newest one. */
  tag: string | null;
  date: string | null;
  entries: ChangelogEntry[];
  /** How many more commits there were than `entries` shows. */
  more: number;
};

const PER_SECTION = 12;
const SECTIONS = 6;

async function commitsIn(range: string): Promise<ChangelogEntry[]> {
  // Subjects only, never author emails, so nothing private ends up on the page.
  const out = await git("log", range, `--format=%h${SEP}%ad${SEP}%s`, "--date=short", "--no-merges");
  if (!out) return [];
  return out
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const [hash, date, subject] = line.split(SEP);
      return { hash, date, subject };
    });
}

/** Commits grouped by release tag, newest first, with unreleased work on top. */
export async function changelog(): Promise<ChangelogSection[] | null> {
  const tagsOut = await git("tag", "--list", "v*", "--sort=-v:refname", `--format=%(refname:short)${SEP}%(creatordate:short)`);
  if (tagsOut === null) return null;
  const tags = tagsOut
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const [tag, date] = line.split(SEP);
      return { tag, date };
    });

  const sections: ChangelogSection[] = [];
  const cut = (tag: string | null, date: string | null, all: ChangelogEntry[]) => {
    if (all.length) sections.push({ tag, date, entries: all.slice(0, PER_SECTION), more: Math.max(0, all.length - PER_SECTION) });
  };

  // Each range is its own git process, so ask for a batch at once instead
  // of one after another. Results are still applied in tag order, and an
  // empty range is skipped just as before, so the sections come out the same.
  const ranges = [
    { tag: null as string | null, date: null as string | null, range: tags[0] ? `${tags[0].tag}..HEAD` : "HEAD" },
    ...tags.map((t, i) => ({ tag: t.tag as string | null, date: t.date as string | null, range: tags[i + 1] ? `${tags[i + 1].tag}..${t.tag}` : t.tag })),
  ];
  for (let start = 0; start < ranges.length && sections.length < SECTIONS; start += SECTIONS) {
    const batch = ranges.slice(start, start + SECTIONS);
    const found = await Promise.all(batch.map((r) => commitsIn(r.range)));
    for (let i = 0; i < batch.length; i++) {
      // The unreleased block always counts, tags only until the list is full.
      if (batch[i].tag !== null && sections.length >= SECTIONS) break;
      cut(batch[i].tag, batch[i].date, found[i]);
    }
  }
  return sections;
}

export type RepoSnapshot = {
  days: Record<string, number> | null;
  count: number | null;
  changelog: ChangelogSection[] | null;
};

// Survives dev reloads the same way the run registry does.
const memo = globalThis as unknown as { __comickRepo?: { key: string; value: RepoSnapshot } };

/**
 * Everything the homepage shows about the repo. Building it takes around
 * ten git processes, which is slow to spawn on Windows, so it's kept until
 * a ref moves (a commit, pull, tag or branch switch) or the day changes,
 * since the calendar counts back a year from today. Checking that costs a
 * single git call.
 */
export async function repoSnapshot(today: string): Promise<RepoSnapshot> {
  const refs = await git("show-ref", "--head");
  const key = refs === null ? null : `${today}\n${refs}`;
  const cached = memo.__comickRepo;
  if (key !== null && cached?.key === key) return cached.value;
  const [days, count, log] = await Promise.all([commitsByDay(), commitCount(), changelog()]);
  const value = { days, count, changelog: log };
  if (key !== null) memo.__comickRepo = { key, value };
  return value;
}
