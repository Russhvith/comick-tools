"use client";

import { useEffect, useMemo, useState } from "react";
import { ClipboardPaste, FileJson } from "lucide-react";
import { Button } from "@/components/atoms/Button";
import { Skeleton } from "@/components/atoms/Skeleton";
import { site } from "@/config/site";
import { RawEditor } from "@/features/files/components/RawEditor";
import { useToolFile } from "@/features/files/useToolFile";
import { fileSize, plural } from "@/lib/format";
import type { StepStatus } from "@/types/steps";
import { parseCrunchyrollInput } from "../parse";
import type { ViewProps } from "./types";
import styles from "./CrunchyrollInput.module.css";

const HOW_TO = `${site.repoUrl}/blob/main/tools/public/crunchyroll-importer/README.md#getting-inputjson`;

export function CrunchyrollInput({ toolId, file, refreshKey, onStatus }: ViewProps) {
  const { data, loading, revalidate } = useToolFile(toolId, file.path);
  const content = data?.content ?? "";

  useEffect(() => {
    if (refreshKey) void revalidate();
  }, [refreshKey, revalidate]);
  // Parsing a few hundred KB is quick, but there's no reason to redo it
  // on every keystroke somewhere else on the page.
  const parsed = useMemo(() => parseCrunchyrollInput(content), [content]);
  const [mode, setMode] = useState<"replace" | "raw" | null>(null);

  useEffect(() => {
    let status: StepStatus;
    if (loading) status = { state: "pending", text: "Loading", ready: false };
    else if (parsed.state === "empty") status = { state: "pending", text: "Waiting for the response", ready: false };
    else if (parsed.state === "invalid") status = { state: "error", text: "Can't read this response", ready: false };
    else {
      const { summary } = parsed;
      const range = summary.first === summary.last ? summary.first : `${summary.first} to ${summary.last}`;
      status = { state: "done", text: `${summary.season ?? summary.series}, ${plural(summary.count, "episode")} (${range})`, ready: true };
    }
    onStatus({ ...status, modifiedAt: data?.modifiedAt ?? null });
  }, [loading, parsed, data?.modifiedAt, onStatus]);

  if (loading) {
    return (
      <div className={styles.loading} aria-label="Loading the response">
        <Skeleton width="55%" height="1rem" />
        <Skeleton width="30%" height="0.75rem" />
      </div>
    );
  }

  const editing = mode !== null || parsed.state !== "ok";

  return (
    <div className={styles.body}>
      {parsed.state === "ok" && !editing && (
        <>
          <dl className={styles.facts}>
            <div>
              <dt>Series</dt>
              <dd>{parsed.summary.series}</dd>
            </div>
            <div>
              <dt>Season</dt>
              <dd>{parsed.summary.season ?? "Not named"}</dd>
            </div>
            <div>
              <dt>Episodes</dt>
              <dd>{parsed.summary.count}</dd>
            </div>
            <div>
              <dt>Response size</dt>
              <dd>{fileSize(new Blob([content]).size)}</dd>
            </div>
          </dl>
          <div className={styles.actions}>
            <Button onClick={() => setMode("replace")}>
              <ClipboardPaste size={14} aria-hidden />
              Paste a different response
            </Button>
            <Button variant="ghost" onClick={() => setMode("raw")}>
              <FileJson size={14} aria-hidden />
              Show the raw JSON
            </Button>
          </div>
        </>
      )}

      {editing && (
        <>
          {parsed.state === "empty" && (
            <p className={styles.help}>
              Open the season on Crunchyroll, copy the response of the season episodes request, and paste it below.{" "}
              <a href={HOW_TO} target="_blank" rel="noreferrer">
                How to find it
              </a>
              .
            </p>
          )}
          {parsed.state === "invalid" && (
            <p className={styles.problem} role="alert">
              {parsed.message}
            </p>
          )}
          <RawEditor
            toolId={toolId}
            file={file}
            refreshKey={refreshKey}
            placeholder='Paste the response here. It starts with {"data":['
            focusOnMount={mode === "replace" ? "select-all" : parsed.state === "ok" ? undefined : "end"}
            onSaved={() => setMode(null)}
          />
          {parsed.state === "ok" && (
            <div className={styles.actions}>
              <Button variant="ghost" onClick={() => setMode(null)}>
                Back to the summary
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
