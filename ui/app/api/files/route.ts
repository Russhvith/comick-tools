import fs from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { rejectRemote } from "@/lib/server/guard";
import { resolveToolFile } from "@/lib/server/tools";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// A season dump is a few hundred KB. Anything far past that is more likely
// a mistake than something worth editing in a textarea.
const MAX_BYTES = 5 * 1024 * 1024;

function target(req: Request) {
  const url = new URL(req.url);
  return resolveToolFile(url.searchParams.get("tool") || "", url.searchParams.get("path") || "");
}

export async function GET(req: Request) {
  const refused = rejectRemote(req);
  if (refused) return refused;
  const file = target(req);
  if (!file) return NextResponse.json({ error: "That file isn't one this tool lets you edit" }, { status: 404 });
  try {
    const stat = await fs.stat(file);
    if (stat.size > MAX_BYTES) return NextResponse.json({ error: "Too big to open here" }, { status: 413 });
    return NextResponse.json({ exists: true, content: await fs.readFile(file, "utf8"), modifiedAt: stat.mtimeMs });
  } catch {
    return NextResponse.json({ exists: false, content: "", modifiedAt: null });
  }
}

export async function PUT(req: Request) {
  const refused = rejectRemote(req);
  if (refused) return refused;
  const file = target(req);
  if (!file) return NextResponse.json({ error: "That file isn't one this tool lets you edit" }, { status: 404 });
  let content: string;
  try {
    content = String((await req.json()).content ?? "");
  } catch {
    return NextResponse.json({ error: "Expected a JSON body" }, { status: 400 });
  }
  if (Buffer.byteLength(content, "utf8") > MAX_BYTES) return NextResponse.json({ error: "Too big to save" }, { status: 413 });
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, content, "utf8");
  const stat = await fs.stat(file);
  return NextResponse.json({ ok: true, modifiedAt: stat.mtimeMs });
}
