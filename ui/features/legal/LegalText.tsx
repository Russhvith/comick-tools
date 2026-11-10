// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2026 Russhvith

import { Fragment, type ReactNode } from "react";
import Link from "next/link";

// File names in the documents become links to their page here, and plain
// web addresses become links out.
const PAGES: Record<string, string> = {
  "legal/terms.txt": "/legal/terms",
  "legal/privacy.txt": "/legal/privacy",
  "legal/packages.txt": "/legal/packages",
};
const TOKEN = /(legal\/(?:terms|privacy|packages)\.txt|https?:\/\/[^\s,)]+[^\s,).])/g;

/** One line of legal text with its file names and addresses linked. */
export function LegalText({ text }: { text: string }) {
  const parts: ReactNode[] = [];
  let last = 0;
  for (const match of text.matchAll(TOKEN)) {
    const [token] = match;
    const at = match.index ?? 0;
    if (at > last) parts.push(text.slice(last, at));
    parts.push(
      PAGES[token] ? (
        <Link key={at} href={PAGES[token]}>
          {token}
        </Link>
      ) : (
        <a key={at} href={token} target="_blank" rel="noreferrer">
          {token}
        </a>
      ),
    );
    last = at + token.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return <>{parts.map((p, i) => (typeof p === "string" ? <Fragment key={`t${i}`}>{p}</Fragment> : p))}</>;
}
