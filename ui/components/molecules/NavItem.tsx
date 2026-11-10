"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
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
};

export function NavItem({ icon: Icon, label, detail, tone = "primary", active, href, onSelect }: Props) {
  return (
    <Link
      href={href}
      className={cn(styles.item, active && styles.active)}
      aria-current={active ? "page" : undefined}
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
    </Link>
  );
}
