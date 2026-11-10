// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2026 Russhvith

import type { ReactNode } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { Kbd } from "@/components/atoms/Kbd";
import { LogoMark } from "@/components/atoms/LogoMark";
import styles from "./TopBar.module.css";

type Props = {
  /** The name, split so the second part can carry the accent. */
  wordmark: { lead: string; accent: string };
  subtitle: string;
  /** Pages without the search palette leave this out, and show `middle` instead. */
  search?: { label: string; keys: readonly string[]; onOpen: () => void };
  /** What sits in the centre column when there's no search, like page links. */
  middle?: ReactNode;
  end?: ReactNode;
};

export function TopBar({ wordmark, subtitle, search, middle, end }: Props) {
  return (
    <header className={styles.bar}>
      <Link href="/" className={styles.brand} aria-label={`${wordmark.lead} ${wordmark.accent}, home`}>
        <span className={styles.logo}>
          <LogoMark size={32} />
        </span>
        <span className={styles.names}>
          <span className={styles.title}>
            {wordmark.lead} <span className={styles.accent}>{wordmark.accent}</span>
          </span>
          <span className={styles.subtitle}>{subtitle}</span>
        </span>
      </Link>
      {search ? (
        <button type="button" className={styles.search} onClick={search.onOpen}>
          <Search size={16} aria-hidden />
          <span className={styles.searchLabel}>{search.label}</span>
          <Kbd keys={search.keys} />
        </button>
      ) : (
        <nav className={styles.middle}>{middle}</nav>
      )}
      <div className={styles.end}>{end}</div>
    </header>
  );
}
