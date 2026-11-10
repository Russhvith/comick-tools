// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2026 Russhvith

"use client";

import { CornerDownRight } from "lucide-react";
import { TextArea, TextInput } from "@/components/atoms/TextInput";
import { Field } from "@/components/molecules/Field";
import { cn } from "@/lib/cn";
import { slugFrom } from "@/lib/slug";
import type { Field as ScriptField } from "@/types/tools";
import styles from "./ScriptTextField.module.css";

type TextField = Extract<ScriptField, { type: "text" }>;

/**
 * How long the value is once the script has added its own text after it.
 * The scripts end the typed part with a full stop when it has none, so the
 * credit reads as its own sentence, and that counts too.
 */
export function sentLength(field: TextField, value: string): number {
  const own = value.trim();
  if (!field.appended) return own.length;
  if (!own) return field.appended.length;
  const stop = /[.!?]$/.test(own) ? 0 : 1;
  return own.length + stop + 1 + field.appended.length;
}

export function overLimit(field: TextField, value: string): boolean {
  return field.maxLength !== undefined && sentLength(field, value) > field.maxLength;
}

type Props = {
  field: TextField;
  value: string;
  onChange: (value: string) => void;
};

export function ScriptTextField({ field, value, onChange }: Props) {
  const length = sentLength(field, value);
  const over = overLimit(field, value);
  const change = (text: string) => onChange(field.slugFrom ? slugFrom(text, field.slugFrom) : text);

  const counter = field.maxLength ? (
    <span className={cn(over && styles.over)}>
      {length.toLocaleString("en-US")} / {field.maxLength.toLocaleString("en-US")}
    </span>
  ) : undefined;
  const error = over ? `${(length - field.maxLength!).toLocaleString("en-US")} characters too long, counting the credit added at the end` : undefined;

  return (
    <Field label={field.label} hint={field.hint} error={error} aside={counter} className={cn((field.multiline || field.prefix) && styles.wide, field.prefix && styles.prefixed)}>
      {(id, note) =>
        field.multiline ? (
          <div className={cn(styles.composer, over && styles.composerOver)}>
            <TextArea
              id={id}
              rows={3}
              placeholder={field.placeholder}
              value={value}
              aria-invalid={over}
              aria-describedby={note}
              className={styles.area}
              onChange={(e) => change(e.target.value)}
            />
            {field.appended && (
              <div className={styles.appended}>
                <CornerDownRight size={13} aria-hidden className={styles.appendedIcon} />
                <span>
                  <span className={styles.appendedLabel}>Added at the end</span>
                  {field.appended}
                </span>
              </div>
            )}
          </div>
        ) : field.prefix ? (
          <div className={styles.group}>
            <span className={styles.prefix} aria-hidden>
              {field.prefix}
            </span>
            <TextInput
              id={id}
              placeholder={field.placeholder}
              value={value}
              aria-describedby={note}
              className={styles.groupInput}
              onChange={(e) => change(e.target.value)}
            />
          </div>
        ) : (
          <TextInput id={id} placeholder={field.placeholder} value={value} aria-describedby={note} onChange={(e) => change(e.target.value)} />
        )
      }
    </Field>
  );
}
