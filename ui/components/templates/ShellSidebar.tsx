// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2026 Russhvith

"use client";

import { useEffect, useId, useState, type MouseEvent, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { ChevronDown, Menu } from "lucide-react";
import styles from "./AppShell.module.css";

/**
 * The sidebar, which on a phone folds behind a Menu button so the page
 * starts with its own content rather than a screen of links. Wider
 * screens never see the button and get the sidebar as before.
 */
export function ShellSidebar({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const pathname = usePathname();

  // A new page means the menu did its job.
  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  // Picking a link closes it even when the link stays on this page.
  const onPanelClick = (event: MouseEvent) => {
    if ((event.target as HTMLElement).closest("a")) setOpen(false);
  };

  return (
    <div className={styles.sidebar} data-open={open}>
      <button type="button" className={styles.menuButton} aria-expanded={open} aria-controls={panelId} onClick={() => setOpen((v) => !v)}>
        <Menu size={16} aria-hidden />
        Menu
        <ChevronDown size={16} aria-hidden className={styles.menuChevron} />
      </button>
      <div id={panelId} className={styles.sidebarPanel} onClick={onPanelClick}>
        {children}
      </div>
    </div>
  );
}
