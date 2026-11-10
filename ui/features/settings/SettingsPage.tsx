// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2026 Russhvith

"use client";

import { useState } from "react";
import Link from "next/link";
import { CircleCheck, ScrollText } from "lucide-react";
import { Button } from "@/components/atoms/Button";
import { Skeleton } from "@/components/atoms/Skeleton";
import { TopBar } from "@/components/organisms/TopBar";
import { AppShell } from "@/components/templates/AppShell";
import { site } from "@/config/site";
import { ToolNav } from "@/features/tools/components/ToolNav";
import type { Tool } from "@/types/tools";
import { SettingsForm } from "./SettingsForm";
import { TermsDialog } from "./TermsDialog";
import { useSettings } from "./useSettings";
import styles from "./SettingsPage.module.css";

/** Edit .env from the browser, any time. */
export function SettingsPage({ tools }: { tools: Tool[] }) {
  const { data, loading } = useSettings();
  const [asking, setAsking] = useState(false);

  return (
    <AppShell header={<TopBar wordmark={site.wordmark} subtitle={site.tagline} />} sidebar={<ToolNav tools={tools} active="settings" />}>
      <div className={styles.page}>
        <header className={styles.header}>
          <h1 className={styles.title}>Settings</h1>
          <p className={styles.summary}>
            What&apos;s saved in the <code>.env</code> file at the root of ComicK Tools. The command line tools read the same file.
          </p>
        </header>

        {loading && !data ? (
          <div className={styles.card}>
            <Skeleton height="2.5rem" />
            <Skeleton height="6rem" />
          </div>
        ) : data ? (
          <>
            <section className={styles.terms} data-ok={data.agreed}>
              <ScrollText size={18} aria-hidden />
              <div className={styles.termsText}>
                <p className={styles.termsTitle}>{data.agreed ? "Terms of Service accepted" : "Terms of Service not accepted yet"}</p>
                <p className={styles.termsNote}>
                  {data.agreed ? (
                    <>
                      Saved in .env. Read them again in <Link href="/legal/terms">Terms of Service</Link>.
                    </>
                  ) : (
                    "The tools won't run and nothing is sent to ComicK until you accept them."
                  )}
                </p>
              </div>
              {data.agreed ? (
                <CircleCheck size={18} aria-hidden className={styles.tick} />
              ) : (
                <Button variant="primary" onClick={() => setAsking(true)}>
                  Review and accept
                </Button>
              )}
            </section>

            <div className={styles.card}>
              <SettingsForm settings={data} />
            </div>
          </>
        ) : (
          <p className={styles.summary}>Couldn&apos;t read the settings. Check that the tools server is running.</p>
        )}
      </div>
      <TermsDialog open={asking} onClose={() => setAsking(false)} />
    </AppShell>
  );
}
