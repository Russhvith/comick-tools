import { NextResponse } from "next/server";
import { rejectRemote } from "@/lib/guard";
import { cookieConfigured, loadTools } from "@/lib/tools";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const refused = rejectRemote(req);
  if (refused) return refused;
  return NextResponse.json({ tools: loadTools(), cookieSet: cookieConfigured() });
}
