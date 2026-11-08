"use client";

import { History } from "lucide-react";
import { StatusDot } from "@/components/atoms/StatusDot";
import { clockTime, duration } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { RunSummary } from "@/types/runs";
import styles from "./RecentRuns.module.css";

type Props = {
  runs: RunSummary[];
  activeId: string | null;
  onOpen: (id: string) => void;
};

export function RecentRuns({ runs, activeId, onOpen }: Props) {
  return (
    <section className={styles.panel} aria-labelledby="recent-runs">
      <h2 id="recent-runs" className={styles.heading}>
        Recent runs
      </h2>
      {runs.length === 0 ? (
        <div className={styles.empty}>
          <History size={18} aria-hidden />
          <p>Scripts you run land here. Click one to see its output again.</p>
        </div>
      ) : (
        <ol className={styles.list}>
          {runs.slice(0, 15).map((run) => (
            <li key={run.id}>
              <button
                type="button"
                className={cn(styles.item, run.id === activeId && styles.active)}
                aria-current={run.id === activeId ? "true" : undefined}
                onClick={() => onOpen(run.id)}
              >
                <StatusDot status={run.status} />
                <span className={styles.name}>{run.title.replace(/^[^:]+:\s*/, "")}</span>
                {/* The server and browser can format times in different locales. */}
                <span className={styles.meta} suppressHydrationWarning>
                  {clockTime(run.startedAt)}
                  {run.endedAt && <span>{duration(run.endedAt - run.startedAt)}</span>}
                </span>
              </button>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
