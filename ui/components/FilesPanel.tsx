"use client";

import { useCallback, useEffect, useState } from "react";
import type { ToolFile } from "@/lib/tools";

type Props = {
  toolId: string;
  files: ToolFile[];
  /** Bumps whenever a run finishes, so output written by a script shows up. */
  refreshKey: number;
};

export default function FilesPanel({ toolId, files, refreshKey }: Props) {
  const [active, setActive] = useState(files[0]?.path);
  const [content, setContent] = useState("");
  const [saved, setSaved] = useState("");
  const [state, setState] = useState<"loading" | "ready" | "missing" | "saving" | "error">("loading");
  const [message, setMessage] = useState<string | null>(null);

  const file = files.find((f) => f.path === active) ?? files[0];
  const dirty = content !== saved;
  const query = file ? `/api/files?tool=${encodeURIComponent(toolId)}&path=${encodeURIComponent(file.path)}` : "";

  const load = useCallback(async () => {
    if (!query) return;
    setState("loading");
    setMessage(null);
    const res = await fetch(query);
    const body = await res.json();
    if (!res.ok) {
      setState("error");
      setMessage(body.error);
      return;
    }
    setContent(body.content);
    setSaved(body.content);
    setState(body.exists ? "ready" : "missing");
  }, [query]);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  async function save() {
    setState("saving");
    const res = await fetch(query, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
    const body = await res.json();
    if (!res.ok) {
      setState("error");
      setMessage(body.error);
      return;
    }
    setSaved(content);
    setState("ready");
    setMessage("Saved");
  }

  if (!file) return null;

  return (
    <section className="panel editor" aria-label="Data files">
      <div className="file-tabs" role="tablist">
        {files.map((f) => (
          <button
            key={f.path}
            role="tab"
            className="file-tab"
            aria-selected={f.path === file.path}
            onClick={() => {
              if (dirty && !confirm("Drop the unsaved changes to this file?")) return;
              setActive(f.path);
            }}
          >
            {f.label}
          </button>
        ))}
      </div>
      <textarea
        aria-label={file.label}
        value={content}
        spellCheck={false}
        placeholder={state === "missing" ? `${file.path} doesn't exist yet. ${file.hint ?? ""}` : file.hint}
        onChange={(e) => {
          setContent(e.target.value);
          setMessage(null);
        }}
      />
      <div className="editor-bar">
        <span>
          {file.path}
          {state === "loading" && " loading..."}
          {message && ` ${message}`}
        </span>
        <span style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
          <button type="button" className="text-button" onClick={() => void load()} disabled={dirty}>
            Reload
          </button>
          <button type="button" className="save-button" disabled={!dirty || state === "saving"} onClick={() => void save()}>
            {state === "saving" ? "Saving..." : "Save"}
          </button>
        </span>
      </div>
    </section>
  );
}
