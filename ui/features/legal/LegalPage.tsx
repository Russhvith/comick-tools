// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2026 Russhvith

import type { ReactNode } from "react";
import Link from "next/link";
import { CalendarDays, FileText, Link2 } from "lucide-react";
import { TopBar } from "@/components/organisms/TopBar";
import { AppShell } from "@/components/templates/AppShell";
import { site } from "@/config/site";
import { ToolNav } from "@/features/tools/components/ToolNav";
import { cn } from "@/lib/cn";
import type { LegalBlock, LegalDoc } from "@/lib/server/legal";
import type { Tool } from "@/types/tools";
import { LegalText } from "./LegalText";
import { LegalToc } from "./LegalToc";
import styles from "./LegalPage.module.css";

export type LegalName = "terms" | "privacy" | "packages";

export const legalPages: { name: LegalName; title: string; file: string; summary: string }[] = [
  { name: "terms", title: "Terms of Service", file: "legal/terms.txt", summary: "What you agree to when you use ComicK Tools with your ComicK account." },
  { name: "privacy", title: "Privacy Policy", file: "legal/privacy.txt", summary: "What the tools keep on your computer, where they connect, and where your cookie goes." },
  { name: "packages", title: "Open-source software", file: "legal/packages.txt", summary: "The packages ComicK Tools is built on, with their versions and licences." },
];

type Props = {
  tools: Tool[];
  current: LegalName;
  doc: LegalDoc;
  /** Drawn in place of the document's indented drawings, in order. */
  figures?: ReactNode[];
  /** Shown in place of the sections, like the live package tables. */
  body?: ReactNode;
};

function Blocks({ blocks, figures }: { blocks: LegalBlock[]; figures: { next: () => ReactNode | undefined } }) {
  return (
    <>
      {blocks.map((block, i) => {
        if (block.type === "pre") return <div key={i}>{figures.next() ?? <pre className={styles.pre}>{block.text}</pre>}</div>;
        if (block.type === "ul")
          return (
            <ul key={i} className={styles.list}>
              {block.items.map((item, j) => (
                <li key={j}>
                  <LegalText text={item} />
                </li>
              ))}
            </ul>
          );
        return (
          <p key={i} className={styles.p}>
            <LegalText text={block.text} />
          </p>
        );
      })}
    </>
  );
}

export function LegalPage({ tools, current, doc, figures = [], body }: Props) {
  let figure = 0;
  const nextFigure = { next: () => figures[figure++] };
  const page = legalPages.find((p) => p.name === current)!;
  const others = legalPages.filter((p) => p.name !== current);
  const toc = doc.sections.length > 0 && !body;

  return (
    <AppShell
      header={<TopBar wordmark={site.wordmark} subtitle={site.tagline} />}
      sidebar={<ToolNav tools={tools} active={`legal/${current}`} />}
    >
      <div className={styles.page}>
        <nav className={styles.tabs} aria-label="Legal">
          {legalPages.map((p) => (
            <Link key={p.name} href={`/legal/${p.name}`} className={cn(styles.tab, p.name === current && styles.active)} aria-current={p.name === current ? "page" : undefined}>
              {p.title}
            </Link>
          ))}
        </nav>

        <header className={styles.header}>
          <h1 className={styles.title}>{doc.title}</h1>
          <p className={styles.summary}>{page.summary}</p>
          <div className={styles.meta}>
            {doc.release && (
              <span>
                <CalendarDays size={14} aria-hidden />
                Released {doc.release}
                {doc.effective && doc.effective !== doc.release ? `, in effect from ${doc.effective}` : ", in effect the same day"}
              </span>
            )}
            <span>
              <FileText size={14} aria-hidden />
              Plain text copy in <code>{page.file}</code>
            </span>
          </div>
        </header>

        <div className={cn(styles.layout, toc && styles.withToc)}>
          {toc && <LegalToc sections={doc.sections.map(({ id, number, title }) => ({ id, number, title }))} />}

          <article className={styles.doc}>
            {body ?? (
              <>
                <Blocks blocks={doc.intro} figures={nextFigure} />
                {doc.sections.map((s) => (
                  <section key={s.id} id={s.id} className={styles.section}>
                    <h2 className={styles.heading}>
                      <a href={`#${s.id}`} className={styles.headingLink}>
                        <span className={styles.number}>{s.number}</span>
                        {s.title}
                        <Link2 size={15} aria-hidden className={styles.anchor} />
                      </a>
                    </h2>
                    <Blocks blocks={s.blocks} figures={nextFigure} />
                  </section>
                ))}
              </>
            )}

            <footer className={styles.end}>
              <p className={styles.endTitle}>Also read</p>
              <div className={styles.endLinks}>
                {others.map((p) => (
                  <Link key={p.name} href={`/legal/${p.name}`} className={styles.endLink}>
                    <span className={styles.endName}>{p.title}</span>
                    <span className={styles.endSummary}>{p.summary}</span>
                  </Link>
                ))}
              </div>
              <p className={styles.contact}>
                Questions about any of this? <a href={`${site.repoUrl}/issues`} target="_blank" rel="noreferrer">Open an issue on GitHub</a>.
              </p>
            </footer>
          </article>
        </div>
      </div>
    </AppShell>
  );
}
