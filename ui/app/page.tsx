// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2026 Russhvith

import type { Metadata } from "next";
import { pageTitle } from "@/config/site";
import { HomePage } from "@/features/home/HomePage";
import { repoSnapshot } from "@/lib/server/repo";
import { listRuns } from "@/lib/server/runs";
import { loadTools } from "@/lib/server/tools";
import { localVersion } from "@/lib/server/version";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: pageTitle() };

export default async function Home() {
  // The date in local time, the same calendar git's short dates use.
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const { days, count: commits, changelog: releases } = await repoSnapshot(today);
  return (
    <HomePage
      tools={loadTools()}
      version={localVersion()}
      runCount={listRuns().length}
      commitCount={commits}
      days={days}
      changelog={releases}
      today={today}
    />
  );
}
