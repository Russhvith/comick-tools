// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2026 Russhvith

import os from "node:os";
import { NextResponse } from "next/server";
import { readEnv } from "./env";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);

/** Whether COMICK_TOOLS_NETWORK=true lets other devices on the network in. */
export function networkMode(): boolean {
  return (readEnv().COMICK_TOOLS_NETWORK ?? "").trim().toLowerCase() === "true";
}

/**
 * This machine's own names and addresses, the only other hosts allowed in
 * network mode. A fixed list rather than "anything" keeps DNS rebinding
 * out: a foreign domain pointed at this machine still carries its own name
 * in Host and gets refused.
 */
function ownHosts(): Set<string> {
  const hosts = new Set<string>();
  const name = os.hostname().toLowerCase();
  hosts.add(name);
  hosts.add(`${name}.local`);
  for (const list of Object.values(os.networkInterfaces())) {
    for (const entry of list ?? []) {
      const address = entry.address.toLowerCase().split("%")[0];
      hosts.add(entry.family === "IPv6" ? `[${address}]` : address);
    }
  }
  return hosts;
}

function allowed(host: string): boolean {
  if (LOCAL_HOSTS.has(host)) return true;
  // Interfaces come and go (Wi-Fi, VPN), so they're read per request. It's a
  // handful of entries from the OS, cheap next to anything the route does.
  return networkMode() && ownHosts().has(host);
}

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
 * answers requests addressed to this machine: localhost, plus its own
 * network names and addresses when network mode is on. Checking Host stops
 * DNS rebinding, and checking Origin on writes stops another site in the
 * same browser from posting to it.
 */
export function rejectRemote(req: Request): NextResponse | null {
  const host = hostnameOf(req.headers.get("host"));
  if (!host || !allowed(host)) {
    return NextResponse.json({ error: "Only reachable from this computer" }, { status: 403 });
  }
  if (req.method !== "GET" && req.method !== "HEAD") {
    const origin = req.headers.get("origin");
    const originHost = hostnameOf(origin);
    if (origin && (!originHost || !allowed(originHost))) {
      return NextResponse.json({ error: "Cross site request refused" }, { status: 403 });
    }
  }
  return null;
}
