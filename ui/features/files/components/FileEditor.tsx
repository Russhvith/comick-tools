"use client";

import { useState } from "react";
import { Card } from "@/components/molecules/Card";
import { SegmentedControl } from "@/components/molecules/SegmentedControl";
import type { ToolFile } from "@/types/tools";
import { RawEditor } from "./RawEditor";
import styles from "./FileEditor.module.css";

type Props = {
  toolId: string;
  files: ToolFile[];
  refreshKey: number;
};

/** All of a tool's data files in one card. Used by tools that don't define steps. */
export function FileEditor({ toolId, files, refreshKey }: Props) {
  const [path, setPath] = useState(files[0]?.path);
  const [dirty, setDirty] = useState(false);
  const file = files.find((f) => f.path === path) ?? files[0];
  if (!file) return null;

  function switchTo(next: string) {
    if (dirty && !window.confirm("Drop the unsaved changes to this file?")) return;
    setPath(next);
  }

  return (
    <Card title="Data files" description={file.hint}>
      <div className={styles.tabs}>
        <SegmentedControl label="Files" value={file.path} options={files.map((f) => ({ value: f.path, label: f.label }))} onChange={switchTo} />
      </div>
      <RawEditor key={file.path} toolId={toolId} file={file} refreshKey={refreshKey} onDirtyChange={setDirty} />
    </Card>
  );
}
