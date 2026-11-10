// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2026 Russhvith

import path from "node:path";

// npm scripts run with ui/ as the working directory, so the repo is one
// level up. COMICK_TOOLS_ROOT is there for running the server from
// somewhere else.
export const REPO_ROOT = process.env.COMICK_TOOLS_ROOT
  ? path.resolve(process.env.COMICK_TOOLS_ROOT)
  : path.resolve(process.cwd(), "..");

export const UI_DIR = path.join(REPO_ROOT, "ui");
export const TOOLS_DIR = path.join(REPO_ROOT, "tools");
export const GROUPS = ["public", "admin"] as const;

/** True when `child` sits inside `parent`, after resolving any ../ tricks. */
export function isInside(parent: string, child: string): boolean {
  const rel = path.relative(parent, child);
  return rel !== "" && !rel.startsWith("..") && !path.isAbsolute(rel);
}
