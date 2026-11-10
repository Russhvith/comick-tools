// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2026 Russhvith

import { NextResponse } from "next/server";
import { rejectRemote } from "@/lib/server/guard";
import { versionInfo } from "@/lib/server/version";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const refused = rejectRemote(req);
  if (refused) return refused;
  const force = new URL(req.url).searchParams.get("refresh") === "1";
  return NextResponse.json(await versionInfo(force));
}
