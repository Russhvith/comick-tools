// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2026 Russhvith

import { Clapperboard, type LucideIcon, Trash2, Wrench } from "lucide-react";
import type { ToolGroup } from "@/types/tools";

// Icons are picked here rather than in tool.json so the manifest stays
// about what a tool does, not how the UI draws it.
const icons: Record<string, LucideIcon> = {
  "public/crunchyroll-importer": Clapperboard,
  "admin/mass-deleter": Trash2,
};

export function toolIcon(toolId: string): LucideIcon {
  return icons[toolId] ?? Wrench;
}

export const groups: Record<ToolGroup, { title: string; note: string; tone: "primary" | "destructive" }> = {
  public: { title: "Public", note: "Works with any account", tone: "primary" },
  admin: { title: "Admin", note: "Needs a trusted, moderator or admin account", tone: "destructive" },
};
