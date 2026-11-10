// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2026 Russhvith

import type { ButtonHTMLAttributes } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import styles from "./IconButton.module.css";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  icon: LucideIcon;
  /** Required, it's the only text a screen reader gets. */
  label: string;
  tone?: "default" | "danger";
};

export function IconButton({ icon: Icon, label, tone = "default", className, ...rest }: Props) {
  return (
    <button type="button" aria-label={label} title={label} className={cn(styles.iconButton, styles[tone], className)} {...rest}>
      <Icon size={16} aria-hidden />
    </button>
  );
}
