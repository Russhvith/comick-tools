"use client";

import { useEffect, useMemo, useState } from "react";
import { FileText, ImageOff, Pencil } from "lucide-react";
import { Button } from "@/components/atoms/Button";
import { Skeleton } from "@/components/atoms/Skeleton";
import { Thumbnail } from "@/components/atoms/Thumbnail";
import { ChoiceGroup } from "@/components/molecules/ChoiceGroup";
import { useToast } from "@/components/organisms/Toaster";
import { RawEditor } from "@/features/files/components/RawEditor";
import { useToolFile } from "@/features/files/useToolFile";
import { plural } from "@/lib/format";
import type { StepStatus } from "@/types/steps";
import { EPISODE_TYPES, isEpisodeType, parseEpisodes, setEpisodeType, type EpisodeRow, type EpisodeType } from "../parse";
import { previewSrc } from "../preview";
import { EpisodeEditor } from "./EpisodeEditor";
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

export function EpisodeList({ toolId, file, refreshKey, held, onStatus }: ViewProps) {
  const { data, loading, save, revalidate } = useToolFile(toolId, file.path);
  const content = data?.content ?? "";
  const rows = useMemo(() => parseEpisodes(content), [content]);

  // A script that just finished is what writes this file.
  useEffect(() => {
    if (refreshKey) void revalidate();
  }, [refreshKey, revalidate]);
  const [raw, setRaw] = useState(false);
  const [rawDirty, setRawDirty] = useState(false);
  const [open, setOpen] = useState<number | null>(null);
  const toast = useToast();

  // Thumbnails only when the formatter actually downloaded previews. A
  // --no-images run leaves links, and a column of empty boxes says nothing.
  const thumbs = useMemo(
    () => rows.map((r) => previewSrc(toolId, file.path, r.preview, data?.modifiedAt)),
    [rows, toolId, file.path, data?.modifiedAt],
  );
  const withImages = thumbs.some(Boolean);

  const counts = EPISODE_TYPES.map((type) => ({ type, n: rows.filter((r) => r.type === type).length }));
  const bad = rows.find((r) => !isEpisodeType(r.type));
  const edited = rows.filter((r) => r.type !== "main");

  useEffect(() => {
    let status: StepStatus;
    if (loading) status = { state: "pending", text: "Loading", ready: false };
    // Blocked rather than pending, so only the step that can act right now
    // (format) is highlighted.
    else if (!data?.exists) status = { state: "blocked", text: "Not generated yet", ready: false };
    else if (rows.length === 0) status = { state: "error", text: "No episodes found in the file", ready: false };
    else if (bad) status = { state: "error", text: `Episode ${bad.number} has the type "${bad.type}"`, ready: false };
    else {
      const summary = counts.filter((c) => c.n > 0).map((c) => `${c.n} ${c.type}`);
      status = {
        state: "done",
        text: `${plural(rows.length, "episode")}: ${summary.join(", ")}`,
        ready: true,
        // Any hand edit is lost on a rerun, and we can't tell which episodes
        // had one, so always ask. Types are the common case, so name those.
        replaceWarning: edited.length
          ? `This rewrites output.txt, so ${names(edited)} ${edited.length === 1 ? "goes" : "go"} back to main and any edits to the episodes are lost.`
          : "This rewrites output.txt, so any edits made to the episodes are lost.",
      };
    }
    onStatus({ ...status, modifiedAt: data?.modifiedAt ?? null });
    // counts and edited derive from rows, which already triggers this.
  }, [loading, data?.exists, data?.modifiedAt, rows, bad, onStatus]);

  async function saveEpisode(next: string, number: string) {
    const previous = await save(next);
    toast({
      tone: "success",
      message: `Saved episode ${number}`,
      action: { label: "Undo", run: () => void save(previous).catch(() => {}) },
    });
  }

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

  if (held) {
    return <p className={styles.empty}>{held}</p>;
  }

  return (
    <div className={styles.body}>
      {rows.length > 0 && (
        <div className={styles.list}>
          <div className={styles.head} aria-hidden>
            <span>Episode</span>
            <span>Title</span>
            <span className={styles.aired}>Aired</span>
            <span>Type</span>
          </div>
          <ul className={styles.rows} aria-label="Episodes">
            {rows.map((row) => (
              <li key={row.index} className={styles.row}>
                <button
                  type="button"
                  className={styles.open}
                  disabled={rawDirty}
                  aria-label={`Edit episode ${row.number}, ${row.title || "no title"}`}
                  onClick={() => setOpen(row.index)}
                >
                  <span className={styles.number}>{row.number}</span>
                  <span className={styles.title} title={row.title}>
                    {withImages && (
                      <span className={styles.thumbSlot}>
                        {thumbs[row.index] ? (
                          <Thumbnail src={thumbs[row.index]!} alt="" className={styles.thumb} />
                        ) : (
                          <span className={styles.noThumb} title="No preview, this episode uploads without one">
                            <ImageOff size={14} aria-hidden />
                          </span>
                        )}
                      </span>
                    )}
                    <span className={styles.titleText}>{row.title || "No title"}</span>
                    <Pencil size={13} aria-hidden className={styles.pencil} />
                  </span>
                  <span className={styles.aired}>{row.aired ?? "No date"}</span>
                </button>
                <ChoiceGroup
                  label={`Type of episode ${row.number}`}
                  options={options}
                  value={row.type}
                  invalid={!isEpisodeType(row.type)}
                  disabled={rawDirty}
                  onChange={(type) => void change(row, type)}
                />
              </li>
            ))}
          </ul>
        </div>
      )}

      {rawDirty ? (
        <p className={styles.note}>Save or reload the raw text below before editing episodes here.</p>
      ) : (
        rows.length > 0 && <p className={styles.tip}>Click an episode to edit its titles, dates, description and links.</p>
      )}

      <EpisodeEditor content={content} rows={rows} index={open} onIndexChange={setOpen}
        onSave={saveEpisode}
        imageSrc={(preview) => previewSrc(toolId, file.path, preview, data?.modifiedAt)}
      />

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
