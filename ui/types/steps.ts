// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2026 Russhvith

export type StepState = "done" | "pending" | "blocked" | "error";

export type StepStatus = {
  state: StepState;
  /** One specific line, shown next to the step title. */
  text: string;
  /** Later steps that `need` this one wait for it to be ready. */
  ready?: boolean;
  /** When the file behind the step last changed, to spot stale output. */
  modifiedAt?: number | null;
  /** Said before a script that rewrites this step's file is allowed to run. */
  replaceWarning?: string | null;
};
