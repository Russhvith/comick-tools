"use client";

import { useRef, useState } from "react";
import { Play } from "lucide-react";
import { Button } from "@/components/atoms/Button";
import { Kbd } from "@/components/atoms/Kbd";
import { Checkbox, Select, TextInput } from "@/components/atoms/TextInput";
import { Card } from "@/components/molecules/Card";
import { Field } from "@/components/molecules/Field";
import { shortcuts } from "@/config/shortcuts";
import { useHotkey } from "@/hooks/useHotkey";
import { startRun } from "@/features/runs/api";
import type { RunSummary } from "@/types/runs";
import type { FieldValues, Script, ToolGroup } from "@/types/tools";
import styles from "./ScriptForm.module.css";

type Props = {
  toolId: string;
  group: ToolGroup;
  script: Script;
  busy: boolean;
  onStarted: (run: RunSummary) => void;
};

export function ScriptForm({ toolId, group, script, busy, onStarted }: Props) {
  const [values, setValues] = useState<FieldValues>({});
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const form = useRef<HTMLFormElement>(null);
  // One key per attempt. A double submit before the first answer comes
  // back reuses it, so the server starts the script once.
  const attemptKey = useRef<string | null>(null);

  const set = (flag: string, value: string | boolean) => setValues((v) => ({ ...v, [flag]: value }));

  async function submit(event?: React.FormEvent) {
    event?.preventDefault();
    if (busy) return;
    attemptKey.current ??= crypto.randomUUID();
    setError(null);
    setStarting(true);
    try {
      onStarted(await startRun(toolId, script.id, values, attemptKey.current));
      attemptKey.current = null;
    } catch (e) {
      setError((e as Error).message);
      attemptKey.current = null;
    } finally {
      setStarting(false);
    }
  }

  useHotkey(shortcuts.runScript.combo, () => form.current?.requestSubmit());

  const toggles = script.fields.filter((f) => f.type === "bool");
  const inputs = script.fields.filter((f) => f.type !== "bool");

  return (
    <Card title={script.title} description={script.summary}>
      <form ref={form} onSubmit={submit} className={styles.form}>
        {inputs.length > 0 && (
          <div className={styles.grid}>
            {inputs.map((field) => (
              <Field key={field.flag} label={field.label}>
                {(id) =>
                  field.type === "select" ? (
                    <Select id={id} value={String(values[field.flag] ?? "")} onChange={(e) => set(field.flag, e.target.value)}>
                      <option value="">Ask in the console</option>
                      {field.options.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </Select>
                  ) : (
                    <TextInput
                      id={id}
                      placeholder={field.type === "text" ? field.placeholder : undefined}
                      value={String(values[field.flag] ?? "")}
                      onChange={(e) => set(field.flag, e.target.value)}
                    />
                  )
                }
              </Field>
            ))}
          </div>
        )}
        {toggles.length > 0 && (
          <div className={styles.toggles}>
            {toggles.map((field) => (
              <Checkbox
                key={field.flag}
                label={field.label}
                checked={values[field.flag] === true}
                onChange={(e) => set(field.flag, e.target.checked)}
              />
            ))}
          </div>
        )}
        <footer className={styles.footer}>
          <Button type="submit" size="lg" variant={group === "admin" ? "danger" : "primary"} loading={starting} disabled={busy}>
            {!starting && <Play size={14} aria-hidden fill="currentColor" />}
            {starting ? "Starting" : `Run ${script.title.toLowerCase()}`}
          </Button>
          <span className={styles.hint}>
            <Kbd keys={shortcuts.runScript.keys} />
          </span>
          {busy && !starting && <span className={styles.note}>Another run is going. Stop it or wait for it to finish.</span>}
          {error && (
            <span className={styles.error} role="alert">
              {error}
            </span>
          )}
        </footer>
      </form>
    </Card>
  );
}
