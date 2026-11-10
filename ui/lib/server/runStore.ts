// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2026 Russhvith

import fs from "node:fs";
import path from "node:path";
import type { RunSummary } from "@/types/runs";
import { REPO_ROOT } from "./paths";

// Local state lives next to the code but outside git, so an in-app update
// (git pull) never touches it and it survives restarts.
export const STATE_DIR = process.env.COMICK_TOOLS_STATE_DIR
  ? path.resolve(process.env.COMICK_TOOLS_STATE_DIR)
  : path.join(REPO_ROOT, ".state");
const RUNS_DIR = path.join(STATE_DIR, "runs");

// A run's output on disk stops growing here. Enough for any real season or
// deletion, small enough that replaying it in the browser stays quick.
const MAX_LOG_BYTES = 4 * 1024 * 1024;

const ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** What we keep about a run besides its output. */
export type StoredRun = RunSummary & {
  idempotencyKey?: string;
  /** Hash of the request that started it, to catch a key reused for something else. */
  requestHash?: string;
};

const metaPath = (id: string) => path.join(RUNS_DIR, `${id}.json`);
const logPath = (id: string) => path.join(RUNS_DIR, `${id}.log`);

// Losing history is annoying, losing a run because the disk said no would
// be worse, so every write here logs and carries on.
function warn(what: string, error: unknown) {
  console.warn(`[runs] couldn't ${what}: ${(error as Error).message}`);
}

function ensureDir() {
  fs.mkdirSync(RUNS_DIR, { recursive: true });
}

/**
 * Write the run's details through a temp file and a rename, so a crash
 * mid write leaves the old version rather than half a JSON file.
 */
export function saveMeta(run: StoredRun) {
  try {
    ensureDir();
    const target = metaPath(run.id);
    const temp = `${target}.${process.pid}.tmp`;
    fs.writeFileSync(temp, JSON.stringify(run), "utf8");
    fs.renameSync(temp, target);
  } catch (error) {
    warn(`save run ${run.id}`, error);
  }
}

/** Every run on disk, newest first. Unreadable files are skipped, not fatal. */
export function loadAll(): StoredRun[] {
  let names: string[];
  try {
    names = fs.readdirSync(RUNS_DIR);
  } catch {
    return [];
  }
  const runs: StoredRun[] = [];
  for (const name of names) {
    if (name.endsWith(".tmp")) {
      // Left behind by a write that never got to its rename.
      fs.rmSync(path.join(RUNS_DIR, name), { force: true });
      continue;
    }
    if (!name.endsWith(".json") || !ID.test(name.slice(0, -5))) continue;
    try {
      const run = JSON.parse(fs.readFileSync(path.join(RUNS_DIR, name), "utf8")) as StoredRun;
      if (run && run.id === name.slice(0, -5) && typeof run.startedAt === "number") runs.push(run);
    } catch (error) {
      warn(`read ${name}`, error);
    }
  }
  return runs.sort((a, b) => b.startedAt - a.startedAt);
}

export function readLog(id: string): string {
  if (!ID.test(id)) return "";
  try {
    return fs.readFileSync(logPath(id), "utf8");
  } catch {
    return "";
  }
}

/** One-off append for a run whose live log is already closed. */
export function appendLog(id: string, text: string) {
  if (!ID.test(id)) return;
  try {
    ensureDir();
    fs.appendFileSync(logPath(id), text, "utf8");
  } catch (error) {
    warn(`append to the log for ${id}`, error);
  }
}

export function removeRun(id: string) {
  if (!ID.test(id)) return;
  for (const file of [metaPath(id), logPath(id)]) {
    try {
      fs.rmSync(file, { force: true });
    } catch (error) {
      warn(`delete ${path.basename(file)}`, error);
    }
  }
}

/**
 * Append-only output file for a live run. Writes are queued on one stream
 * rather than opened and closed per chunk, which matters for scripts that
 * print a progress line many times a second.
 */
export class RunLog {
  private stream: fs.WriteStream | null = null;
  private bytes = 0;
  private full = false;

  constructor(id: string) {
    try {
      ensureDir();
      this.stream = fs.createWriteStream(logPath(id), { flags: "a", encoding: "utf8" });
      this.stream.on("error", (error) => {
        warn(`write the log for ${id}`, error);
        this.stream = null;
      });
    } catch (error) {
      warn(`open the log for ${id}`, error);
    }
  }

  write(text: string) {
    if (!this.stream || this.full || !text) return;
    const size = Buffer.byteLength(text, "utf8");
    if (this.bytes + size > MAX_LOG_BYTES) {
      this.full = true;
      this.stream.write("\r\n\x1b[33m[Output past 4 MB isn't kept in the history.]\x1b[0m\r\n");
      return;
    }
    this.bytes += size;
    this.stream.write(text);
  }

  /** Resolves once everything written so far is on disk. */
  close(): Promise<void> {
    const stream = this.stream;
    this.stream = null;
    if (!stream) return Promise.resolve();
    return new Promise((resolve) => stream.end(() => resolve()));
  }
}
