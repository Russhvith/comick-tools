// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2026 Russhvith

export type RunStatus = "running" | "done" | "failed" | "stopped";

export type RunEvent =
  | { type: "output"; text: string }
  | { type: "exit"; status: RunStatus; code: number | null }
  | { type: "ping" };

export type RunSummary = {
  id: string;
  kind: "script" | "update";
  title: string;
  toolId?: string;
  startedAt: number;
  endedAt?: number;
  status: RunStatus;
  code: number | null;
  acceptsInput: boolean;
};
