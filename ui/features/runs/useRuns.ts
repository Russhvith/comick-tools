"use client";

import { polling } from "@/config/site";
import { mutateResource, useResource } from "@/hooks/useResource";
import type { RunSummary } from "@/types/runs";
import { RUNS_KEY, fetchRuns } from "./api";

export function useRuns(initial: RunSummary[]) {
  const { data, revalidate } = useResource(RUNS_KEY, fetchRuns, { initial, interval: polling.runsIdle });
  const runs = data ?? initial;
  const busy = runs.some((r) => r.status === "running");

  // The idle interval is slow on purpose. While something runs, poll
  // faster so the list catches the finish quickly.
  useResource(busy ? `${RUNS_KEY}#busy` : null, async () => {
    const fresh = await fetchRuns();
    mutateResource(RUNS_KEY, fresh);
    return fresh;
  }, { interval: polling.runsBusy });

  return { runs, busy, refresh: revalidate };
}

/** Put a run at the top of the list before the next poll would. */
export function addRunOptimistically(run: RunSummary) {
  mutateResource<RunSummary[]>(RUNS_KEY, (prev = []) => [run, ...prev.filter((r) => r.id !== run.id)]);
}

export function markRun(id: string, patch: Partial<RunSummary>) {
  mutateResource<RunSummary[]>(RUNS_KEY, (prev = []) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
}
