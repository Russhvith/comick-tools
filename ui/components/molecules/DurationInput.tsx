"use client";

import { useEffect, useId, useState } from "react";
import { TextInput } from "@/components/atoms/TextInput";
import { cn } from "@/lib/cn";
import styles from "./DurationInput.module.css";

type Parts = { h: string; m: string; s: string };

type Props = {
  label: string;
  /** "m:ss" or "h:mm:ss", the way output.txt writes it. */
  value: string;
  onChange: (value: string) => void;
  /** About the duration as a whole, shown when no single slot is wrong. */
  error?: string;
  hint?: string;
};

function split(value: string): Parts {
  const parts = value.trim() ? value.trim().split(":") : [];
  if (parts.length === 3) return { h: parts[0], m: parts[1], s: parts[2] };
  if (parts.length === 2) return { h: "", m: parts[0], s: parts[1] };
  return { h: "", m: parts[0] ?? "", s: "" };
}

function join({ h, m, s }: Parts): string {
  if (!h && !m && !s) return "";
  const pad = (x: string) => (x || "0").padStart(2, "0");
  return Number(h) > 0 ? `${Number(h)}:${pad(m)}:${pad(s)}` : `${m ? Number(m) : 0}:${pad(s)}`;
}

const slots = [
  { key: "h", label: "Hours", max: 24, placeholder: "0" },
  { key: "m", label: "Minutes", max: 59, placeholder: "00" },
  { key: "s", label: "Seconds", max: 59, placeholder: "00" },
] as const;

/** Hours, minutes and seconds in their own boxes, each checked on its own. */
export function DurationInput({ label, value, onChange, error, hint }: Props) {
  const id = useId();
  // The slots keep exactly what was typed, so "0" doesn't jump to "00"
  // mid edit. They only resync when the value changes from outside, like
  // stepping to another episode.
  const [parts, setParts] = useState(() => split(value));
  useEffect(() => {
    if (join(parts) !== value) setParts(split(value));
    // parts is ours, only an outside value should trigger a resync.
  }, [value]);

  const slotError = (key: keyof Parts, max: number) => {
    const n = Number(parts[key]);
    return parts[key] !== "" && n > max ? (max === 24 ? "Up to 24" : "0 to 59") : undefined;
  };
  const errors = slots.map((slot) => slotError(slot.key, slot.max));
  const overall = errors.some(Boolean) ? undefined : error;
  const note = overall ?? hint;

  function set(key: keyof Parts, raw: string) {
    const next = { ...parts, [key]: raw.replace(/\D/g, "").slice(0, 2) };
    setParts(next);
    onChange(join(next));
  }

  return (
    <fieldset className={styles.fieldset} aria-describedby={note ? `${id}-note` : undefined}>
      <legend className={styles.legend}>{label}</legend>
      <div className={styles.slots}>
        {slots.map((slot, i) => (
          <div key={slot.key} className={styles.slot}>
            <label htmlFor={`${id}-${slot.key}`} className={styles.slotLabel}>
              {slot.label}
            </label>
            <TextInput
              id={`${id}-${slot.key}`}
              inputMode="numeric"
              placeholder={slot.placeholder}
              value={parts[slot.key]}
              aria-invalid={!!errors[i] || (!!overall && !errors.some(Boolean))}
              aria-describedby={errors[i] ? `${id}-${slot.key}-error` : undefined}
              onChange={(e) => set(slot.key, e.target.value)}
            />
            {errors[i] && (
              <p id={`${id}-${slot.key}-error`} className={styles.slotError}>
                {errors[i]}
              </p>
            )}
          </div>
        ))}
      </div>
      {note && (
        <p id={`${id}-note`} className={cn(styles.note, overall && styles.error)}>
          {note}
        </p>
      )}
    </fieldset>
  );
}
