// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2026 Russhvith

export function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}
