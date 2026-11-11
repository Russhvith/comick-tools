// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2026 Russhvith

import type { MetadataRoute } from "next";

// The server only listens on 127.0.0.1, so no crawler can reach it anyway.
// Allowing everything keeps audits from reporting the page as blocked.
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", allow: "/" } };
}
