// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2026 Russhvith

// The checks scripts/server.mjs runs on every request and WebSocket upgrade
// before Next sees it. They live here as plain functions so they can be
// tested without starting a server.
//
// lib/server/guard.ts does a Host and Origin check too, but only on routes
// and pages. Next's own dev endpoints (/__nextjs_*, the hot reload socket)
// run before any of that, and only the socket knows who is really
// connecting, so this is the layer that sees everything.

import { readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);

// Paths a cross-site page has no business loading, even by navigating to
// them. Pages themselves stay linkable, they send anti-framing headers.
const PRIVATE_PREFIXES = ["/api/", "/__nextjs", "/_next/"];

/**
 * COMICK_TOOLS_NETWORK from the environment or the root .env. Read on every
 * call, so turning network mode off in Settings refuses other devices at
 * once, before the restart that moves the listener back to localhost.
 */
export function networkMode(uiDir) {
  if (process.env.COMICK_TOOLS_NETWORK) return process.env.COMICK_TOOLS_NETWORK.trim().toLowerCase() === "true";
  const file = process.env.COMICK_TOOLS_ENV_FILE
    ? path.resolve(process.env.COMICK_TOOLS_ENV_FILE)
    : path.join(uiDir, "..", ".env");
  let text = "";
  try {
    text = readFileSync(file, "utf8").replace(/^﻿/, "");
  } catch {
    return false;
  }
  let value = "";
  for (const line of text.split(/\r?\n/)) {
    const match = /^\s*(?:export\s+)?COMICK_TOOLS_NETWORK\s*=\s*(.*?)\s*$/.exec(line);
    if (match) value = match[1].replace(/^(["'])(.*)\1$/, "$2");
  }
  return value.trim().toLowerCase() === "true";
}

/** This machine's names and addresses, the same list guard.ts builds. */
export function ownHosts() {
  const hosts = new Set();
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

/** Whether a socket's remote address is this machine. */
export function isLoopback(address) {
  if (!address) return false;
  const value = address.toLowerCase();
  if (value === "::1") return true;
  const v4 = value.startsWith("::ffff:") ? value.slice(7) : value;
  return /^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(v4);
}

function hostnameOf(value) {
  if (!value) return null;
  try {
    return new URL(value.includes("://") ? value : `http://${value}`).hostname.toLowerCase();
  } catch {
    return null;
  }
}

function originHostPort(origin) {
  try {
    return new URL(origin).host.toLowerCase();
  } catch {
    return null;
  }
}

function hostAllowed(host, network, hosts) {
  return LOCAL_HOSTS.has(host) || (network && hosts.has(host));
}

/**
 * Null when the request may go on, otherwise { status, error }.
 *
 * - peer: the socket's remote address. Headers can be forged, the socket
 *   can't, so this is what keeps other devices out with network mode off.
 * - host: the Host header. Refusing foreign names stops DNS rebinding.
 * - site and mode: Sec-Fetch-Site and Sec-Fetch-Mode. A browser sends them
 *   on every request, so another site can't load the API or Next's dev
 *   endpoints, not even with a plain link or a hidden image. Clients that
 *   send neither aren't browsers, and the peer check covers them.
 * - origin: only checked on upgrades, where a browser always sends it.
 */
export function gate({ peer, host, method, url, site, mode, origin, upgrade = false, network, hosts }) {
  if (!isLoopback(peer) && !network) return { status: 403, error: "Only reachable from this computer" };

  const hostname = hostnameOf(host);
  if (!hostname || !hostAllowed(hostname, network, hosts)) {
    return { status: 403, error: "Only reachable from this computer" };
  }

  // The whole origin has to match, port included, since a page served by
  // some other local dev server is "localhost" too.
  if (upgrade && origin && originHostPort(origin) !== String(host).toLowerCase()) {
    return { status: 403, error: "Cross site request refused" };
  }

  if (site && site !== "same-origin" && site !== "none") {
    const pathname = (url || "/").split("?")[0];
    const isPrivate = PRIVATE_PREFIXES.some((prefix) => pathname.startsWith(prefix));
    const navigation = mode === "navigate" && (method === "GET" || method === "HEAD");
    if (upgrade || isPrivate || !navigation) return { status: 403, error: "Cross site request refused" };
  }
  return null;
}

/** The gate's input for a Node request, read fresh each time. */
export function requestFacts(req, uiDir, upgrade = false) {
  const header = (name) => {
    const value = req.headers[name];
    return Array.isArray(value) ? value[0] : value;
  };
  return {
    peer: req.socket?.remoteAddress,
    host: header("host"),
    method: req.method,
    url: req.url,
    site: header("sec-fetch-site"),
    mode: header("sec-fetch-mode"),
    origin: header("origin"),
    upgrade,
    network: networkMode(uiDir),
    hosts: ownHosts(),
  };
}
