"use client";

import { useEffect, useMemo, useState } from "react";
import { FileText } from "lucide-react";
import { Button } from "@/components/atoms/Button";
import { Skeleton } from "@/components/atoms/Skeleton";
import { ChoiceGroup } from "@/components/molecules/ChoiceGroup";
import { useToast } from "@/components/organisms/Toaster";
import { RawEditor } from "@/features/files/components/RawEditor";
import { useToolFile } from "@/features/files/useToolFile";
import { plural } from "@/lib/format";
import type { StepStatus } from "@/types/steps";
import { EPISODE_TYPES, isEpisodeType, parseEpisodes, setEpisodeType, type EpisodeRow, type EpisodeType } from "../parse";
import type { ViewProps } from "./types";
import styles from "./EpisodeList.module.css";

const options = [
  { value: "main", label: "Main" },
  { value: "recap", label: "Recap", tone: "info" },
  { value: "filler", label: "Filler", tone: "warning" },
] as const;

function names(rows: EpisodeRow[]) {
  const shown = rows.slice(0, 4).map((r) => `episode ${r.number} (${r.type})`);
  return rows.length > 4 ? `${shown.join(", ")} and ${rows.length - 4} more` : shown.join(" and ");
}

export function EpisodeList({ toolId, file, refreshKey, onStatus }: ViewProps) {
  const { data, loading, save, revalidate } = useToolFile(toolId, file.path);
  const content = data?.content ?? "";
  const rows = useMemo(() => parseEpisodes(content), [content]);

  // A script that just finished is what writes this file.
  useEffect(() => {
    if (refreshKey) void revalidate();
  }, [refreshKey, revalidate]);
  const [raw, setRaw] = useState(false);
  const [rawDirty, setRawDirty] = useState(false);
  const toast = useToast();

  const counts = EPISODE_TYPES.map((type) => ({ type, n: rows.filter((r) => r.type === type).length }));
  const bad = rows.find((r) => !isEpisodeType(r.type));
  const edited = rows.filter((r) => r.type !== "main");

  useEffect(() => {
    let status: StepStatus;
    if (loading) status = { state: "pending", text: "Loading", ready: false };
    else if (!data?.exists) status = { state: "pending", text: "Not generated yet", ready: false };
    else if (rows.length === 0) status = { state: "error", text: "No episodes found in the file", ready: false };
    else if (bad) status = { state: "error", text: `Episode ${bad.number} has the type "${bad.type}"`, ready: false };
    else {
      const summary = counts.filter((c) => c.n > 0).map((c) => `${c.n} ${c.type}`);
      status = {
        state: "done",
        text: `${plural(rows.length, "episode")}: ${summary.join(", ")}`,
        ready: true,
        replaceWarning: edited.length
          ? `This replaces the formatted episodes, so ${names(edited)} ${edited.length === 1 ? "goes" : "go"} back to main.`
          : null,
      };
    }
    onStatus({ ...status, modifiedAt: data?.modifiedAt ?? null });
    // counts and edited derive from rows, which already triggers this.
  }, [loading, data?.exists, data?.modifiedAt, rows, bad, onStatus]);

  async function change(row: EpisodeRow, type: EpisodeType) {
    const before = row.type;
    try {
      const previous = await save(setEpisodeType(content, row.index, type));
      toast({
        tone: "success",
        message: `Episode ${row.number} is now ${type}`,
        action: { label: "Undo", run: () => void save(previous).catch(() => {}) },
      });
    } catch (e) {
      toast({ tone: "error", message: `Couldn't change episode ${row.number} from ${before}: ${(e as Error).message}` });
    }
  }

  if (loading) {
    return (
      <div className={styles.skeleton} aria-label="Loading the episodes">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} height="2rem" />
        ))}
      </div>
    );
  }

  if (!data?.exists) {
    return <p className={styles.empty}>Run the format step above and the episodes show up here.</p>;
  }

  return (
    <div className={styles.body}>
      {rows.length > 0 && (
        <div className={styles.list} role="table" aria-label="Episodes">
          <div className={styles.head} role="row">
            <span role="columnheader">Episode</span>
            <span role="columnheader">Title</span>
            <span role="columnheader" className={styles.aired}>
              Aired
            </span>
            <span role="columnheader">Type</span>
          </div>
          <div className={styles.rows}>
            {rows.map((row) => (
              <div key={row.index} className={styles.row} role="row">
                <span className={styles.number} role="cell">
                  {row.number}
                </span>
                <span className={styles.title} role="cell" title={row.title}>
                  {row.title || "No title"}
                </span>
                <span className={styles.aired} role="cell">
                  {row.aired ?? "No date"}
                </span>
                <span role="cell">
                  <ChoiceGroup
                    label={`Type of episode ${row.number}`}
                    options={options}
                    value={row.type}
                    invalid={!isEpisodeType(row.type)}
                    disabled={rawDirty}
                    onChange={(type) => void change(row, type)}
                  />
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {rawDirty && <p className={styles.note}>Save or reload the raw text below before changing types here.</p>}

      <div className={styles.actions}>
        <Button variant="ghost" onClick={() => setRaw((v) => !v)} aria-expanded={raw}>
          <FileText size={14} aria-hidden />
          {raw ? "Hide the raw text" : "Edit the raw text"}
        </Button>
      </div>

      {raw && <RawEditor toolId={toolId} file={file} refreshKey={refreshKey} onDirtyChange={setRawDirty} />}
    </div>
  );
}
