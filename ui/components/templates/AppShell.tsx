// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2026 Russhvith

import type { ReactNode } from "react";
import styles from "./AppShell.module.css";
import { ShellSidebar } from "./ShellSidebar";

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
      <div className={styles.body} data-aside={aside ? "true" : "false"}>
        <ShellSidebar>{sidebar}</ShellSidebar>
        <main className={styles.main}>{children}</main>
        {aside && <aside className={styles.aside}>{aside}</aside>}
      </div>
    </div>
  );
}
