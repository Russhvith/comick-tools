import { execFile } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import type { Release, VersionInfo } from "@/types/version";
import { REPO_ROOT } from "./paths";

const run = promisify(execFile);

export const GITHUB_REPO = process.env.COMICK_TOOLS_REPO || "Russhvith/comick-tools";
// GitHub allows 60 unauthenticated calls an hour per IP. Ten minutes of
// caching keeps a tab left open all day well under that.
const CACHE_MS = 10 * 60 * 1000;
export const SERVER_STARTED_AT = Date.now();

let cached: { at: number; release: Release | null; error: string | null } | null = null;

export function localVersion(): string {
  try {
    return fs.readFileSync(path.join(REPO_ROOT, "VERSION"), "utf8").trim() || "0.0.0";
  } catch {
    return "0.0.0";
  }
}

async function git(...args: string[]): Promise<string | null> {
  try {
    const { stdout } = await run("git", args, { cwd: REPO_ROOT, windowsHide: true });
    return stdout.trim();
  } catch {
    return null;
  }
}

/** Compare dotted versions numerically, ignoring a leading v. */
export function compareVersions(a: string, b: string): number {
  const parts = (v: string) => v.replace(/^v/i, "").split(/[.-]/).map((p) => parseInt(p, 10) || 0);
  const [x, y] = [parts(a), parts(b)];
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    const diff = (x[i] || 0) - (y[i] || 0);
    if (diff) return diff;
  }
  return 0;
}

/**
 * The newest vX.Y.Z tag on origin, through git and whatever credentials it
 * already has. That's the only way to see a private repo without handing
 * the UI a GitHub token, since the API answers 404 to anonymous requests.
 * Tags are what releases hang off, so the version is the same, there are
 * just no release notes.
 */
async function latestTag(): Promise<Release | null> {
  let stdout: string;
  try {
    ({ stdout } = await run("git", ["ls-remote", "--tags", "--refs", "origin"], {
      cwd: REPO_ROOT,
      windowsHide: true,
      timeout: 15_000,
      // Never wait on a password prompt nobody can see.
      env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
    }));
  } catch {
    return null;
  }
  const tags = [...stdout.matchAll(/refs\/tags\/(v?\d+(?:\.\d+)*)$/gm)].map((m) => m[1]);
  if (!tags.length) return null;
  const tag = tags.sort(compareVersions).at(-1)!;
  return {
    version: tag.replace(/^v/i, ""),
    tag,
    name: tag,
    url: `https://github.com/${GITHUB_REPO}/releases/tag/${tag}`,
    publishedAt: "",
    notes: "",
  };
}

async function latestRelease(force: boolean): Promise<{ release: Release | null; error: string | null }> {
  if (!force && cached && Date.now() - cached.at < CACHE_MS) return cached;
  let result: { release: Release | null; error: string | null };
  try {
    const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`, {
      headers: { Accept: "application/vnd.github+json", "User-Agent": "comick-tools-ui" },
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    if (res.status === 404) {
      // Either nothing is published or the repo is private. Git can tell
      // those apart for us.
      const tag = await latestTag();
      result = tag ? { release: tag, error: null } : { release: null, error: "No releases published on GitHub yet" };
    } else if (!res.ok) {
      result = { release: null, error: `GitHub answered ${res.status}` };
    } else {
      const body = await res.json();
      result = {
        release: {
          version: String(body.tag_name || "").replace(/^v/i, ""),
          tag: String(body.tag_name || ""),
          name: String(body.name || body.tag_name || ""),
          url: String(body.html_url || ""),
          publishedAt: String(body.published_at || ""),
          notes: String(body.body || "").slice(0, 4000),
        },
        error: null,
      };
    }
  } catch (error) {
    result = { release: null, error: `Couldn't reach GitHub (${(error as Error).message})` };
  }
  cached = { at: Date.now(), ...result };
  return result;
}

export async function versionInfo(force = false): Promise<VersionInfo> {
  const [commit, branch, { release, error }] = await Promise.all([
    git("rev-parse", "--short", "HEAD"),
    git("rev-parse", "--abbrev-ref", "HEAD"),
    latestRelease(force),
  ]);
  const current = localVersion();
  return {
    current,
    commit,
    branch,
    latest: release,
    updateAvailable: !!release && compareVersions(release.version, current) > 0,
    checkError: error,
    supervised: process.env.COMICK_TOOLS_SUPERVISED === "1",
    startedAt: SERVER_STARTED_AT,
  };
}
