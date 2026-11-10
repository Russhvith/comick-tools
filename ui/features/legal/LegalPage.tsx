// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2026 Russhvith

import type { ReactNode } from "react";
import Link from "next/link";
import { FileText } from "lucide-react";
import { TopBar } from "@/components/organisms/TopBar";
import { AppShell } from "@/components/templates/AppShell";
import { site } from "@/config/site";
import { ToolNav } from "@/features/tools/components/ToolNav";
import { cn } from "@/lib/cn";
import type { LegalBlock, LegalDoc } from "@/lib/server/legal";
import type { Tool } from "@/types/tools";
import { LegalText } from "./LegalText";
import styles from "./LegalPage.module.css";

export type LegalName = "terms" | "privacy" | "packages";

export const legalPages: { name: LegalName; title: string; file: string }[] = [
  { name: "terms", title: "Terms of Service", file: "legal/terms.txt" },
  { name: "privacy", title: "Privacy Policy", file: "legal/privacy.txt" },
  { name: "packages", title: "Open-source software", file: "legal/packages.txt" },
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
  const file = legalPages.find((p) => p.name === current)!.file;

  return (
    <AppShell
      header={<TopBar wordmark={site.wordmark} subtitle={site.tagline} />}
      sidebar={<ToolNav tools={tools} active={`legal/${current}`} />}
      aside={
        doc.sections.length > 0 && !body ? (
          <nav className={styles.toc} aria-label="On this page">
            <p className={styles.tocTitle}>On this page</p>
            <ol>
              {doc.sections.map((s) => (
                <li key={s.id}>
                  <a href={`#${s.id}`}>{s.title}</a>
                </li>
              ))}
            </ol>
          </nav>
        ) : undefined
      }
    >
      <article className={styles.doc}>
        <nav className={styles.tabs} aria-label="Legal">
          {legalPages.map((p) => (
            <Link key={p.name} href={`/legal/${p.name}`} className={cn(styles.tab, p.name === current && styles.active)} aria-current={p.name === current ? "page" : undefined}>
              {p.title}
            </Link>
          ))}
        </nav>

        <header className={styles.header}>
          <h1 className={styles.title}>{doc.title}</h1>
          {(doc.release || doc.effective) && (
            <dl className={styles.dates}>
              {doc.release && (
                <div>
                  <dt>Release date</dt>
                  <dd>{doc.release}</dd>
                </div>
              )}
              {doc.effective && (
                <div>
                  <dt>Effective date</dt>
                  <dd>{doc.effective}</dd>
                </div>
              )}
            </dl>
          )}
          <p className={styles.source}>
            <FileText size={13} aria-hidden /> Also in <code>{file}</code>
          </p>
        </header>

        {body ?? (
          <>
            <Blocks blocks={doc.intro} figures={nextFigure} />
            {doc.sections.map((s) => (
              <section key={s.id} id={s.id} className={styles.section}>
                <h2 className={styles.heading}>
                  <span className={styles.number}>{s.number}.</span> {s.title}
                </h2>
                <Blocks blocks={s.blocks} figures={nextFigure} />
              </section>
            ))}
          </>
        )}
      </article>
    </AppShell>
  );
}
