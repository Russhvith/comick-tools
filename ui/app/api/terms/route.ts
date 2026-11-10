// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2026 Russhvith

import { NextResponse } from "next/server";
import { rejectRemote } from "@/lib/server/guard";
import { acceptTerms, readSettings } from "@/lib/server/settings";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Accept the Terms of Service, the same as answering yes on the command line. */
export async function POST(req: Request) {
  const refused = rejectRemote(req);
  if (refused) return refused;
  try {
    acceptTerms();
  } catch (error) {
    return NextResponse.json({ error: `Couldn't write .env: ${(error as Error).message}` }, { status: 500 });
  }
  return NextResponse.json(readSettings(), { headers: { "Cache-Control": "no-store" } });
}
