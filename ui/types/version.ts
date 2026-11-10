// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2026 Russhvith

export type Release = {
  version: string;
  tag: string;
  name: string;
  url: string;
  publishedAt: string;
  notes: string;
};

export type VersionInfo = {
  current: string;
  commit: string | null;
  branch: string | null;
  latest: Release | null;
  updateAvailable: boolean;
  checkError: string | null;
  supervised: boolean;
  startedAt: number;
};
