"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Image as ImageIcon, ImageOff, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/atoms/Button";
import { IconButton } from "@/components/atoms/IconButton";
import { Thumbnail } from "@/components/atoms/Thumbnail";
import { Select, TextArea, TextInput } from "@/components/atoms/TextInput";
import { ChoiceGroup } from "@/components/molecules/ChoiceGroup";
import { DurationInput } from "@/components/molecules/DurationInput";
import { Field } from "@/components/molecules/Field";
import { Modal } from "@/components/organisms/Modal";
import {
  checkEpisode,
  episodeBlockText,
  hasProblems,
  readEpisode,
  TITLE_LANGUAGES,
  writeEpisode,
  type EpisodeDetails,
  type EpisodeRow,
} from "../parse";
import styles from "./EpisodeEditor.module.css";

const typeOptions = [
  { value: "main", label: "Main" },
  { value: "recap", label: "Recap", tone: "info" },
  { value: "filler", label: "Filler", tone: "warning" },
] as const;

type Props = {
  /** The whole output.txt as it is right now. */
  content: string;
  rows: EpisodeRow[];
  /** Which episode is open, or null when closed. */
  index: number | null;
  onIndexChange: (index: number | null) => void;
  /** Writes the new file. Resolves once the server has it. */
  onSave: (next: string, number: string) => Promise<void>;
  /** Image URL for a Preview value, or null when it isn't a local file. */
  imageSrc: (preview: string) => string | null;
};

const same = (a: EpisodeDetails | null, b: EpisodeDetails | null) => JSON.stringify(a) === JSON.stringify(b);

/** Digits and a single decimal point, which is all an episode number can be. */
function numberOnly(value: string) {
  const [whole, ...rest] = value.replace(/[^\d.]/g, "").split(".");
  return rest.length ? `${whole}.${rest.join("")}` : whole;
}

