// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2026 Russhvith

import { NextResponse } from "next/server";
import { rejectRemote } from "@/lib/server/guard";
import { checkSettings, readSettings, saveSettings } from "@/lib/server/settings";
import type { SettingsUpdate } from "@/types/settings";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const noStore = { "Cache-Control": "no-store" };

/** What's in .env, without the cookie itself. */
export async function GET(req: Request) {
  const refused = rejectRemote(req);
  if (refused) return refused;
  return NextResponse.json(readSettings(), { headers: noStore });
}

/** Change .env. Fields left out stay as they are. */
export async function PUT(req: Request) {
  const refused = rejectRemote(req);
  if (refused) return refused;
  let body: SettingsUpdate;
  try {
    const raw = await req.json();
    const pick = (k: keyof SettingsUpdate) => (typeof raw?.[k] === "string" ? (raw[k] as string) : undefined);
    body = {
      cookie: pick("cookie"),
      uploadsPerSecond: pick("uploadsPerSecond"),
      requestsPerMinute: pick("requestsPerMinute"),
      apiBase: pick("apiBase"),
      network: typeof raw?.network === "boolean" ? raw.network : undefined,
    };
  } catch {
    return NextResponse.json({ error: "Expected a JSON body" }, { status: 400 });
  }
  const problems = checkSettings(body);
  if (Object.keys(problems).length) return NextResponse.json({ error: "Some settings need fixing", problems }, { status: 400, headers: noStore });
  try {
    saveSettings(body);
  } catch (error) {
    // Never echo the request back, it can hold the cookie.
    return NextResponse.json({ error: `Couldn't write .env: ${(error as Error).message}` }, { status: 500, headers: noStore });
  }
  return NextResponse.json(readSettings(), { headers: noStore });
}
