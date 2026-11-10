// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2026 Russhvith

"use client";

import { BadgeCheck, Hourglass } from "lucide-react";
import type { Tool } from "@/types/tools";
import { roleLabels } from "./AccountCard";
import { useAccount } from "./useAccount";
import styles from "./RoleNote.module.css";

/**
 * What the signed in account's role means for this tool, from the tool's
 * roleNotes. Says nothing until the account is known, and nothing for a
 * tool without notes.
 */
export function RoleNote({ tool }: { tool: Tool }) {
  const { data: account } = useAccount();
  if (account?.state !== "signed-in" || !tool.roleNotes) return null;

  const notes = tool.roleNotes;
  const text =
    notes[account.role] ?? (account.role === "moderator" || account.role === "admin" ? notes.trusted : undefined) ?? notes.user;
  if (!text) return null;

  // A regular account waits on review, everyone else goes straight out.
  const waits = account.role === "user";
  return (
    <div className={styles.note} data-waits={waits} role="status">
      <span className={styles.icon} aria-hidden>
        {waits ? <Hourglass size={18} /> : <BadgeCheck size={18} />}
      </span>
      <p className={styles.text}>
        <span className={styles.who}>
          Signed in as {account.username}, {roleLabels[account.role]}.
        </span>{" "}
        {text}
      </p>
    </div>
  );
}
