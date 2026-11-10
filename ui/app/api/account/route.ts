import { NextResponse } from "next/server";
import { currentAccount } from "@/lib/server/account";
import { rejectRemote } from "@/lib/server/guard";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Who the .env cookie belongs to. ?refresh=1 skips the short cache. */
export async function GET(req: Request) {
  const refused = rejectRemote(req);
  if (refused) return refused;
  const force = new URL(req.url).searchParams.get("refresh") === "1";
  return NextResponse.json(await currentAccount(force), { headers: { "Cache-Control": "no-store" } });
}
