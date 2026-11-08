"use client";

import { useEffect, useState } from "react";
import { RotateCw, Save } from "lucide-react";
import { Button } from "@/components/atoms/Button";
import { IconButton } from "@/components/atoms/IconButton";
import { Kbd } from "@/components/atoms/Kbd";
import { Skeleton } from "@/components/atoms/Skeleton";
import { Card } from "@/components/molecules/Card";
import { SegmentedControl } from "@/components/molecules/SegmentedControl";
import { useToast } from "@/components/organisms/Toaster";
import { shortcuts } from "@/config/shortcuts";
import { useHotkey } from "@/hooks/useHotkey";
import type { ToolFile } from "@/types/tools";
import { useToolFile } from "../useToolFile";
import styles from "./FileEditor.module.css";

type Props = {
  toolId: string;
  files: ToolFile[];
  /** Changes whenever a run ends, which is when scripts write these files. */
  refreshKey: number;
};

export function FileEditor({ toolId, files, refreshKey }: Props) {
  const [path, setPath] = useState(files[0]?.path);
  const file = files.find((f) => f.path === path) ?? files[0];
  const { data, loading, error, revalidate, save } = useToolFile(toolId, file?.path);
  const [draft, setDraft] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  const text = draft ?? data?.content ?? "";
  const dirty = draft !== null && draft !== (data?.content ?? "");

  useEffect(() => {
    if (refreshKey) void revalidate();
  }, [refreshKey, revalidate]);

  async function persist(content: string, undoable = true) {
    if (!file) return;
    setSaving(true);
    try {
      const previous = await save(content);
      setDraft(null);
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

  useHotkey(shortcuts.saveFile.combo, () => {
    if (dirty && !saving) void persist(text);
  });

  if (!file) return null;

  function switchTo(next: string) {
    if (dirty && !window.confirm("Drop the unsaved changes to this file?")) return;
    setDraft(null);
    setPath(next);
  }

  return (
    <Card
      title="Data files"
      description={file.hint}
      actions={<IconButton icon={RotateCw} label="Reload from disk" onClick={() => void revalidate()} disabled={dirty} />}
    >
      <div className={styles.tabs}>
        <SegmentedControl label="Files" value={file.path} options={files.map((f) => ({ value: f.path, label: f.label }))} onChange={switchTo} />
      </div>

      {loading ? (
        <div className={styles.skeleton} aria-label="Loading file">
          {[90, 70, 82, 55, 76, 64, 40].map((w, i) => (
            <Skeleton key={i} width={`${w}%`} height="0.75rem" />
          ))}
        </div>
      ) : (
        <textarea
          className={styles.editor}
          aria-label={file.label}
          value={text}
          spellCheck={false}
          placeholder={data?.exists === false ? `${file.path} doesn't exist yet. Paste the content here and save to create it.` : undefined}
          onChange={(e) => setDraft(e.target.value)}
        />
      )}

      <footer className={styles.footer}>
        <code className={styles.path}>{file.path}</code>
        {error && <span className={styles.error}>{error.message}</span>}
        {dirty && <span className={styles.dirty}>Unsaved changes</span>}
        <span className={styles.spacer} />
        <Kbd keys={shortcuts.saveFile.keys} />
        <Button size="sm" variant="primary" disabled={!dirty} loading={saving} onClick={() => void persist(text)}>
          {!saving && <Save size={14} aria-hidden />}
          Save
        </Button>
      </footer>
    </Card>
  );
}
