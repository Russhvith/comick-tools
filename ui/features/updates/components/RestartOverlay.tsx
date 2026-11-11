// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2026 Russhvith

import { Spinner } from "@/components/atoms/Spinner";
import styles from "./RestartOverlay.module.css";

export function RestartOverlay({ title = "Restarting on the new version" }: { title?: string }) {
  return (
    <div className={styles.overlay} role="status">
      <div className={styles.card}>
        <Spinner size={20} />
        <div>
          <h2 className={styles.title}>{title}</h2>
          <p className={styles.text}>The page reloads by itself once the server is back.</p>
        </div>
      </div>
    </div>
  );
}
