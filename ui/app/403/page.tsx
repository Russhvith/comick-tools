// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2026 Russhvith

import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { LogoMark } from "@/components/atoms/LogoMark";
import { ForbiddenPanel } from "@/components/organisms/ForbiddenPanel";
import { pageTitle } from "@/config/site";
import styles from "./page.module.css";

export const metadata: Metadata = { title: pageTitle("Forbidden") };

// A page to send people to when they can't have what they asked for. The
// same panel shows in an overlay when an account opens a tool it can't use.
export default function Forbidden() {
  return (
    <main className={styles.page}>
      <div className={styles.box}>
        <Link href="/" className={styles.logo} aria-label="ComicK Tools, home">
          <LogoMark size={36} />
        </Link>
        <ForbiddenPanel
          title="You can't open this page"
          actions={
            <Link href="/" className={styles.button}>
              <ArrowLeft size={15} aria-hidden /> Back to the homepage
            </Link>
          }
        >
          <p>Your account doesn&apos;t have access to it. If you think it should, ask whoever runs this ComicK Tools to check your role.</p>
        </ForbiddenPanel>
      </div>
    </main>
  );
}
