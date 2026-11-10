// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2026 Russhvith

import type { CSSProperties } from "react";
import styles from "./Skeleton.module.css";

export function Skeleton({ width = "100%", height = "1rem", style }: { width?: string; height?: string; style?: CSSProperties }) {
  return <span className={styles.skeleton} style={{ width, height, ...style }} aria-hidden />;
}
