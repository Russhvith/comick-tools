// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2026 Russhvith

"use client";

import { useState } from "react";
import Link from "next/link";
import { FileText, ShieldCheck } from "lucide-react";
import { Button } from "@/components/atoms/Button";
import { Modal } from "@/components/organisms/Modal";
import { useSettings } from "./useSettings";
import styles from "./TermsDialog.module.css";

type Props = {
  open: boolean;
  /**
   * Left out, the dialog can't be closed without accepting, which is how
   * tool pages use it. The homepage passes one so it can be put off.
   */
  onClose?: () => void;
};

// The points people most need before they start, in plain words. The full
// documents are one click away and are what actually applies.
const points = [
  "The tools run on your computer and act as the ComicK account in your .env, as if you did it yourself.",
  "You're responsible for what they upload or delete. Deletions are permanent.",
  "Your cookie stays in .env and is only ever sent to ComicK's API. Nothing is sent to us.",
  "Use them within ComicK's own rules. The code is free software under the GNU GPL v3.",
];

/** Asks once for the Terms. Until they're accepted, nothing is sent to ComicK. */
export function TermsDialog({ open, onClose }: Props) {
  const { accept } = useSettings();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function agree() {
    setBusy(true);
    setError(null);
    try {
      await accept();
      onClose?.();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      title="Before you start"
      subtitle="ComicK Tools needs you to accept its Terms of Service"
      onRequestClose={onClose}
      footer={
        <>
          {error && (
            <span className={styles.error} role="alert">
              {error}
            </span>
          )}
          {onClose && (
            <Button variant="ghost" onClick={onClose}>
              Not now
            </Button>
          )}
          <Button variant="primary" onClick={() => void agree()} loading={busy}>
            I agree
          </Button>
        </>
      }
    >
      <div className={styles.body}>
        <ul className={styles.points}>
          {points.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
        <p className={styles.read}>
          By choosing I agree, you accept the{" "}
          <Link href="/legal/terms" target="_blank">
            <FileText size={13} aria-hidden /> Terms of Service
          </Link>{" "}
          and the{" "}
          <Link href="/legal/privacy" target="_blank">
            <ShieldCheck size={13} aria-hidden /> Privacy Policy
          </Link>
          . They open in a new tab. Your answer is saved in .env, and the command line tools won&apos;t ask again either.
        </p>
      </div>
    </Modal>
  );
}