export function EpisodeEditor({ content, rows, index, onIndexChange, onSave, imageSrc }: Props) {
  const [draft, setDraft] = useState<EpisodeDetails | null>(null);
  const [saved, setSaved] = useState<EpisodeDetails | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [askDiscard, setAskDiscard] = useState(false);
  const [changedOutside, setChangedOutside] = useState(false);
  // The episode's text when we loaded it, to tell our own saves apart from
  // a format run rewriting the file underneath us.
  const loadedText = useRef<string | null>(null);

  const dirty = !same(draft, saved);

  function load(at: number) {
    const details = readEpisode(content, at);
    loadedText.current = episodeBlockText(content, at);
    setDraft(details);
    setSaved(details);
    setError(null);
    setAskDiscard(false);
    setChangedOutside(false);
  }

  // Load on open and when stepping to another episode.
  useEffect(() => {
    if (index !== null) load(index);
    else loadedText.current = null;
    // Only the index decides what to load. Content changes go through the
    // effect below so edits in progress aren't thrown away.
  }, [index]);

  useEffect(() => {
    if (index === null || loadedText.current === null) return;
    if (episodeBlockText(content, index) === loadedText.current) return;
    if (dirty) setChangedOutside(true);
    else load(index);
  }, [content]);

  const others = useMemo(() => rows.filter((r) => r.index !== index).map((r) => r.number), [rows, index]);
  const problems = useMemo(() => (draft ? checkEpisode(draft, others) : {}), [draft, others]);
  const invalid = hasProblems(problems);

  const edit = (patch: Partial<EpisodeDetails>) => setDraft((d) => (d ? { ...d, ...patch } : d));
  const editTitle = (i: number, value: string) =>
    setDraft((d) => (d ? { ...d, titles: d.titles.map((t, n) => (n === i ? { ...t, value } : t)) } : d));

  async function save(): Promise<boolean> {
    if (index === null || !draft) return false;
    if (!dirty) return true;
    if (invalid || changedOutside) return false;
    const next = writeEpisode(content, index, draft);
    setSaving(true);
    setError(null);
    loadedText.current = episodeBlockText(next, index);
    try {
      await onSave(next, draft.number);
      const reread = readEpisode(next, index);
      setDraft(reread);
      setSaved(reread);
      return true;
    } catch (e) {
      loadedText.current = episodeBlockText(content, index);
      setError((e as Error).message);
      return false;
    } finally {
      setSaving(false);
    }
  }

  // Stepping saves first, so going through a season one by one doesn't
  // need a save click per episode.
  async function step(to: number) {
    if (await save()) onIndexChange(to);
  }

  function requestClose() {
    if (dirty) setAskDiscard(true);
    else onIndexChange(null);
  }

  if (index === null || !draft) return <Modal open={false} title="" onRequestClose={() => {}}>{null}</Modal>;

  const usedLanguages = new Set(draft.titles.map((t) => t.language.toLowerCase()));
  const freeLanguages = TITLE_LANGUAGES.filter((l) => !usedLanguages.has(l.toLowerCase()));
  const previewIsLink = /^https?:\/\//i.test(draft.preview.trim());
  const heroSrc = imageSrc(draft.preview);
  const position = rows.findIndex((r) => r.index === index);
  const blockedStep = saving || (dirty && (invalid || changedOutside));

  const footer = askDiscard ? (
    <>
      <span className={styles.footNote}>Discard the changes to this episode?</span>
      <Button variant="ghost" onClick={() => setAskDiscard(false)} autoFocus>
        Keep editing
      </Button>
      <Button variant="danger" onClick={() => onIndexChange(null)}>
        Discard
      </Button>
    </>
  ) : (
    <>
      <span className={styles.footNote}>
        {error ? (
          <span className={styles.error}>Couldn&apos;t save: {error}</span>
        ) : dirty ? (
          invalid ? "Fix the fields in red to save." : "Unsaved changes."
        ) : (
          "All saved to output.txt."
        )}
      </span>
      <Button variant="ghost" onClick={requestClose}>
        {dirty ? "Cancel" : "Close"}
      </Button>
      <Button variant="primary" onClick={() => void save()} disabled={!dirty || invalid || changedOutside} loading={saving}>
        Save
      </Button>
    </>
  );

  return (
    <Modal
      open
      title={`Episode ${draft.number || "?"}`}
      subtitle={draft.titles.find((t) => t.language.toLowerCase() === "english")?.value || "No English title"}
      onRequestClose={requestClose}
      actions={
        <>
          <span className={styles.position}>
            {position + 1} of {rows.length}
          </span>
          <IconButton
            icon={ChevronLeft}
            label="Previous episode"
            disabled={position <= 0 || blockedStep}
            onClick={() => void step(rows[position - 1].index)}
          />
          <IconButton
            icon={ChevronRight}
            label="Next episode"
            disabled={position >= rows.length - 1 || blockedStep}
            onClick={() => void step(rows[position + 1].index)}
          />
        </>
      }
      footer={footer}
    >
      <form
        className={styles.form}
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        {changedOutside && (
          <div className={styles.banner} role="alert">
            <span>output.txt changed while this was open, probably a new format run.</span>
            <Button size="sm" onClick={() => load(index)}>
              Load the new version
            </Button>
          </div>
        )}

        {heroSrc ? (
          <figure className={styles.hero}>
            <Thumbnail key={heroSrc} src={heroSrc} alt={`Preview of episode ${draft.number}`} loading="eager" className={styles.heroImage} />
            <figcaption className={styles.heroCaption}>
              <ImageIcon size={13} aria-hidden />
              {draft.preview.trim()}
            </figcaption>
          </figure>
        ) : (
          <div className={styles.noHero}>
            <ImageOff size={18} aria-hidden />
            <span>
              {previewIsLink
                ? "The preview wasn't downloaded, so this episode uploads without one."
                : "No preview image, so this episode uploads without one."}
            </span>
          </div>
        )}

        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Episode</h3>
          <div className={styles.split}>
            <Field label="Number" error={problems.number}>
              {(id, note) => (
                <TextInput
                  id={id}
                  inputMode="decimal"
                  value={draft.number}
                  aria-invalid={!!problems.number}
                  aria-describedby={note}
                  onChange={(e) => edit({ number: numberOnly(e.target.value) })}
                />
              )}
            </Field>
            <div className={styles.typeField}>
              <span className={styles.fakeLabel}>Type</span>
              <ChoiceGroup
                label="Episode type"
                options={typeOptions}
                value={draft.type}
                invalid={!!problems.type}
                onChange={(type) => edit({ type })}
              />
              {problems.type && <p className={styles.fieldError}>{problems.type}</p>}
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Titles</h3>
          {draft.titles.map((title, i) => {
            const english = title.language.toLowerCase() === "english";
            return (
              <div key={i} className={styles.titleRow}>
                <Field
                  label={`${title.language} title`}
                  error={problems.title?.[i] ?? (english ? problems.titles : undefined)}
                  aside={title.value.length > 200 ? `${title.value.length}/255` : undefined}
                >
                  {(id, note) => (
                    <TextInput
                      id={id}
                      value={title.value}
                      aria-invalid={!!problems.title?.[i] || (english && !!problems.titles)}
                      aria-describedby={note}
                      onChange={(e) => editTitle(i, e.target.value)}
                    />
                  )}
                </Field>
                {!english && (
                  <IconButton
                    icon={Trash2}
                    tone="danger"
                    label={`Remove the ${title.language} title`}
                    className={styles.remove}
                    onClick={() => edit({ titles: draft.titles.filter((_, n) => n !== i) })}
                  />
                )}
              </div>
            );
          })}
          {!draft.titles.some((t) => t.language.toLowerCase() === "english") && (
            <p className={styles.fieldError}>{problems.titles}</p>
          )}
          {freeLanguages.length > 0 && (
            <label className={styles.addTitle}>
              <Plus size={14} aria-hidden />
              <Select
                aria-label="Add a title in another language"
                value=""
                onChange={(e) => e.target.value && edit({ titles: [...draft.titles, { language: e.target.value, value: "" }] })}
              >
                <option value="">Add a title in another language</option>
                {freeLanguages.map((language) => (
                  <option key={language} value={language}>
                    {language}
                  </option>
                ))}
              </Select>
            </label>
          )}
        </section>

        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Details</h3>
          <div className={styles.dateRow}>
            <Field label="Aired date" error={problems.aired}>
              {(id, note) => (
                <TextInput
                  id={id}
                  type="date"
                  className={styles.date}
                  value={draft.aired}
                  aria-invalid={!!problems.aired}
                  aria-describedby={note}
                  // The calendar only opens from the small icon by default,
                  // so open it from anywhere in the box.
                  onClick={(e) => e.currentTarget.showPicker?.()}
                  onChange={(e) => edit({ aired: e.target.value })}
                />
              )}
            </Field>
            <DurationInput label="Duration" value={draft.duration} error={problems.duration} onChange={(duration) => edit({ duration })} />
          </div>
          <Field
            label="Description"
            hint="Line breaks become spaces, since every field has to fit on one line."
            error={problems.description}
            aside={`${draft.description.length.toLocaleString("en-US")} / 10,000`}
          >
            {(id, note) => (
              <TextArea
                id={id}
                rows={5}
                value={draft.description}
                aria-invalid={!!problems.description}
                aria-describedby={note}
                onChange={(e) => edit({ description: e.target.value })}
              />
            )}
          </Field>
        </section>

        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Links</h3>
          <Field
            label="Preview image"
            hint={
              previewIsLink
                ? "This is a link, so the episode uploads without a preview. Format again without skipping images to get one."
                : draft.preview.trim()
                  ? "A file next to output.txt, uploaded with the episode."
                  : "Empty, so the episode uploads without a preview."
            }
          >
            {(id, note) => (
              <TextInput
                id={id}
                placeholder="images/1.png"
                value={draft.preview}
                aria-describedby={note}
                onChange={(e) => edit({ preview: e.target.value })}
              />
            )}
          </Field>
          <Field label="Source" hint="Where reviewers can check the episode." error={problems.source}>
            {(id, note) => (
              <TextInput
                id={id}
                placeholder="https://www.crunchyroll.com/watch/..."
                value={draft.source}
                aria-invalid={!!problems.source}
                aria-describedby={note}
                onChange={(e) => edit({ source: e.target.value })}
              />
            )}
          </Field>
          {draft.extra.map((entry, i) => (
            <Field key={`${entry.key}-${i}`} label={entry.key}>
              {(id) => (
                <TextInput
                  id={id}
                  value={entry.value}
                  onChange={(e) => edit({ extra: draft.extra.map((x, n) => (n === i ? { ...x, value: e.target.value } : x)) })}
                />
              )}
            </Field>
          ))}
        </section>

        <button type="submit" hidden aria-hidden tabIndex={-1} />
      </form>
    </Modal>
  );
}
