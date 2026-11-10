// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2026 Russhvith

import { spawn, type ChildProcess } from "node:child_process";
import { randomUUID } from "node:crypto";
import type { RunEvent, RunStatus, RunSummary } from "@/types/runs";
import { REPO_ROOT } from "./paths";
import { appendLog, loadAll, readLog, removeRun, RunLog, saveMeta, type StoredRun } from "./runStore";

export type { RunEvent, RunStatus, RunSummary };

export type Run = StoredRun & {
  /** Output while the run is live. Finished runs read theirs from disk. */
  output: string[];
  outputSize: number;
  onDisk: boolean;
  log?: RunLog;
  listeners: Set<(event: Exclude<RunEvent, { type: "ping" }>) => void>;
  child?: ChildProcess;
};

// Keeps a page that reconnects able to replay what it missed, without a
// chatty run eating memory forever.
const MAX_OUTPUT = 2 * 1024 * 1024;
// How many runs the history keeps, on disk and in the list.
const MAX_RUNS = 100;

// Dev mode reloads modules on every edit. Hanging the registry off
// globalThis keeps running processes reachable across those reloads, and
// the loaded flag stops each reload from reading the disk again.
const store = globalThis as unknown as { __comickRuns?: Map<string, Run>; __comickRunsLoaded?: boolean };
const runs: Map<string, Run> = (store.__comickRuns ??= new Map());

export const pythonCommand =
  process.env.COMICK_TOOLS_PYTHON || (process.platform === "win32" ? "python" : "python3");

const INTERRUPTED =
  "\r\n\x1b[33mThe tools server stopped while this was running, so the rest of its output wasn't kept. " +
  "The script itself may have carried on.\x1b[0m\r\n";

/**
 * Bring back the history from disk, once per server process. Anything
 * still marked running belonged to a server that's gone, and its process
 * with it as far as we can tell, so it's closed off as stopped.
 */
function ensureLoaded() {
  if (store.__comickRunsLoaded) return;
  store.__comickRunsLoaded = true;
  for (const stored of loadAll().slice(0, MAX_RUNS)) {
    if (runs.has(stored.id)) continue;
    const run: Run = { ...stored, output: [], outputSize: 0, onDisk: true, listeners: new Set(), acceptsInput: false };
    if (run.status === "running") {
      run.status = "stopped";
      run.code = null;
      run.endedAt = Date.now();
      appendLog(run.id, INTERRUPTED);
      saveMeta(toStored(run));
    }
    runs.set(run.id, run);
  }
}

function toStored(run: Run): StoredRun {
  const { id, kind, title, toolId, startedAt, endedAt, status, code, acceptsInput, idempotencyKey, requestHash } = run;
  return { id, kind, title, toolId, startedAt, endedAt, status, code, acceptsInput, idempotencyKey, requestHash };
}

export function summary(run: Run): RunSummary {
  const { id, kind, title, toolId, startedAt, endedAt, status, code, acceptsInput } = run;
  return { id, kind, title, toolId, startedAt, endedAt, status, code, acceptsInput };
}

export function listRuns(): RunSummary[] {
  ensureLoaded();
  return [...runs.values()].sort((a, b) => b.startedAt - a.startedAt).map(summary);
}

export function getRun(id: string): Run | undefined {
  ensureLoaded();
  return runs.get(id);
}

/** Runs that carry an idempotency key, for rebuilding the key table after a restart. */
export function keyedRuns(): Run[] {
  ensureLoaded();
  return [...runs.values()].filter((r) => r.idempotencyKey);
}

function prune() {
  const finished = [...runs.values()].filter((r) => r.status !== "running").sort((a, b) => a.startedAt - b.startedAt);
  while (runs.size > MAX_RUNS && finished.length) {
    const oldest = finished.shift()!;
    runs.delete(oldest.id);
    removeRun(oldest.id);
  }
}

