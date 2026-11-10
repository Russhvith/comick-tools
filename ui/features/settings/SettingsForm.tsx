// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2026 Russhvith

"use client";

import { useState } from "react";
import { CircleCheck, KeyRound, Trash2 } from "lucide-react";
import { Button } from "@/components/atoms/Button";
import { TextInput } from "@/components/atoms/TextInput";
import { Field } from "@/components/molecules/Field";
import { site } from "@/config/site";
import { HttpError } from "@/lib/http";
import type { Settings, SettingsUpdate } from "@/types/settings";
import { useSettings } from "./useSettings";
import styles from "./SettingsForm.module.css";

type Props = {
  settings: Settings;
  /** Called once a save has gone through. */
  onSaved?: () => void;
  /** Text on the save button, like "Save and continue" in the first-run dialog. */
  saveLabel?: string;
  /** Extra buttons next to save, like "Later". */
  extra?: React.ReactNode;
};

/** The .env settings people need, with the cookie handled carefully. */
export function SettingsForm({ settings, onSaved, saveLabel = "Save", extra }: Props) {
  const { save } = useSettings();
  // The cookie is never sent back from the server, so its box starts empty
  // and only a new value replaces the saved one.
  const [cookie, setCookie] = useState("");
  const [uploads, setUploads] = useState(settings.uploadsPerSecond);
  const [requests, setRequests] = useState(settings.requestsPerMinute);
  const [apiBase, setApiBase] = useState(settings.apiBase);
  const [busy, setBusy] = useState(false);
  const [problems, setProblems] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function submit(update: SettingsUpdate) {
    setBusy(true);
    setError(null);
    setProblems({});
    setSaved(false);
    try {
      await save(update);
      setCookie("");
      setSaved(true);
      onSaved?.();
    } catch (e) {
      if (e instanceof HttpError && e.body.problems) setProblems(e.body.problems as Record<string, string>);
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function saveAll(event: React.FormEvent) {
    event.preventDefault();
    const update: SettingsUpdate = { uploadsPerSecond: uploads, requestsPerMinute: requests, apiBase };
    if (cookie.trim()) update.cookie = cookie;
    void submit(update);
  }

  return (
    <form className={styles.form} onSubmit={saveAll}>
      <section className={styles.group}>
        <div className={styles.groupHead}>
          <KeyRound size={16} aria-hidden />
          <h3>ComicK session cookie</h3>
          {settings.cookie.set ? (
            <span className={styles.status} data-ok="true">
              <CircleCheck size={13} aria-hidden /> Saved, {settings.cookie.length} characters
            </span>
          ) : (
            <span className={styles.status}>Not set yet</span>
          )}
        </div>
        <Field
          label={settings.cookie.set ? "Replace it" : "Cookie value"}
          hint="The value of __Secure-comick-auth.session_token from a browser signed in to comick.dev."
          error={problems.cookie}
        >
          {(id, note) => (
            <TextInput
              id={id}
              type="password"
              autoComplete="off"
              placeholder={settings.cookie.set ? "Leave empty to keep the saved one" : "Paste the cookie value here"}
              value={cookie}
              aria-describedby={note}
              aria-invalid={!!problems.cookie}
              onChange={(e) => setCookie(e.target.value)}
            />
          )}
        </Field>
        <p className={styles.help}>
          It&apos;s saved in .env on this computer and only ever sent to ComicK&apos;s API.{" "}
          <a href={`${site.repoUrl}/blob/main/docs/auth.md`} target="_blank" rel="noreferrer">
            How to copy it
          </a>
        </p>
        {settings.cookie.set && (
          <div>
            <Button variant="ghost" size="sm" onClick={() => void submit({ cookie: "" })} disabled={busy}>
              <Trash2 size={14} aria-hidden /> Remove the saved cookie
            </Button>
          </div>
        )}
      </section>

      <section className={styles.group}>
        <div className={styles.groupHead}>
          <h3>Speed limits</h3>
        </div>
        <div className={styles.grid}>
          <Field label="Requests a second" hint={`Empty uses ${settings.defaults.uploadsPerSecond}.`} error={problems.uploadsPerSecond}>
            {(id, note) => (
              <TextInput
                id={id}
                inputMode="decimal"
                placeholder={settings.defaults.uploadsPerSecond}
                value={uploads}
                aria-describedby={note}
                aria-invalid={!!problems.uploadsPerSecond}
                onChange={(e) => setUploads(e.target.value)}
              />
            )}
          </Field>
          <Field label="Requests a minute" hint={`Empty uses ${settings.defaults.requestsPerMinute}, ComicK's limit.`} error={problems.requestsPerMinute}>
            {(id, note) => (
              <TextInput
                id={id}
                inputMode="numeric"
                placeholder={settings.defaults.requestsPerMinute}
                value={requests}
                aria-describedby={note}
                aria-invalid={!!problems.requestsPerMinute}
                onChange={(e) => setRequests(e.target.value)}
              />
            )}
          </Field>
        </div>
      </section>

      <details className={styles.advanced} open={!!settings.apiBase || !!problems.apiBase}>
        <summary>Advanced</summary>
        <Field
          label="ComicK API address"
          hint="Only change this to test against your own ComicK server. The cookie is sent wherever this points."
          error={problems.apiBase}
        >
          {(id, note) => (
            <TextInput
              id={id}
              placeholder={settings.defaults.apiBase}
              value={apiBase}
              aria-describedby={note}
              aria-invalid={!!problems.apiBase}
              onChange={(e) => setApiBase(e.target.value)}
            />
          )}
        </Field>
      </details>

      <footer className={styles.footer}>
        {error && !Object.keys(problems).length && (
          <span className={styles.error} role="alert">
            {error}
          </span>
        )}
        {saved && !error && <span className={styles.saved}>Saved to .env</span>}
        {extra}
        <Button type="submit" variant="primary" loading={busy}>
          {saveLabel}
        </Button>
      </footer>
    </form>
  );
}
