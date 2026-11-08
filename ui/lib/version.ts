import { execFile } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import { REPO_ROOT } from "./paths";

const run = promisify(execFile);

export const GITHUB_REPO = process.env.COMICK_TOOLS_REPO || "Russhvith/comick-tools";
// GitHub allows 60 unauthenticated calls an hour per IP. Ten minutes of
// caching keeps a tab left open all day well under that.
const CACHE_MS = 10 * 60 * 1000;
export const SERVER_STARTED_AT = Date.now();

export type Release = { version: string; tag: string; name: string; url: string; publishedAt: string; notes: string };
export type VersionInfo = {
  current: string;
  commit: string | null;
  branch: string | null;
  latest: Release | null;
  updateAvailable: boolean;
  checkError: string | null;
  supervised: boolean;
  startedAt: number;
};

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
      result = { release: null, error: "No releases published on GitHub yet" };
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
