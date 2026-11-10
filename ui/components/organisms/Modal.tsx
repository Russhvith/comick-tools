// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2026 Russhvith

"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { IconButton } from "@/components/atoms/IconButton";
import styles from "./Modal.module.css";

type Props = {
  open: boolean;
  title: ReactNode;
  /** Small line under the title. */
  subtitle?: ReactNode;
  /** Controls next to the close button, like previous and next. */
  actions?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  /**
   * Esc, the backdrop and the close button all land here instead of
   * closing outright, so a caller with unsaved edits can ask first.
   */
  onRequestClose: () => void;
};

export function Modal({ open, title, subtitle, actions, footer, children, onRequestClose }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
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
      onCancel={(event) => {
        event.preventDefault();
        onRequestClose();
      }}
      // Pressing inside and letting go on the backdrop (selecting text, say)
      // shouldn't count as a click outside.
      onMouseDown={(event) => {
        event.currentTarget.dataset.downOnBackdrop = String(event.target === dialog.current);
      }}
      onClick={(event) => {
        if (event.target === dialog.current && event.currentTarget.dataset.downOnBackdrop === "true") onRequestClose();
      }}
    >
      {open && (
        <div className={styles.panel}>
          <header className={styles.header}>
            <div className={styles.heading}>
              <h2 id={titleId} className={styles.title}>
                {title}
              </h2>
              {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
            </div>
            <div className={styles.actions}>
              {actions}
              <IconButton icon={X} label="Close" onClick={onRequestClose} />
            </div>
          </header>
          <div className={styles.body}>{children}</div>
          {footer && <footer className={styles.footer}>{footer}</footer>}
        </div>
      )}
    </dialog>
  );
}
