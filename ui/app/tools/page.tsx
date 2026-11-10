// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2026 Russhvith

import { redirect } from "next/navigation";
import { loadTools } from "@/lib/server/tools";

export const dynamic = "force-dynamic";

// /tools on its own opens the first tool, the way the app used to start.
export default function ToolsIndex() {
  const first = loadTools()[0];
  redirect(first ? `/tools/${first.id}` : "/");
}
