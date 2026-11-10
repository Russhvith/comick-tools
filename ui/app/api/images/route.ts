import fs from "node:fs/promises";
import { NextResponse } from "next/server";
import { rejectRemote } from "@/lib/server/guard";
import { resolveToolImage } from "@/lib/server/tools";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// A 1080p PNG preview is a few MB at most.
const MAX_BYTES = 20 * 1024 * 1024;

export async function GET(req: Request) {
  const refused = rejectRemote(req);
  if (refused) return refused;
  const url = new URL(req.url);
  const image = resolveToolImage(url.searchParams.get("tool") || "", url.searchParams.get("path") || "");
  if (!image) return NextResponse.json({ error: "Not an image this tool keeps" }, { status: 404 });

  let stat;
  try {
    stat = await fs.stat(image.full);
  } catch {
    return NextResponse.json({ error: "Image not found" }, { status: 404 });
  }
  if (!stat.isFile() || stat.size > MAX_BYTES) return NextResponse.json({ error: "Image not found" }, { status: 404 });

  // Every format run rewrites the images under the same names, so the
  // browser has to check back each time. The tag makes that a cheap 304.
  const etag = `"${stat.size.toString(36)}-${Math.floor(stat.mtimeMs).toString(36)}"`;
  const headers = {
    "Content-Type": image.type,
    "Cache-Control": "private, no-cache",
    ETag: etag,
    "X-Content-Type-Options": "nosniff",
  };
  if (req.headers.get("if-none-match") === etag) return new NextResponse(null, { status: 304, headers });
  return new NextResponse(new Uint8Array(await fs.readFile(image.full)), { headers });
}
