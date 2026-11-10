// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2026 Russhvith

import type { CSSProperties } from "react";
import Link from "next/link";
import { ArrowRight, BookOpen, ExternalLink } from "lucide-react";
import { TopBar } from "@/components/organisms/TopBar";
import { AppShell } from "@/components/templates/AppShell";
import { site } from "@/config/site";
import { groups, toolIcon } from "@/config/tools";
import { AccountCard } from "@/features/account/AccountCard";
import { AdminLockMark } from "@/features/account/AdminLockMark";
import { ToolNav } from "@/features/tools/components/ToolNav";
import { cn } from "@/lib/cn";
import type { ChangelogSection } from "@/lib/server/repo";
import type { Tool } from "@/types/tools";
import { Changelog } from "./components/Changelog";
import { ContributionCalendar } from "./components/ContributionCalendar";
import { DailyBars } from "./components/DailyBars";
import styles from "./HomePage.module.css";

type Props = {
  tools: Tool[];
  version: string;
  runCount: number;
  commitCount: number | null;
  days: Record<string, number> | null;
  changelog: ChangelogSection[] | null;
  /** yyyy-mm-dd on the server, so the charts and the client agree. */
  today: string;
};

/** Order in the entrance, so blocks settle in one after another. */
const order = (i: number) => ({ "--i": i }) as CSSProperties;

export function HomePage({ tools, version, runCount, commitCount, days, changelog, today }: Props) {
  const stats = [
    { label: "Tools", value: tools.length.toLocaleString("en-US") },
    { label: "Runs here", value: runCount.toLocaleString("en-US") },
    { label: "Commits", value: commitCount === null ? "Unknown" : commitCount.toLocaleString("en-US") },
    { label: "Version", value: `v${version}` },
  ];

  return (
    <AppShell
      header={
        <TopBar
          wordmark={site.wordmark}
          subtitle={site.tagline}
          middle={
            <>
              <a href="#activity" className={styles.navLink}>
                Activity
              </a>
              <a href="#changelog" className={styles.navLink}>
                Changelog
              </a>
            </>
          }
          end={
            <a href={site.repoUrl} target="_blank" rel="noreferrer" className={styles.navLink}>
              GitHub <ExternalLink size={13} aria-hidden />
            </a>
          }
        />
      }
      sidebar={<ToolNav tools={tools} active="home" />}
    >
      <div className={styles.columns}>
        <div className={styles.column}>
          <section className={cn(styles.intro, styles.reveal)} style={order(0)}>
            <h1 className={styles.title}>ComicK Tools</h1>
            <p className={styles.lead}>
              Scripts for getting things onto ComicK and tidying them up, with this page to run them from. Everything runs on your own computer,
              and your session cookie never leaves it.
            </p>
            <p className={styles.byline}>
              Made by{" "}
              <a href={site.author.url} target="_blank" rel="noreferrer">
                {site.author.name}
              </a>
            </p>
            <div className={styles.actions}>
              <Link href="/tools" className={cn(styles.button, styles.primaryButton)}>
                Open the tools <ArrowRight size={15} aria-hidden className={styles.nudge} />
              </Link>
              <a href={site.docsUrl} target="_blank" rel="noreferrer" className={styles.button}>
                <BookOpen size={15} aria-hidden /> Read the docs
              </a>
            </div>
          </section>

          <section className={cn(styles.section, styles.reveal)} style={order(2)} aria-labelledby="tools-heading">
            <h2 id="tools-heading" className={styles.heading}>
              Tools
            </h2>
            <ul className={styles.tools}>
              {tools.map((tool) => {
                const Icon = toolIcon(tool.id);
                const group = groups[tool.group];
                return (
                  <li key={tool.id}>
                    <Link href={`/tools/${tool.id}`} className={styles.tool}>
                      <span className={cn(styles.toolIcon, styles[`tone-${group.tone}`])} aria-hidden>
                        <Icon size={20} />
                      </span>
                      <span className={styles.toolText}>
                        <span className={styles.toolName}>{tool.name}</span>
                        <span className={styles.toolSummary}>{tool.summary}</span>
                        <span className={cn(styles.audience, styles[`tone-${group.tone}`])}>{group.note}</span>
                        {tool.group === "admin" && <AdminLockMark />}
                      </span>
                      <ArrowRight size={16} aria-hidden className={styles.toolArrow} />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>

        </div>

        <div className={styles.column}>
          <AccountCard className={styles.reveal} />

          <dl className={cn(styles.stats, styles.reveal)} style={order(1)}>
            {stats.map((s) => (
              <div key={s.label} className={styles.stat}>
                <dt>{s.label}</dt>
                <dd>{s.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      {days && (
        <section id="activity" className={cn(styles.section, styles.wide, styles.reveal)} style={order(3)} aria-labelledby="activity-heading">
          <h2 id="activity-heading" className={styles.heading}>
            Activity
          </h2>
          <div className={styles.charts}>
            <div className={styles.panel}>
              <h3 className={styles.panelTitle}>Commits over the last year</h3>
              <ContributionCalendar days={days} today={today} />
            </div>
            <div className={styles.panel}>
              <h3 className={styles.panelTitle}>Commits a day, last 30 days</h3>
              <DailyBars days={days} today={today} />
            </div>
          </div>
        </section>
      )}

      {changelog && changelog.length > 0 && (
        <section id="changelog" className={cn(styles.section, styles.changelog, styles.reveal)} style={order(4)} aria-labelledby="changelog-heading">
          <h2 id="changelog-heading" className={styles.heading}>
            Changelog
          </h2>
          <Changelog releases={changelog} />
        </section>
      )}

      <footer className={styles.footer}>
        <span>
          ComicK Tools v{version}, made by{" "}
          <a href={site.author.url} target="_blank" rel="noreferrer">
            {site.author.name}
          </a>
          . Free software under the{" "}
          <a href={`${site.repoUrl}/blob/main/LICENSE`} target="_blank" rel="noreferrer">
            GNU GPL v3
          </a>
          .
        </span>
        <span className={styles.footerLinks}>
          <Link href="/legal/terms">Terms</Link>
          <Link href="/legal/privacy">Privacy</Link>
          <Link href="/legal/packages">Open source</Link>
          <a href={site.repoUrl} target="_blank" rel="noreferrer">
            Source on GitHub
          </a>
        </span>
      </footer>
    </AppShell>
  );
}
