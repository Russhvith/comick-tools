// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2026 Russhvith

"use client";

import { useState } from "react";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/atoms/Button";
import { ConfirmDialog } from "@/components/organisms/ConfirmDialog";
import { useToast } from "@/components/organisms/Toaster";
import { request } from "@/lib/http";
import type { Tool } from "@/types/tools";
import styles from "./StartOver.module.css";

type Props = {
  tool: Tool;
  /** A run is going, which the server would refuse anyway. */
  busy: boolean;
  /** Tell the page its files changed, so every step reloads them. */
  onCleared: () => void;
};

/** Clears a tool's working files, after asking, so the next job starts clean. */
export function StartOver({ tool, busy, onCleared }: Props) {
  const [asking, setAsking] = useState(false);
  const [clearing, setClearing] = useState(false);
  const toast = useToast();
  if (!tool.reset) return null;

  const files = tool.reset.files ?? [];
  const folders = tool.reset.folders ?? [];

  async function clear() {
    setAsking(false);
    setClearing(true);
    try {
      const { removed } = await request<{ removed: string[] }>("/api/reset", {
        method: "POST",
        body: JSON.stringify({ tool: tool.id }),
      });
      onCleared();
      toast({
        tone: "success",
        message: removed.length ? `Cleared ${removed.length} file${removed.length === 1 ? "" : "s"}, ready for the next one` : "Already empty, nothing to clear",
      });
    } catch (e) {
      toast({ tone: "error", message: `Couldn't clear: ${(e as Error).message}` });
    } finally {
      setClearing(false);
    }
  }

  return (
    <>
      <Button
        variant="secondary"
        onClick={() => setAsking(true)}
        disabled={busy}
        loading={clearing}
        title={busy ? "Wait for the run to finish first" : undefined}
      >
        {!clearing && <RotateCcw size={15} aria-hidden />}
        Start over
      </Button>
      <ConfirmDialog
        open={asking}
        title="Start over?"
        tone="danger"
        confirmLabel="Delete and start over"
        onCancel={() => setAsking(false)}
        onConfirm={() => void clear()}
      >
        <p>This permanently deletes, with no undo:</p>
        <ul className={styles.list}>
          {files.map((f) => (
            <li key={f}>
              <code>{f}</code>
            </li>
          ))}
          {folders.map((f) => (
            <li key={f}>
              every file in <code>{f}</code>
            </li>
          ))}
        </ul>
      </ConfirmDialog>
    </>
  );
}
