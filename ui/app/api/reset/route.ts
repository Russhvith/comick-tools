// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2026 Russhvith

import { NextResponse } from "next/server";
import { rejectRemote } from "@/lib/server/guard";
import { listRuns } from "@/lib/server/runs";
import { resetTool } from "@/lib/server/tools";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Start a tool over by clearing the data its manifest names. Asking twice
 * is harmless, the second time there's just nothing left to remove.
 */
export async function POST(req: Request) {
  const refused = rejectRemote(req);
  if (refused) return refused;
  let tool = "";
  try {
    tool = String((await req.json()).tool ?? "");
  } catch {
    return NextResponse.json({ error: "Expected a JSON body" }, { status: 400 });
  }
  // A script halfway through writing these files would come back with a
  // mix of old and new, so wait for it.
  if (listRuns().some((r) => r.status === "running" && r.toolId === tool)) {
    return NextResponse.json({ error: "A run of this tool is going. Stop it or wait for it to finish first." }, { status: 409 });
  }
  const result = resetTool(tool);
  if (!result) return NextResponse.json({ error: "This tool has nothing to start over" }, { status: 404 });
  return NextResponse.json(result);
}
