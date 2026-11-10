// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2026 Russhvith

import { redirect } from "next/navigation";

// /legal on its own opens the terms, the first of the three.
export default function LegalIndex() {
  redirect("/legal/terms");
}
