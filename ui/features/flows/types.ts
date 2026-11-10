// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2026 Russhvith

import type { RunSummary } from "@/types/runs";
import type { Tool } from "@/types/tools";

export type FlowProps = {
  tool: Tool;
  /** Another run is going, so starting one now isn't allowed. */
  busy: boolean;
  onStarted: (run: RunSummary) => void;
};
