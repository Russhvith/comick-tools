// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2026 Russhvith

// Starting a script twice by accident (double click, a retried request
// after a flaky network) can mean deleting things twice. The client sends
// an Idempotency-Key with each start, and a key we've already seen gets
// the original run back instead of a new one.
//
// Keys are saved with their run, so a retry that lands after a server
// restart still finds it. The check and the claim happen with no await in
// between, so two copies of one request arriving together can't both slip
// past: the second sees the first's pending claim and waits for its run.

import { createHash } from "node:crypto";
import { keyedRuns } from "./runs";

const TTL_MS = 24 * 60 * 60 * 1000;
const MAX_KEY = 200;

type Entry =
  | { state: "done"; runId: string; hash: string; at: number }
  | { state: "pending"; hash: string; at: number; result: Promise<string | null> };

const store = globalThis as unknown as { __comickIdempotency?: Map<string, Entry>; __comickIdempotencySeeded?: boolean };
const seen = (store.__comickIdempotency ??= new Map());

function seed() {
  if (store.__comickIdempotencySeeded) return;
  store.__comickIdempotencySeeded = true;
  for (const run of keyedRuns()) {
    if (!seen.has(run.idempotencyKey!)) {
      seen.set(run.idempotencyKey!, { state: "done", runId: run.id, hash: run.requestHash ?? "", at: run.startedAt });
    }
  }
}

function sweep(now: number) {
  for (const [key, entry] of seen) if (entry.state === "done" && now - entry.at > TTL_MS) seen.delete(key);
}

/** A stable fingerprint of what was asked for, so a reused key can be told apart. */
export function hashRequest(body: unknown): string {
  return createHash("sha256").update(JSON.stringify(body ?? null)).digest("hex");
}

export type Claim =
  /** No key, or a new one: go ahead, then call settle with the run id (or null on failure). */
  | { kind: "new"; settle: (runId: string | null) => void }
  /** Seen before for this same request: answer with that run. */
  | { kind: "existing"; runId: string }
  /** Seen before, but for a different request. */
  | { kind: "conflict" };

/** Claim a key for a request, or find the run it already started. */
export async function claim(key: string | null, hash: string): Promise<Claim> {
  if (!key || key.length > MAX_KEY) return { kind: "new", settle: () => {} };
  seed();
  sweep(Date.now());

  const entry = seen.get(key);
  if (entry) {
    if (entry.hash && entry.hash !== hash) return { kind: "conflict" };
    if (entry.state === "done") return { kind: "existing", runId: entry.runId };
    // The first copy is still starting. Wait for it and share its answer.
    const runId = await entry.result;
    return runId ? { kind: "existing", runId } : claim(key, hash);
  }

  let resolve!: (runId: string | null) => void;
  const result = new Promise<string | null>((r) => (resolve = r));
  seen.set(key, { state: "pending", hash, at: Date.now(), result });
  return {
    kind: "new",
    settle: (runId) => {
      // A start that failed frees the key, so fixing the request and
      // trying again isn't blocked by the failure.
      if (runId) seen.set(key, { state: "done", runId, hash, at: Date.now() });
      else seen.delete(key);
      resolve(runId);
    },
  };
}
