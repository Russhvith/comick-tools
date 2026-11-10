// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2026 Russhvith

"use client";

import { polling } from "@/config/site";
import { mutateResource, useResource } from "@/hooks/useResource";
import type { RunSummary } from "@/types/runs";
import { RUNS_KEY, fetchRuns } from "./api";

const anyRunning = (runs: RunSummary[] | undefined) => !!runs?.some((r) => r.status === "running");

export function useRuns(initial: RunSummary[]) {
  // Nothing polls while the list is idle. The open console already hears
  // about its run ending over the event stream and refreshes then, and
  // coming back to the tab refreshes too. Polling only covers the gap of
  // a run that's going, so one started elsewhere still shows up finished.
  const { data, revalidate } = useResource(RUNS_KEY, fetchRuns, {
    initial,
    interval: (runs) => (anyRunning(runs) ? polling.runsWhileRunning : undefined),
    revalidateOnFocus: true,
  });
  const runs = data ?? initial;

  return { runs, busy: anyRunning(runs), refresh: revalidate };
}

/** Put a run at the top of the list before the next refresh would. */
export function addRunOptimistically(run: RunSummary) {
  mutateResource<RunSummary[]>(RUNS_KEY, (prev = []) => [run, ...prev.filter((r) => r.id !== run.id)]);
}

export function markRun(id: string, patch: Partial<RunSummary>) {
  mutateResource<RunSummary[]>(RUNS_KEY, (prev = []) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
}
