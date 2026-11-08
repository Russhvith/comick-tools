import { NextResponse } from "next/server";
import { rejectRemote } from "@/lib/server/guard";
import { summary } from "@/lib/server/runs";
import { startUpdate, updateRunning } from "@/lib/server/update";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  const refused = rejectRemote(req);
  if (refused) return refused;
  if (updateRunning()) return NextResponse.json({ error: "An update is already running" }, { status: 409 });
  return NextResponse.json({ run: summary(startUpdate()) }, { status: 201 });
}
