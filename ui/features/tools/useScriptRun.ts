// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2026 Russhvith

"use client";

import { useRef, useState } from "react";
import { startRun } from "@/features/runs/api";
import type { RunSummary } from "@/types/runs";
import type { FieldValues, Script } from "@/types/tools";
import { overLimit } from "./components/ScriptTextField";

/**
 * Starting a script from a form: one idempotency key per attempt, the
 * starting and error state, and the checks worth doing before the script
 * spends a second starting up. Shared by the plain form and tool flows.
 */
export function useScriptRun(toolId: string, script: Script, onStarted: (run: RunSummary) => void) {
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  // One key per attempt. A double submit before the first answer comes
  // back reuses it, so the server starts the script once.
  const attemptKey = useRef<string | null>(null);

  /** Why these values can't go yet, or null. The script would refuse them anyway. */
  function problem(values: FieldValues): string | null {
    const tooLong = script.fields.find((f) => f.type === "text" && overLimit(f, String(values[f.flag] ?? "")));
    return tooLong ? `${tooLong.label} is too long` : null;
  }

  async function start(values: FieldValues) {
    const blocked = problem(values);
    if (blocked) {
      setError(blocked);
      return;
    }
    attemptKey.current ??= crypto.randomUUID();
    setError(null);
    setStarting(true);
    try {
      onStarted(await startRun(toolId, script.id, values, attemptKey.current));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      attemptKey.current = null;
      setStarting(false);
    }
  }

  return { starting, error, setError, problem, start };
}
