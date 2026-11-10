// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2026 Russhvith

import fs from "node:fs";
import path from "node:path";
import { REPO_ROOT } from "./paths";

/** The .env in use. COMICK_TOOLS_ENV_FILE points elsewhere, which keeps tests off the real one. */
export function envPath(): string {
  return process.env.COMICK_TOOLS_ENV_FILE ? path.resolve(process.env.COMICK_TOOLS_ENV_FILE) : path.join(REPO_ROOT, ".env");
}

const KEY_LINE = /^(\s*(?:export\s+)?)([A-Za-z_][A-Za-z0-9_]*)(\s*=\s*)(.*)$/;

/**
 * The shared .env, read fresh each call so changes made while the server
 * runs are picked up. Real environment variables win, the same as
 * lib/comick_tools/env.py.
 */
export function readEnv(): Record<string, string> {
  const values: Record<string, string> = {};
  try {
    const text = fs.readFileSync(envPath(), "utf8").replace(/^﻿/, "");
    for (const line of text.split(/\r?\n/)) {
      const match = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/.exec(line);
      if (!match) continue;
      let value = match[2];
      const quoted = /^(["'])(.*)\1$/.exec(value);
      value = quoted ? quoted[2] : value.replace(/\s+#.*$/, "");
      values[match[1]] = value;
    }
  } catch {
    // No .env yet is a normal first run.
  }
  for (const [key, value] of Object.entries(process.env)) {
    if (key.startsWith("COMICK_") && value) values[key] = value;
  }
  return values;
}

/** Whether .env exists with anything in it. */
export function envExists(): boolean {
  try {
    return fs.readFileSync(envPath(), "utf8").trim().length > 0;
  } catch {
    return false;
  }
}

/** The one check every gate uses: nothing goes to ComicK until this is true. */
export function termsAccepted(): boolean {
  return (readEnv().COMICK_AGREED_TO_TERMS ?? "").trim().toLowerCase() === "true";
}

function formatValue(value: string): string {
  if (/[\r\n\0]/.test(value)) throw new Error("Values can't contain line breaks");
  if (value === "" || !/[\s#'"]/.test(value)) return value;
  if (!value.includes('"')) return `"${value}"`;
  if (!value.includes("'")) return `'${value}'`;
  throw new Error("Values can't contain both kinds of quote");
}

/**
 * Write keys into .env, leaving every other line exactly as it was. Same
 * rules as set_env_values in lib/comick_tools/env.py: keys change in
 * place, new ones go at the end, a missing or empty .env starts from
 * .env.example, and the write goes through a temp file and a rename.
 */
export function writeEnv(updates: Record<string, string>) {
  const file = envPath();
  const formatted = Object.fromEntries(Object.entries(updates).map(([k, v]) => [k, formatValue(v)]));
  let raw = fs.existsSync(file) ? fs.readFileSync(file) : Buffer.alloc(0);
  if (!raw.toString("utf8").trim()) {
    const example = file === path.join(REPO_ROOT, ".env") ? path.join(REPO_ROOT, ".env.example") : path.join(path.dirname(file), ".env.example");
    raw = fs.existsSync(example) ? fs.readFileSync(example) : Buffer.alloc(0);
  }
  let text = raw.toString("utf8");
  const bom = text.startsWith("﻿");
  if (bom) text = text.slice(1);
  const newline = text.includes("\r\n") ? "\r\n" : "\n";
  const lines = text.split(/\r?\n/);
  if (lines.length && lines[lines.length - 1] === "") lines.pop();

  for (const [key, value] of Object.entries(formatted)) {
    let done = false;
    // The last copy of a key is the one readers end up with.
    for (let i = lines.length - 1; i >= 0; i--) {
      const match = KEY_LINE.exec(lines[i]);
      if (match && match[2] === key) {
        lines[i] = match[1] + key + match[3] + value;
        done = true;
        break;
      }
    }
    if (!done) lines.push(`${key}=${value}`);
  }

  const data = (bom ? "﻿" : "") + lines.join(newline) + newline;
  const temp = `${file}.tmp`;
  fs.writeFileSync(temp, data, "utf8");
  try {
    fs.renameSync(temp, file);
  } catch {
    // Windows can refuse the rename while something has .env open.
    fs.writeFileSync(file, data, "utf8");
    fs.rmSync(temp, { force: true });
  }
}
