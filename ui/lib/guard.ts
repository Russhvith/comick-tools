import { NextResponse } from "next/server";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);

function hostnameOf(value: string | null): string | null {
  if (!value) return null;
  try {
    return new URL(value.includes("://") ? value : `http://${value}`).hostname;
  } catch {
    return null;
  }
}

/**
 * The server can start scripts that delete things and run git, so it only
 * answers requests addressed to this machine. Checking Host stops DNS
 * rebinding, and checking Origin on writes stops another site in the same
 * browser from posting to it.
 */
export function rejectRemote(req: Request): NextResponse | null {
  const host = hostnameOf(req.headers.get("host"));
  if (!host || !LOCAL_HOSTS.has(host)) {
    return NextResponse.json({ error: "Only reachable from this computer" }, { status: 403 });
  }
  if (req.method !== "GET" && req.method !== "HEAD") {
    const origin = req.headers.get("origin");
    const originHost = hostnameOf(origin);
    if (origin && (!originHost || !LOCAL_HOSTS.has(originHost))) {
      return NextResponse.json({ error: "Cross site request refused" }, { status: 403 });
    }
  }
  return null;
}
