// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2026 Russhvith

// The UI's HTTP server, for both `npm start` (through serve.mjs) and
// `npm run dev` (with --dev). Next runs inside it rather than as `next
// start` or `next dev`, so every request and WebSocket upgrade passes
// gate.mjs first. That matters most in dev, where Next answers its own
// endpoints before proxy.ts ever runs.

import http from "node:http";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { gate, networkMode, requestFacts } from "./gate.mjs";

const uiDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dev = process.argv.includes("--dev");
const port = Number(process.env.COMICK_TOOLS_PORT || "4321");

// Next reads NODE_ENV while it loads, so it has to be set before the import.
process.env.NODE_ENV = dev ? "development" : "production";

// The bind is decided once, here. Network mode leaves the hostname out so
// other devices can connect at all. Turning it off later refuses them at
// the gate straight away, and the next restart moves back to localhost.
const network = networkMode(uiDir);
// Settings compares this with .env to say when a restart is needed.
process.env.COMICK_TOOLS_LISTENING = network ? "network" : "local";

const { default: next } = await import("next");
const app = next({ dev, dir: uiDir, hostname: "localhost", port });
await app.prepare();
const handle = app.getRequestHandler();
// Left alone, Next adds its own "upgrade" listener on the first request,
// and that one would hand the hot reload socket over without our check.
// Claim the setup as done and forward upgrades ourselves below.
app.didWebSocketSetup = true;

function refuse(res, refusal) {
  res.writeHead(refusal.status, { "Content-Type": "application/json", "Cache-Control": "no-store" });
  res.end(JSON.stringify({ error: refusal.error }));
}

const server = http.createServer((req, res) => {
  const refusal = gate(requestFacts(req, uiDir));
  if (refusal) {
    refuse(res, refusal);
    return;
  }
  handle(req, res).catch((error) => {
    console.error(error);
    if (!res.headersSent) refuse(res, { status: 500, error: "Internal error" });
    else res.end();
  });
});

server.on("upgrade", (req, socket, head) => {
  if (gate(requestFacts(req, uiDir, true))) {
    socket.destroy();
    return;
  }
  app.upgradeHandler(req, socket, head);
});

server.on("request", () => {
  // A Next upgrade could slip in a listener of its own. Better to stop
  // than to serve the hot reload socket ungated.
  if (server.listenerCount("upgrade") !== 1) {
    console.error("Next added its own WebSocket listener, which skips the access check. Stopping.");
    process.exit(1);
  }
});

server.listen(port, network ? undefined : "localhost", () => {
  console.log(`  Ready on http://localhost:${port}${dev ? " (dev)" : ""}`);
  if (network) {
    for (const list of Object.values(os.networkInterfaces())) {
      for (const entry of list ?? []) {
        if (entry.family === "IPv4" && !entry.internal) console.log(`  Network: http://${entry.address}:${port}`);
      }
    }
  }
});
