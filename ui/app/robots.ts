// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2026 Russhvith

import type { MetadataRoute } from "next";

// The UI only ever runs on the user's own machine, so there is nothing here
// for a crawler to index.
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", disallow: "/" } };
}
