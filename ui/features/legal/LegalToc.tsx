// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2026 Russhvith

"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import styles from "./LegalPage.module.css";

type Props = { sections: { id: string; number: string; title: string }[] };

/**
 * The document's sections, with the one being read marked as you scroll:
 * the last section whose heading has passed a line 30% down the screen.
 * The work runs at most once per frame and only while scrolling, which
 * stays cheap on slow machines.
 */
export function LegalToc({ sections }: Props) {
  const [current, setCurrent] = useState(sections[0]?.id ?? "");

  useEffect(() => {
    const targets = sections.map((s) => document.getElementById(s.id)).filter((el): el is HTMLElement => !!el);
    if (!targets.length) return;
    let frame = 0;

    const update = () => {
      frame = 0;
      const doc = document.documentElement;
      // The last sections are often too short to ever reach the line, so
      // the bottom of the page counts as reading the last one.
      if (window.innerHeight + window.scrollY >= doc.scrollHeight - 4) {
        setCurrent(targets[targets.length - 1].id);
        return;
      }
      const line = window.innerHeight * 0.3;
      let found = targets[0].id;
      for (const t of targets) {
        if (t.getBoundingClientRect().top <= line) found = t.id;
        else break;
      }
      setCurrent(found);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [sections]);

  return (
    <nav className={styles.toc} aria-label="On this page">
      <p className={styles.tocTitle}>On this page</p>
      <ol>
        {sections.map((s) => (
          <li key={s.id}>
            <a href={`#${s.id}`} className={cn(s.id === current && styles.tocCurrent)} aria-current={s.id === current ? "location" : undefined}>
              <span className={styles.tocNumber}>{s.number}</span>
              {s.title}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
