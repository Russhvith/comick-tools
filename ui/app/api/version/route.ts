import { NextResponse } from "next/server";
import { rejectRemote } from "@/lib/guard";
import { versionInfo } from "@/lib/version";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const refused = rejectRemote(req);
  if (refused) return refused;
  const force = new URL(req.url).searchParams.get("refresh") === "1";
  return NextResponse.json(await versionInfo(force));
}
