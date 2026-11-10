// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2026 Russhvith

import { cn } from "@/lib/cn";
import styles from "./ChoiceGroup.module.css";

type Option<T extends string> = { value: T; label: string; tone?: "neutral" | "info" | "warning" };

type Props<T extends string> = {
  options: readonly Option<T>[];
  value: string;
  onChange: (value: T) => void;
  /** What's being chosen, for screen readers. */
  label: string;
  disabled?: boolean;
  invalid?: boolean;
};

/** Pick one of a few values in place. Compact enough to repeat down a list. */
export function ChoiceGroup<T extends string>({ options, value, onChange, label, disabled, invalid }: Props<T>) {
  return (
    <div role="radiogroup" aria-label={label} aria-invalid={invalid || undefined} className={cn(styles.group, invalid && styles.invalid)}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={option.value === value}
          disabled={disabled}
          data-tone={option.tone ?? "neutral"}
          className={styles.option}
          onClick={() => option.value !== value && onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
