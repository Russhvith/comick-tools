import { NextResponse } from "next/server";
import { rejectRemote } from "@/lib/guard";
import { listRuns, startScript, summary } from "@/lib/runs";
import { buildArgs, findScript } from "@/lib/tools";
import { updateRunning } from "@/lib/update";

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
  if (updateRunning()) {
    return NextResponse.json({ error: "An update is running, try again once it's done" }, { status: 409 });
  }

  let body: { tool?: string; script?: string; values?: Record<string, unknown> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Expected a JSON body" }, { status: 400 });
  }
  const found = findScript(String(body.tool || ""), String(body.script || ""));
  if (!found) return NextResponse.json({ error: "No such tool or script" }, { status: 404 });

  let args: string[];
  try {
    args = buildArgs(found.script, body.values || {});
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
  const run = startScript(`${found.tool.name}: ${found.script.title}`, found.tool.id, found.file, args);
  return NextResponse.json({ run: summary(run) }, { status: 201 });
}
