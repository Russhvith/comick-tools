// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2026 Russhvith

import type { ReactNode } from "react";
import styles from "./Sidebar.module.css";

type Props = {
  children: ReactNode;
  label: string;
  /** Pinned to the bottom of the sidebar, under the navigation. */
  footer?: ReactNode;
};

export function Sidebar({ children, label, footer }: Props) {
  return (
    <div className={styles.sidebar}>
      <nav className={styles.items} aria-label={label}>
        {children}
      </nav>
      {footer && <footer className={styles.footer}>{footer}</footer>}
    </div>
  );
}

/** Items with no heading, like Home above the tool groups. */
export function SidebarList({ children }: { children: ReactNode }) {
  return <ul className={styles.list}>{children}</ul>;
}

export function SidebarSection({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return (
    <section className={styles.section}>
      <h2 className={styles.title}>{title}</h2>
      {note && <p className={styles.note}>{note}</p>}
      <ul className={styles.list}>{children}</ul>
    </section>
  );
}
