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

  cut(null, null, await commitsIn(tags[0] ? `${tags[0].tag}..HEAD` : "HEAD"));
  for (let i = 0; i < tags.length && sections.length < SECTIONS; i++) {
    const range = tags[i + 1] ? `${tags[i + 1].tag}..${tags[i].tag}` : tags[i].tag;
    cut(tags[i].tag, tags[i].date, await commitsIn(range));
  }
  return sections;
}
