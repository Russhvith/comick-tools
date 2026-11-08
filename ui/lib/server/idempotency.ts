// Starting a script twice by accident (double click, a retried request
// after a flaky network) can mean deleting things twice. The client sends
// an Idempotency-Key with each start, and a key we've already seen gets
// the original run back instead of a new one.

const TTL_MS = 10 * 60 * 1000;

const store = globalThis as unknown as { __comickIdempotency?: Map<string, { runId: string; at: number }> };
const seen = (store.__comickIdempotency ??= new Map());

function sweep(now: number) {
  for (const [key, entry] of seen) if (now - entry.at > TTL_MS) seen.delete(key);
}

export function runForKey(key: string | null): string | null {
  if (!key) return null;
  sweep(Date.now());
  return seen.get(key)?.runId ?? null;
}

export function rememberKey(key: string | null, runId: string) {
  if (key && key.length <= 200) seen.set(key, { runId, at: Date.now() });
}
