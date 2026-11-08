"use client";

import { Square, SquareTerminal } from "lucide-react";
import { Button } from "@/components/atoms/Button";
import { Kbd } from "@/components/atoms/Kbd";
import { StatusDot } from "@/components/atoms/StatusDot";
import { shortcuts } from "@/config/shortcuts";
import { duration } from "@/lib/format";
import type { RunStatus, RunSummary } from "@/types/runs";
import { Terminal } from "./Terminal";
import styles from "./RunConsole.module.css";

const statusText: Record<RunStatus, string> = {
  running: "Running",
  done: "Finished",
  failed: "Failed",
  stopped: "Stopped",
};

type Props = {
  run: RunSummary | null;
  onStop: () => void;
  onExit: (status: RunStatus, code: number | null) => void;
};

export function RunConsole({ run, onStop, onExit }: Props) {
  const elapsed = run?.endedAt ? duration(run.endedAt - run.startedAt) : null;

  return (
    <section className={styles.console} aria-label="Console">
      <header className={styles.bar}>
        <SquareTerminal size={16} aria-hidden className={styles.barIcon} />
        <span className={styles.title}>{run ? run.title : "Console"}</span>
        {run && (
          <span className={styles.status} data-status={run.status}>
            <StatusDot status={run.status} />
            {statusText[run.status]}
            {elapsed && <span className={styles.elapsed}>{elapsed}</span>}
            {run.status === "failed" && run.code !== null && <span className={styles.elapsed}>exit {run.code}</span>}
          </span>
        )}
        {run?.status === "running" && run.kind === "script" && (
          <Button size="sm" variant="ghost" onClick={onStop}>
            <Square size={12} aria-hidden fill="currentColor" />
            Stop
          </Button>
        )}
      </header>
      {run ? (
        <Terminal key={run.id} runId={run.id} onExit={onExit} />
      ) : (
        <div className={styles.empty}>
          <p>Output from the script you run shows up here. When it asks something, click here and type the answer.</p>
          <p className={styles.hints}>
            <span>
              <Kbd keys={shortcuts.runScript.keys} /> runs the form
            </span>
            <span>
              <Kbd keys={shortcuts.stopRun.keys} /> stops a run
            </span>
          </p>
        </div>
      )}
    </section>
  );
}
