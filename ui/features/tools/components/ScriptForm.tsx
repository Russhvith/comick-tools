"use client";

import { useRef, useState } from "react";
import { Play } from "lucide-react";
import { Button } from "@/components/atoms/Button";
import { Kbd } from "@/components/atoms/Kbd";
import { Select } from "@/components/atoms/TextInput";
import { Card } from "@/components/molecules/Card";
import { Field } from "@/components/molecules/Field";
import { SwitchField } from "@/components/molecules/SwitchField";
import { overLimit, ScriptTextField } from "./ScriptTextField";
import { ConfirmDialog } from "@/components/organisms/ConfirmDialog";
import { shortcuts } from "@/config/shortcuts";
import { isMac, useHotkey } from "@/hooks/useHotkey";
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
  /** Drop the card and title, for a form that sits inside a step. */
  bare?: boolean;
  /** Something to confirm before running, like output the run would replace. */
  guard?: string | null;
  /**
   * Ctrl Enter runs this form from anywhere on the page. Turn off when
   * several forms share a page, and it only applies while one has focus.
   */
  hotkey?: boolean;
};

export function ScriptForm({ toolId, group, script, busy, onStarted, bare, guard, hotkey = true }: Props) {
  const [values, setValues] = useState<FieldValues>({});
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const form = useRef<HTMLFormElement>(null);
  // One key per attempt. A double submit before the first answer comes
  // back reuses it, so the server starts the script once.
  const attemptKey = useRef<string | null>(null);

  const set = (flag: string, value: string | boolean) => setValues((v) => ({ ...v, [flag]: value }));

  async function start() {
    attemptKey.current ??= crypto.randomUUID();
    setError(null);
    setStarting(true);
    try {
      onStarted(await startRun(toolId, script.id, values, attemptKey.current));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      attemptKey.current = null;
      setStarting(false);
    }
  }

  // The script would refuse it anyway, after starting up and checking the
  // cookie, so stop it here where the counter already shows why.
  const tooLong = script.fields.find((f) => f.type === "text" && overLimit(f, String(values[f.flag] ?? "")));

  function submit(event?: React.FormEvent) {
    event?.preventDefault();
    if (busy || starting) return;
    if (tooLong) {
      setError(`${tooLong.label} is too long`);
      return;
    }
    if (guard) setConfirming(true);
    else void start();
  }

  useHotkey(shortcuts.runScript.combo, () => form.current?.requestSubmit(), hotkey);

  function onKeyDown(event: React.KeyboardEvent) {
    if (hotkey) return;
    const mod = isMac() ? event.metaKey : event.ctrlKey;
    if (mod && event.key === "Enter") {
      event.preventDefault();
      form.current?.requestSubmit();
    }
  }

  const toggles = script.fields.filter((f) => f.type === "bool");
  const inputs = script.fields.filter((f) => f.type !== "bool");

  const body = (
    <form ref={form} onSubmit={submit} onKeyDown={onKeyDown} className={styles.form}>
      {inputs.length > 0 && (
        <div className={styles.grid}>
          {inputs.map((field) =>
            field.type === "select" ? (
              <Field key={field.flag} label={field.label} hint={field.hint}>
                {(id) => (
                  <Select id={id} value={String(values[field.flag] ?? "")} onChange={(e) => set(field.flag, e.target.value)}>
                    <option value="">Ask in the console</option>
                    {field.options.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
            ) : field.type === "text" ? (
              <ScriptTextField key={field.flag} field={field} value={String(values[field.flag] ?? "")} onChange={(v) => set(field.flag, v)} />
            ) : null,
          )}
        </div>
      )}
      {toggles.length > 0 && (
        <div className={styles.toggles}>
          {toggles.map((field) => (
            <SwitchField
              key={field.flag}
              label={field.label}
              hint={field.hint}
              checked={values[field.flag] === true}
              onChange={(on) => set(field.flag, on)}
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
  );

  // Outside the form, so nothing in the dialog can submit it.
  const confirm = (
    <ConfirmDialog
      open={confirming}
      title={`Run ${script.title.toLowerCase()}?`}
      confirmLabel="Run anyway"
      onCancel={() => setConfirming(false)}
      onConfirm={() => {
        setConfirming(false);
        void start();
      }}
    >
      <p>{guard}</p>
    </ConfirmDialog>
  );

  if (bare) {
    return (
      <div className={styles.bare}>
        <p className={styles.summary}>{script.summary}</p>
        {body}
        {confirm}
      </div>
    );
  }
  return (
    <Card title={script.title} description={script.summary}>
      {body}
      {confirm}
    </Card>
  );
}
