// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2026 Russhvith

import { execFile } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import { REPO_ROOT } from "./paths";
import { pythonCommand } from "./runs";

const run = promisify(execFile);
const LEGAL = path.join(REPO_ROOT, "legal");

export type LegalBlock = { type: "p"; text: string } | { type: "ul"; items: string[] } | { type: "pre"; text: string };
export type LegalSection = { number: string; title: string; id: string; blocks: LegalBlock[] };
export type LegalDoc = { title: string; release: string | null; effective: string | null; intro: LegalBlock[]; sections: LegalSection[] };

const slug = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/** Paragraphs, lists and indented blocks, with wrapped lines joined back up. */
function blocksOf(chunks: string[][]): LegalBlock[] {
  const blocks: LegalBlock[] = [];
  for (const lines of chunks) {
    if (lines.every((l) => l.startsWith("    "))) {
      const text = lines.map((l) => l.slice(4)).join("\n");
      // A blank line inside a drawing splits it, so put it back together.
      const last = blocks[blocks.length - 1];
      if (last?.type === "pre") last.text += `\n\n${text}`;
      else blocks.push({ type: "pre", text });
    } else if (lines[0].startsWith("- ")) {
      const items: string[] = [];
      for (const l of lines) {
        if (l.startsWith("- ")) items.push(l.slice(2).trim());
        else items[items.length - 1] += ` ${l.trim()}`;
      }
      blocks.push({ type: "ul", items });
    } else {
      blocks.push({ type: "p", text: lines.map((l) => l.trim()).join(" ") });
    }
  }
  return blocks;
}

/**
 * Read a document from legal/, the same file the command line points
 * people at, so the page and the text can never say different things.
 * Format: a title block, optional date lines, then "N. Title" headings
 * with paragraphs, "- " lists and indented drawings under them.
 */
export function readLegal(name: "terms" | "privacy" | "packages"): LegalDoc | null {
  let text: string;
  try {
    text = fs.readFileSync(path.join(LEGAL, `${name}.txt`), "utf8");
  } catch {
    return null;
  }
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const chunks: string[][] = [];
  let current: string[] = [];
  for (const line of lines) {
    if (line.trim()) current.push(line);
    else if (current.length) {
      chunks.push(current);
      current = [];
    }
  }
  if (current.length) chunks.push(current);

  const [head = [], ...rest] = chunks;
  const doc: LegalDoc = { title: head[1] ?? head[0] ?? name, release: null, effective: null, intro: [], sections: [] };
  const loose: string[][] = [];
  for (const chunk of rest) {
    const date = /^(Release|Effective) date:\s*(.+)$/;
    if (chunk.every((l) => date.test(l))) {
      for (const l of chunk) {
        const [, which, value] = date.exec(l)!;
        if (which === "Release") doc.release = value;
        else doc.effective = value;
      }
      continue;
    }
    const heading = chunk.length === 1 ? /^(\d+)\.\s+(\S.*)$/.exec(chunk[0]) : null;
    if (heading) {
      if (doc.sections.length) doc.sections[doc.sections.length - 1].blocks = blocksOf(loose.splice(0));
      else doc.intro = blocksOf(loose.splice(0));
      doc.sections.push({ number: heading[1], title: heading[2], id: slug(heading[2]), blocks: [] });
    } else {
      loose.push(chunk);
    }
  }
  if (doc.sections.length) doc.sections[doc.sections.length - 1].blocks = blocksOf(loose);
  else doc.intro = blocksOf(loose);
  return doc;
}

export type PackageRow = { name: string; version: string; license: string };
export type Packages = {
  python: { minimum: string; packages: { spec: string; usedBy: string[] }[] };
  ui: { runtime: PackageRow[]; build: PackageRow[]; indirect: number };
};

/** The live list, from the same script that writes legal/packages.txt. */
export async function packages(): Promise<Packages | null> {
  try {
    const { stdout } = await run(pythonCommand, [path.join(LEGAL, "packages.py"), "--json"], {
      cwd: REPO_ROOT,
      windowsHide: true,
      timeout: 15_000,
    });
    return JSON.parse(stdout) as Packages;
  } catch {
    return null;
  }
}
