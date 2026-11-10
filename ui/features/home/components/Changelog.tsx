// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2026 Russhvith

import { ChevronRight, GitCommitHorizontal, Tag } from "lucide-react";
import type { ChangelogEntry, ChangelogSection } from "@/lib/server/repo";
import styles from "./Changelog.module.css";

// How many changes a release shows before "show more". Enough to see what
// it was about, short enough that the page doesn't turn into a git log.
const VISIBLE = 5;

const longDate = (key: string) =>
  new Date(`${key}T00:00:00Z`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });

function Commits({ entries }: { entries: ChangelogEntry[] }) {
  return (
    <ul className={styles.commits}>
      {entries.map((entry) => (
        <li key={entry.hash} className={styles.commit}>
          <GitCommitHorizontal size={14} aria-hidden className={styles.commitIcon} />
          <span className={styles.subject}>{entry.subject}</span>
          <code className={styles.hash}>{entry.hash}</code>
        </li>
      ))}
    </ul>
  );
}

/**
 * Releases as rows that open and close, newest open. Plain details and
 * summary elements, so it folds without any script.
 */
export function Changelog({ releases }: { releases: ChangelogSection[] }) {
  return (
    <ol className={styles.releases}>
      {releases.map((release, i) => {
        const total = release.entries.length + release.more;
        const shown = release.entries.slice(0, VISIBLE);
        const hidden = release.entries.slice(VISIBLE);
        return (
          <li key={release.tag ?? "unreleased"}>
            <details className={styles.release} open={i === 0}>
              <summary className={styles.summary}>
                <ChevronRight size={16} aria-hidden className={styles.chevron} />
                <span className={release.tag ? styles.tag : `${styles.tag} ${styles.unreleased}`}>
                  <Tag size={13} aria-hidden />
                  {release.tag ?? "Unreleased"}
                </span>
                <span className={styles.date}>{release.date ? longDate(release.date) : "Not in a release yet"}</span>
                <span className={styles.count}>
                  {total} change{total === 1 ? "" : "s"}
                </span>
              </summary>
              <div className={styles.body}>
                <Commits entries={shown} />
                {hidden.length > 0 && (
                  <details className={styles.more}>
                    <summary className={styles.moreSummary}>Show {hidden.length} more</summary>
                    <Commits entries={hidden} />
                  </details>
                )}
                {release.more > 0 && (
                  <p className={styles.note}>
                    And {release.more} older commit{release.more === 1 ? "" : "s"} in this release.
                  </p>
                )}
              </div>
            </details>
          </li>
        );
      })}
    </ol>
  );
}
