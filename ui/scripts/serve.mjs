// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2026 Russhvith

// Runs the production server and brings it back after an in-app update.
//
// The update route exits the server with RESTART_EXIT_CODE once it has
// pulled and rebuilt. Any other exit ends this script too, so Ctrl+C and
// real crashes behave the way they would with plain `next start`.

import { spawn, spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RESTART_EXIT_CODE = 75;
const uiDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const nextBin = createRequire(import.meta.url).resolve("next/dist/bin/next");
const port = process.env.COMICK_TOOLS_PORT || "4321";

/**
 * COMICK_TOOLS_NETWORK from the environment or the root .env, read the
 * same way the server reads .env. Only this one key is needed here, before
 * Next has started.
 */
function networkMode() {
  if (process.env.COMICK_TOOLS_NETWORK) return process.env.COMICK_TOOLS_NETWORK.trim().toLowerCase() === "true";
  const file = process.env.COMICK_TOOLS_ENV_FILE
    ? path.resolve(process.env.COMICK_TOOLS_ENV_FILE)
    : path.join(uiDir, "..", ".env");
  let text = "";
  try {
    text = readFileSync(file, "utf8").replace(/^\uFEFF/, "");
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

// This computer only, unless network mode is on. The server can run scripts
// that delete things with the saved cookie, so anyone who can reach it can
// do that too. 0.0.0.0 also makes Next print the network address.
const network = networkMode();
const host = network ? "0.0.0.0" : "localhost";

if (!existsSync(path.join(uiDir, ".next", "BUILD_ID"))) {
  console.log("No production build yet, building first...");
  const build = spawnSync(process.execPath, [nextBin, "build"], { cwd: uiDir, stdio: "inherit" });
  if (build.status !== 0) process.exit(build.status ?? 1);
}

let child;

function start() {
  child = spawn(process.execPath, [nextBin, "start", "--hostname", host, "--port", port], {
    cwd: uiDir,
    stdio: "inherit",
    env: { ...process.env, COMICK_TOOLS_SUPERVISED: "1" },
  });
  child.on("exit", (code, signal) => {
    if (code === RESTART_EXIT_CODE) {
      console.log("\nRestarting on the updated build...\n");
      start();
      return;
    }
    process.exit(signal ? 1 : (code ?? 0));
  });
}

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    if (child && child.exitCode === null) child.kill(signal);
    else process.exit(0);
  });
}

console.log(`comick-tools UI on http://localhost:${port}`);
if (network) {
  console.log("Network mode is on: anyone on your network can open it and run the tools with your ComicK cookie.");
  console.log("Set COMICK_TOOLS_NETWORK=false in .env to keep it on this computer only.");
}
start();
