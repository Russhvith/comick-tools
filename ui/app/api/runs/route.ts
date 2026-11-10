// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2026 Russhvith

import { NextResponse } from "next/server";
import { termsAccepted } from "@/lib/server/env";
import { rejectRemote } from "@/lib/server/guard";
import { claim, hashRequest } from "@/lib/server/idempotency";
import { getRun, listRuns, startScript, summary } from "@/lib/server/runs";
import { buildArgs, findScript } from "@/lib/server/tools";
import { updateRunning } from "@/lib/server/update";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const refused = rejectRemote(req);
  if (refused) return refused;
  return NextResponse.json({ runs: listRuns() });
}

export async function POST(req: Request) {
  const refused = rejectRemote(req);
  if (refused) return refused;
  // Checked before the idempotency key is claimed, so a refused start
  // doesn't leave a key waiting on a run that never happens.
  if (!termsAccepted()) {
    return NextResponse.json({ error: "Accept the Terms of Service before running a tool" }, { status: 403 });
  }

  let body: { tool?: string; script?: string; values?: Record<string, unknown> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Expected a JSON body" }, { status: 400 });
  }

  const key = req.headers.get("idempotency-key");
  const requestHash = hashRequest({ tool: body.tool, script: body.script, values: body.values ?? {} });
  const claimed = await claim(key, requestHash);
  if (claimed.kind === "conflict") {
    return NextResponse.json({ error: "That Idempotency-Key was already used for a different request" }, { status: 422 });
  }
  if (claimed.kind === "existing") {
    const run = getRun(claimed.runId);
    if (run) return NextResponse.json({ run: summary(run) }, { status: 200 });
    // Pruned from the history since. The key did its job back then, and
    // starting it again now would be the double run it exists to stop.
    return NextResponse.json({ error: "This request already ran, and that run is no longer in the history" }, { status: 409 });
  }

  // From here every way out settles the claim, or a retry would wait on it
  // forever.
  try {
    if (updateRunning()) {
      claimed.settle(null);
      return NextResponse.json({ error: "An update is running, try again once it's done" }, { status: 409 });
    }
    const found = findScript(String(body.tool || ""), String(body.script || ""));
    if (!found) {
      claimed.settle(null);
      return NextResponse.json({ error: "No such tool or script" }, { status: 404 });
    }
    let args: string[];
    try {
      args = buildArgs(found.script, body.values || {});
    } catch (error) {
      claimed.settle(null);
      return NextResponse.json({ error: (error as Error).message }, { status: 400 });
    }
    const run = startScript(`${found.tool.name}: ${found.script.title}`, found.tool.id, found.file, args, {
      idempotencyKey: key && key.length <= 200 ? key : undefined,
      requestHash,
    });
    claimed.settle(run.id);
    return NextResponse.json({ run: summary(run) }, { status: 201 });
  } catch (error) {
    claimed.settle(null);
    throw error;
  }
}
