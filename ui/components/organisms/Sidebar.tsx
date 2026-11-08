import type { ReactNode } from "react";
import styles from "./Sidebar.module.css";

export function Sidebar({ children, label }: { children: ReactNode; label: string }) {
  return (
    <nav className={styles.sidebar} aria-label={label}>
      {children}
    </nav>
  );
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
