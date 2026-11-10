import type { CSSProperties } from "react";
import Link from "next/link";
import { ArrowRight, BookOpen, ExternalLink, GitCommitHorizontal, Tag } from "lucide-react";
import { TopBar } from "@/components/organisms/TopBar";
import { AppShell } from "@/components/templates/AppShell";
import { site } from "@/config/site";
import { groups, toolIcon } from "@/config/tools";
import { ToolNav } from "@/features/tools/components/ToolNav";
import { cn } from "@/lib/cn";
import type { ChangelogSection } from "@/lib/server/repo";
import type { Tool } from "@/types/tools";
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

const longDate = (key: string) =>
  new Date(`${key}T00:00:00Z`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });

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
                      </span>
                      <ArrowRight size={16} aria-hidden className={styles.toolArrow} />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>

          {changelog && changelog.length > 0 && (
            <section id="changelog" className={cn(styles.section, styles.reveal)} style={order(4)} aria-labelledby="changelog-heading">
              <h2 id="changelog-heading" className={styles.heading}>
                Changelog
              </h2>
              <ol className={styles.releases}>
                {changelog.map((release) => (
                  <li key={release.tag ?? "unreleased"} className={styles.release}>
                    <header className={styles.releaseHeader}>
                      <span className={cn(styles.releaseTag, !release.tag && styles.unreleased)}>
                        <Tag size={13} aria-hidden />
                        {release.tag ?? "Unreleased"}
                      </span>
                      <span className={styles.releaseDate}>{release.date ? longDate(release.date) : "Not in a release yet"}</span>
                    </header>
                    <ul className={styles.commits}>
                      {release.entries.map((entry) => (
                        <li key={entry.hash} className={styles.commit}>
                          <GitCommitHorizontal size={14} aria-hidden className={styles.commitIcon} />
                          <span className={styles.commitSubject}>{entry.subject}</span>
                          <code className={styles.commitHash}>{entry.hash}</code>
                        </li>
                      ))}
                    </ul>
                    {release.more > 0 && (
                      <p className={styles.more}>
                        And {release.more} more commit{release.more === 1 ? "" : "s"}.
                      </p>
                    )}
                  </li>
                ))}
              </ol>
            </section>
          )}
        </div>

        <div className={styles.column}>
          <dl className={cn(styles.stats, styles.reveal)} style={order(1)}>
            {stats.map((s) => (
              <div key={s.label} className={styles.stat}>
                <dt>{s.label}</dt>
                <dd>{s.value}</dd>
              </div>
            ))}
          </dl>

          {days && (
            <section id="activity" className={cn(styles.section, styles.reveal)} style={order(3)} aria-labelledby="activity-heading">
              <h2 id="activity-heading" className={styles.heading}>
                Activity
              </h2>
              <div className={styles.panel}>
                <h3 className={styles.panelTitle}>Commits over the last year</h3>
                <ContributionCalendar days={days} today={today} />
              </div>
              <div className={styles.panel}>
                <h3 className={styles.panelTitle}>Commits a day, last 30 days</h3>
                <DailyBars days={days} today={today} />
              </div>
            </section>
          )}
        </div>
      </div>

      <footer className={styles.footer}>
        <span>
          ComicK Tools v{version}, made by{" "}
          <a href={site.author.url} target="_blank" rel="noreferrer">
            {site.author.name}
          </a>
          .
        </span>
        <a href={site.repoUrl} target="_blank" rel="noreferrer">
          Source on GitHub
        </a>
      </footer>
    </AppShell>
  );
}
