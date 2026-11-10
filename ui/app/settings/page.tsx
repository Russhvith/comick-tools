// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2026 Russhvith

import type { Metadata } from "next";
import { pageTitle } from "@/config/site";
import { SettingsPage } from "@/features/settings/SettingsPage";
import { loadTools } from "@/lib/server/tools";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: pageTitle("Settings") };

export default function Settings() {
  return <SettingsPage tools={loadTools()} />;
}
