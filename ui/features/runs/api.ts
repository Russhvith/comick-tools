import { request } from "@/lib/http";
import type { RunSummary } from "@/types/runs";
import type { FieldValues } from "@/types/tools";

export const RUNS_KEY = "/api/runs";

export function fetchRuns() {
  return request<{ runs: RunSummary[] }>(RUNS_KEY).then((body) => body.runs);
}

export function startRun(tool: string, script: string, values: FieldValues, idempotencyKey: string) {
  return request<{ run: RunSummary }>(RUNS_KEY, {
    method: "POST",
    headers: { "Idempotency-Key": idempotencyKey },
    body: JSON.stringify({ tool, script, values }),
  }).then((body) => body.run);
}

export function stopRun(id: string) {
  return request<{ run: RunSummary }>(`/api/runs/${id}`, { method: "DELETE" });
}

export function sendLine(id: string, line: string) {
  return request<{ ok: true }>(`/api/runs/${id}`, { method: "POST", body: JSON.stringify({ line }) });
}
