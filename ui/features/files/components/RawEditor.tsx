// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2026 Russhvith

"use client";

import { useEffect, useRef, useState } from "react";
import { RotateCw, Save } from "lucide-react";
import { Button } from "@/components/atoms/Button";
import { IconButton } from "@/components/atoms/IconButton";
import { Kbd } from "@/components/atoms/Kbd";
import { Skeleton } from "@/components/atoms/Skeleton";
import { useToast } from "@/components/organisms/Toaster";
import { shortcuts } from "@/config/shortcuts";
import { isMac } from "@/hooks/useHotkey";
import type { ToolFile } from "@/types/tools";
import { useToolFile } from "../useToolFile";
import styles from "./RawEditor.module.css";

type Props = {
  toolId: string;
  file: ToolFile;
  /** Changes whenever a run ends, which is when scripts write these files. */
  refreshKey: number;
  placeholder?: string;
  /** Put the cursor in the box once the file has loaded. */
  focusOnMount?: "end" | "select-all";
  onDirtyChange?: (dirty: boolean) => void;
  onSaved?: (content: string) => void;
};

/** The file as plain text. Save with the button or Ctrl S while typing in it. */
export function RawEditor({ toolId, file, refreshKey, placeholder, focusOnMount, onDirtyChange, onSaved }: Props) {
  const { data, loading, error, revalidate, save } = useToolFile(toolId, file.path);
  const [draft, setDraft] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const area = useRef<HTMLTextAreaElement>(null);
  const toast = useToast();

  const text = draft ?? data?.content ?? "";
  const dirty = draft !== null && draft !== (data?.content ?? "");

  useEffect(() => onDirtyChange?.(dirty), [dirty, onDirtyChange]);

  useEffect(() => {
    if (refreshKey) void revalidate();
  }, [refreshKey, revalidate]);

  useEffect(() => {
    if (loading || !focusOnMount || !area.current) return;
    area.current.focus();
    if (focusOnMount === "select-all") area.current.select();
  }, [loading, focusOnMount]);

  async function persist(content: string, undoable = true) {
    setSaving(true);
    try {
      const previous = await save(content);
      setDraft(null);
      onSaved?.(content);
      toast({
        tone: "success",
        message: `Saved ${file.path}`,
        action: undoable ? { label: "Undo", run: () => void persist(previous, false) } : undefined,
      });
    } catch (e) {
      toast({ tone: "error", message: `Couldn't save ${file.path}: ${(e as Error).message}` });
    } finally {
      setSaving(false);
    }
  }

  function onKeyDown(event: React.KeyboardEvent) {
    // Handled on the box itself, not window wide, so two editors on one
    // page never both save from a single keypress.
    const mod = isMac() ? event.metaKey : event.ctrlKey;
    if (mod && event.key.toLowerCase() === "s") {
      event.preventDefault();
      if (dirty && !saving) void persist(text);
    }
  }

  return (
    <div className={styles.editor}>
      {loading ? (
        <div className={styles.skeleton} aria-label="Loading file">
          {[90, 70, 82, 55, 76, 64, 40].map((w, i) => (
            <Skeleton key={i} width={`${w}%`} height="0.75rem" />
          ))}
        </div>
      ) : (
        <textarea
          ref={area}
          className={styles.textarea}
          aria-label={file.label}
          value={text}
          spellCheck={false}
          placeholder={data?.exists === false ? `${file.path} doesn't exist yet. Paste the content here and save to create it.` : placeholder}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
        />
      )}
      <footer className={styles.footer}>
        <code className={styles.path}>{file.path}</code>
        {error && <span className={styles.error}>{error.message}</span>}
        {dirty && <span className={styles.dirty}>Unsaved changes</span>}
        <span className={styles.spacer} />
        <IconButton icon={RotateCw} label="Reload from disk" onClick={() => void revalidate()} disabled={dirty} />
        <Kbd keys={shortcuts.saveFile.keys} />
        <Button size="sm" variant="primary" disabled={!dirty} loading={saving} onClick={() => void persist(text)}>
          {!saving && <Save size={14} aria-hidden />}
          Save
        </Button>
      </footer>
    </div>
  );
}
