"use client";

import { useState } from "react";
import type { Script } from "@/lib/tools";

type Props = {
  toolId: string;
  script: Script;
  busy: boolean;
  onStarted: (runId: string) => void;
};

export default function ScriptForm({ toolId, script, busy, onStarted }: Props) {
  const [values, setValues] = useState<Record<string, string | boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  const set = (flag: string, value: string | boolean) => setValues((v) => ({ ...v, [flag]: value }));

  async function run(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setStarting(true);
    try {
      const res = await fetch("/api/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tool: toolId, script: script.id, values }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || `Server answered ${res.status}`);
      onStarted(body.run.id);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setStarting(false);
    }
  }

  return (
    <form className="panel" onSubmit={run}>
      <h3>{script.title}</h3>
      <p>{script.summary}</p>
      <div className="fields">
        {script.fields.map((field) => {
          const id = `${script.id}${field.flag}`;
          if (field.type === "bool") {
            return (
              <label key={field.flag} className="check">
                <input type="checkbox" checked={values[field.flag] === true} onChange={(e) => set(field.flag, e.target.checked)} />
                {field.label}
              </label>
            );
          }
          return (
            <div key={field.flag} className="field">
              <label htmlFor={id}>{field.label}</label>
              {field.type === "select" ? (
                <select id={id} value={String(values[field.flag] ?? "")} onChange={(e) => set(field.flag, e.target.value)}>
                  <option value="">Ask in the console</option>
                  {field.options.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  id={id}
                  type="text"
                  autoComplete="off"
                  spellCheck={false}
                  placeholder={field.placeholder}
                  value={String(values[field.flag] ?? "")}
                  onChange={(e) => set(field.flag, e.target.value)}
                />
              )}
            </div>
          );
        })}
      </div>
      <div className="actions">
        <button className="run-button" type="submit" disabled={busy || starting}>
          {starting ? "Starting..." : `Run ${script.title.toLowerCase()}`}
        </button>
        {busy && <span className="empty-note">Wait for the current run to finish, or stop it.</span>}
        {error && <span className="form-error">{error}</span>}
      </div>
    </form>
  );
}
