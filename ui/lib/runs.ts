import { spawn, type ChildProcess } from "node:child_process";
import { randomUUID } from "node:crypto";
import { REPO_ROOT } from "./paths";

export type RunStatus = "running" | "done" | "failed" | "stopped";
export type RunEvent = { type: "output"; text: string } | { type: "exit"; status: RunStatus; code: number | null };

export type Run = {
  id: string;
  kind: "script" | "update";
  title: string;
  toolId?: string;
  startedAt: number;
  endedAt?: number;
  status: RunStatus;
  code: number | null;
  output: string[];
  outputSize: number;
  listeners: Set<(event: RunEvent) => void>;
  child?: ChildProcess;
  acceptsInput: boolean;
};

export type RunSummary = Pick<Run, "id" | "kind" | "title" | "toolId" | "startedAt" | "endedAt" | "status" | "code" | "acceptsInput">;

// Keeps a page that reconnects able to replay what it missed, without a
// chatty run eating memory forever.
const MAX_OUTPUT = 2 * 1024 * 1024;
const MAX_RUNS = 30;

// Dev mode reloads modules on every edit. Hanging the registry off
// globalThis keeps running processes reachable across those reloads.
const store = globalThis as unknown as { __comickRuns?: Map<string, Run> };
const runs: Map<string, Run> = (store.__comickRuns ??= new Map());

export const pythonCommand =
  process.env.COMICK_TOOLS_PYTHON || (process.platform === "win32" ? "python" : "python3");

export function summary(run: Run): RunSummary {
  const { id, kind, title, toolId, startedAt, endedAt, status, code, acceptsInput } = run;
  return { id, kind, title, toolId, startedAt, endedAt, status, code, acceptsInput };
}

export function listRuns(): RunSummary[] {
  return [...runs.values()].sort((a, b) => b.startedAt - a.startedAt).map(summary);
}

export function getRun(id: string): Run | undefined {
  return runs.get(id);
}

function prune() {
  const finished = [...runs.values()].filter((r) => r.status !== "running").sort((a, b) => a.startedAt - b.startedAt);
  while (runs.size > MAX_RUNS && finished.length) runs.delete(finished.shift()!.id);
}

export function createRun(kind: Run["kind"], title: string, toolId?: string): Run {
  const run: Run = {
    id: randomUUID(),
    kind,
    title,
    toolId,
    startedAt: Date.now(),
    status: "running",
    code: null,
    output: [],
    outputSize: 0,
    listeners: new Set(),
    acceptsInput: false,
  };
  runs.set(run.id, run);
  prune();
  return run;
}

export function emit(run: Run, text: string) {
  if (!text) return;
  run.output.push(text);
  run.outputSize += text.length;
  while (run.outputSize > MAX_OUTPUT && run.output.length > 1) run.outputSize -= run.output.shift()!.length;
  for (const listener of run.listeners) listener({ type: "output", text });
}

export function finish(run: Run, status: RunStatus, code: number | null) {
  if (run.status !== "running") return;
  run.status = status;
  run.code = code;
  run.endedAt = Date.now();
  run.child = undefined;
  run.acceptsInput = false;
  for (const listener of run.listeners) listener({ type: "exit", status, code });
}

/** Subscribe to a run. Returns what's already been printed plus an unsubscribe. */
export function subscribe(run: Run, listener: (event: RunEvent) => void) {
  run.listeners.add(listener);
  return { backlog: run.output.join(""), unsubscribe: () => run.listeners.delete(listener) };
}

/**
 * Start one of the Python tools.
 *
 * stdout and stderr are pipes, but the browser renders them in a real
 * terminal emulator, so the scripts are told to behave as if they had a
 * terminal (colour, live progress, prompts). Output is forced to UTF-8
 * because a Windows pipe otherwise falls back to the ANSI code page.
 */
export function startScript(title: string, toolId: string, file: string, args: string[]): Run {
  const run = createRun("script", title, toolId);
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
  return true;
}

export function stopRun(run: Run): boolean {
  if (run.status !== "running" || !run.child) return false;
  run.child.kill();
  emit(run, "\r\n\x1b[33mStopped.\x1b[0m\r\n");
  finish(run, "stopped", null);
  return true;
}
