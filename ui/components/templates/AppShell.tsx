import type { ReactNode } from "react";
import styles from "./AppShell.module.css";

type Props = {
  header: ReactNode;
  sidebar: ReactNode;
  aside?: ReactNode;
  children: ReactNode;
};

/** ComicK's layout: sticky bar on top, nav on the left, extras on the right. */
export function AppShell({ header, sidebar, aside, children }: Props) {
  return (
    <div className={styles.shell}>
      {header}
      <div className={styles.body}>
        <div className={styles.sidebar}>{sidebar}</div>
        <main className={styles.main}>{children}</main>
        {aside && <aside className={styles.aside}>{aside}</aside>}
      </div>
    </div>
  );
}
