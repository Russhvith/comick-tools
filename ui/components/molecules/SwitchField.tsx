// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2026 Russhvith

import { useId } from "react";
import { Switch } from "@/components/atoms/Switch";
import styles from "./SwitchField.module.css";

type Props = {
  label: string;
  /** What turning it on does, in a line or two. */
  hint?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
};

/** A setting row: name and description on the left, the switch on the right. */
export function SwitchField({ label, hint, checked, onChange, disabled }: Props) {
  const hintId = useId();
  return (
    <label className={styles.row}>
      <span className={styles.text}>
        <span className={styles.label}>{label}</span>
        {hint && (
          <span id={hintId} className={styles.hint}>
            {hint}
          </span>
        )}
      </span>
      <Switch checked={checked} disabled={disabled} aria-describedby={hint ? hintId : undefined} onChange={(e) => onChange(e.target.checked)} />
    </label>
  );
}
