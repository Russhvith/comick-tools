// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2026 Russhvith

import styles from "./Spinner.module.css";

export function Spinner({ size = 16 }: { size?: number }) {
  return <span className={styles.spinner} style={{ width: size, height: size }} aria-hidden />;
}
