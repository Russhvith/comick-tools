// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2026 Russhvith

import type { StepStatus } from "@/types/steps";
import type { ToolFile } from "@/types/tools";

export type ViewProps = {
  toolId: string;
  file: ToolFile;
  /** Changes whenever a run ends, which is when scripts write these files. */
  refreshKey: number;
  /**
   * Set when the file is left over from an earlier run and shouldn't be
   * shown or edited. The view says this instead of showing its contents,
   * but keeps reporting its status so the flow knows when that changes.
   */
  held?: string | null;
  /** Tell the flow where this step stands so later steps can wait on it. */
  onStatus: (status: StepStatus) => void;
};
