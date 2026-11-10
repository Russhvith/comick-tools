// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2026 Russhvith

"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { Button } from "@/components/atoms/Button";
import styles from "./ConfirmDialog.module.css";

type Props = {
  open: boolean;
  title: string;
  children: ReactNode;
  confirmLabel: string;
  tone?: "primary" | "danger";
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({ open, title, children, confirmLabel, tone = "primary", onConfirm, onCancel }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  // Several forms on one page each have a dialog, so the id can't be fixed.
  const titleId = useId();

  useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    else if (!open && el.open) el.close();
  }, [open]);

  return (
    <dialog
      ref={dialog}
      className={styles.dialog}
      aria-labelledby={titleId}
      onClose={onCancel}
      onClick={(event) => event.target === dialog.current && onCancel()}
    >
      {open && (
        <div className={styles.panel}>
          <h2 id={titleId} className={styles.title}>
            {title}
          </h2>
          <div className={styles.body}>{children}</div>
          <footer className={styles.footer}>
            <Button variant="ghost" onClick={onCancel} autoFocus>
              Cancel
            </Button>
            <Button variant={tone === "danger" ? "danger" : "primary"} onClick={onConfirm}>
              {confirmLabel}
            </Button>
          </footer>
        </div>
      )}
    </dialog>
  );
}
