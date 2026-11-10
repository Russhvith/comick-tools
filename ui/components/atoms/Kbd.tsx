// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2026 Russhvith

"use client";

import { useEffect, useState } from "react";
import { isMac } from "@/hooks/useHotkey";
import styles from "./Kbd.module.css";

/** Keyboard hint. "Mod" shows as Ctrl or the Mac command key. */
export function Kbd({ keys }: { keys: readonly string[] }) {
  // Platform is only known in the browser. Rendering Ctrl first keeps the
  // server and client markup the same until it's checked.
  const [mac, setMac] = useState(false);
  useEffect(() => setMac(isMac()), []);
  const label = keys.map((k) => (k === "Mod" ? (mac ? "⌘" : "Ctrl") : k)).join(" ");
  return <kbd className={styles.kbd}>{label}</kbd>;
}
