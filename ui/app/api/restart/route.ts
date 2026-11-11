// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2026 Russhvith

import { NextResponse } from "next/server";
import { rejectRemote } from "@/lib/server/guard";
import { listRuns } from "@/lib/server/runs";
import { RESTART_EXIT_CODE, updateRunning } from "@/lib/server/update";
import { SERVER_STARTED_AT } from "@/lib/server/version";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Restart the server so a setting it reads at start (network mode) takes
 * effect. Same exit code the updater uses, which serve.mjs answers by
 * starting it again.
 */
export async function POST(req: Request) {
  const refused = rejectRemote(req);
  if (refused) return refused;
  if (process.env.COMICK_TOOLS_SUPERVISED !== "1") {
    return NextResponse.json({ error: "Only a server started with npm start can restart itself. Stop it and start it again." }, { status: 409 });
  }
  if (updateRunning()) return NextResponse.json({ error: "An update is running, it restarts the server when it's done" }, { status: 409 });
  // Restarting ends every script it started, so never in the middle of one.
  if (listRuns().some((r) => r.status === "running")) {
    return NextResponse.json({ error: "A script is still running. Let it finish or stop it first." }, { status: 409 });
  }
  // Long enough for this answer to reach the browser before the process goes.
  setTimeout(() => process.exit(RESTART_EXIT_CODE), 300);
  return NextResponse.json({ startedAt: SERVER_STARTED_AT });
}
