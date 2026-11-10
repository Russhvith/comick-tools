// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2026 Russhvith

import { NextResponse } from "next/server";
import { rejectRemote } from "@/lib/server/guard";
import { getRun, sendInput, stopRun, summary } from "@/lib/server/runs";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Context = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: Context) {
  const refused = rejectRemote(req);
  if (refused) return refused;
  const run = getRun((await params).id);
  if (!run) return NextResponse.json({ error: "No such run" }, { status: 404 });
  return NextResponse.json({ run: summary(run) });
}

/** Send one line of input, the way pressing Enter in a terminal would. */
export async function POST(req: Request, { params }: Context) {
  const refused = rejectRemote(req);
  if (refused) return refused;
  const run = getRun((await params).id);
  if (!run) return NextResponse.json({ error: "No such run" }, { status: 404 });
  let line = "";
  try {
    line = String((await req.json()).line ?? "");
  } catch {
    return NextResponse.json({ error: "Expected a JSON body" }, { status: 400 });
  }
  if (line.length > 4000 || /[\r\n\0]/.test(line)) {
    return NextResponse.json({ error: "One line at a time, under 4000 characters" }, { status: 400 });
  }
  if (!sendInput(run, line)) return NextResponse.json({ error: "This run isn't taking input" }, { status: 409 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request, { params }: Context) {
  const refused = rejectRemote(req);
  if (refused) return refused;
  const run = getRun((await params).id);
  if (!run) return NextResponse.json({ error: "No such run" }, { status: 404 });
  if (!stopRun(run)) return NextResponse.json({ error: "This run already ended" }, { status: 409 });
  return NextResponse.json({ run: summary(run) });
}
