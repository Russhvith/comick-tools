// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2026 Russhvith

"use client";

import Link from "next/link";
import { X, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import styles from "./NavItem.module.css";

type Props = {
  icon: LucideIcon;
  label: string;
  detail?: string;
  tone?: "primary" | "destructive" | "success" | "neutral";
  active?: boolean;
  href: string;
  /**
   * Handle a plain click in place instead of navigating, like switching
   * tools without a reload. Ctrl, Cmd, Shift and middle clicks still go to
   * the browser, so opening in a new tab keeps working.
   */
  onSelect?: () => void;
  /** Shown but crossed out, for something the current account can't use. */
  locked?: string;
};

export function NavItem({ icon: Icon, label, detail, tone = "primary", active, href, onSelect, locked }: Props) {
  return (
    <Link
      href={href}
      className={cn(styles.item, active && styles.active, locked && styles.locked)}
      aria-current={active ? "page" : undefined}
      aria-label={locked ? `${label}, ${locked}` : undefined}
      title={locked}
      onClick={(event) => {
        if (!onSelect || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        onSelect();
      }}
    >
      <Icon size={16} aria-hidden className={cn(styles.icon, styles[tone])} />
      <span className={styles.text}>
        <span className={styles.label}>{label}</span>
        {detail && <span className={styles.detail}>{detail}</span>}
      </span>
      {locked && <X size={14} strokeWidth={2.5} aria-hidden className={styles.lockMark} />}
    </Link>
  );
}