export function createRun(
  kind: Run["kind"],
  title: string,
  toolId?: string,
  request?: { idempotencyKey?: string; requestHash?: string },
): Run {
  ensureLoaded();
  const id = randomUUID();
  const run: Run = {
    id,
    kind,
    title,
    toolId,
    startedAt: Date.now(),
    status: "running",
    code: null,
    acceptsInput: false,
    idempotencyKey: request?.idempotencyKey,
    requestHash: request?.requestHash,
    output: [],
    outputSize: 0,
    onDisk: false,
    log: new RunLog(id),
    listeners: new Set(),
  };
  runs.set(run.id, run);
  saveMeta(toStored(run));
  prune();
  return run;
}

function record(run: Run, text: string) {
  run.output.push(text);
  run.outputSize += text.length;
  while (run.outputSize > MAX_OUTPUT && run.output.length > 1) run.outputSize -= run.output.shift()!.length;
  run.log?.write(text);
}

export function emit(run: Run, text: string) {
  if (!text) return;
  record(run, text);
  for (const listener of run.listeners) listener({ type: "output", text });
}

export function finish(run: Run, status: RunStatus, code: number | null) {
  if (run.status !== "running") return;
  run.status = status;
  run.code = code;
  run.endedAt = Date.now();
  run.child = undefined;
  run.acceptsInput = false;
  saveMeta(toStored(run));
  // Once the log is flushed the disk copy is the one to replay, and the
  // memory can go. Until then the in memory copy answers.
  const log = run.log;
  run.log = undefined;
  void log?.close().then(() => {
    run.output = [];
    run.outputSize = 0;
    run.onDisk = true;
  });
  for (const listener of run.listeners) listener({ type: "exit", status, code });
}

/** Subscribe to a run. Returns what's already been printed plus an unsubscribe. */
export function subscribe(run: Run, listener: (event: Exclude<RunEvent, { type: "ping" }>) => void) {
  run.listeners.add(listener);
  const backlog = run.onDisk ? readLog(run.id) : run.output.join("");
  return { backlog, unsubscribe: () => run.listeners.delete(listener) };
}

/**
 * Start one of the Python tools.
 *
 * stdout and stderr are pipes, but the browser renders them in a real
 * terminal emulator, so the scripts are told to behave as if they had a
 * terminal (colour, live progress, prompts). Output is forced to UTF-8
 * because a Windows pipe otherwise falls back to the ANSI code page.
 */
export function startScript(
  title: string,
  toolId: string,
  file: string,
  args: string[],
  request?: { idempotencyKey?: string; requestHash?: string },
): Run {
  const run = createRun("script", title, toolId, request);
  const child = spawn(pythonCommand, ["-u", file, ...args], {
    cwd: REPO_ROOT,
    env: {
      ...process.env,
      PYTHONUNBUFFERED: "1",
      PYTHONIOENCODING: "utf-8",
      COMICK_TOOLS_FORCE_TTY: "1",
    },
    windowsHide: true,
  });
  run.child = child;
  run.acceptsInput = true;
  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");
  child.stdout.on("data", (chunk: string) => emit(run, chunk));
  child.stderr.on("data", (chunk: string) => emit(run, chunk));
  child.on("error", (error) => {
    emit(run, `\r\n\x1b[31mCouldn't start ${pythonCommand}: ${error.message}\x1b[0m\r\n`);
    finish(run, "failed", null);
  });
  child.on("close", (code, signal) => {
    if (run.status !== "running") return;
    finish(run, signal ? "stopped" : code === 0 ? "done" : "failed", code);
  });
  return run;
}

export function sendInput(run: Run, line: string): boolean {
  if (run.status !== "running" || !run.acceptsInput || !run.child?.stdin?.writable) return false;
  run.child.stdin.write(`${line}\n`);
  // The console that typed this already echoed it, so live listeners don't
  // get it again. It still goes in the backlog, otherwise a replay shows
  // every prompt unanswered with the next output glued onto it.
  record(run, `${line}\r\n`);
  return true;
}

export function stopRun(run: Run): boolean {
  if (run.status !== "running" || !run.child) return false;
  run.child.kill();
  emit(run, "\r\n\x1b[33mStopped.\x1b[0m\r\n");
  finish(run, "stopped", null);
  return true;
}
