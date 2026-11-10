// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2026 Russhvith

"use client";

import { X } from "lucide-react";
import { adminLocked, useAccount } from "./useAccount";
import styles from "./AdminLockMark.module.css";

/** A red cross on an admin tool's card when the account can't use it. */
export function AdminLockMark() {
  const { data: account } = useAccount();
  if (!adminLocked(account)) return null;
  return (
    <span className={styles.mark} title="Not available for your account">
      <X size={13} strokeWidth={2.75} aria-hidden />
      Not for your account
    </span>
  );
}
