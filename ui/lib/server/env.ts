import fs from "node:fs";
import path from "node:path";
import { REPO_ROOT } from "./paths";

/**
 * The shared .env at the repo root, read fresh each call so a cookie
 * pasted in while the server runs is picked up. Real environment
 * variables win, the same as lib/comick_tools/env.py.
 */
export function readEnv(): Record<string, string> {
  const values: Record<string, string> = {};
  try {
    for (const line of fs.readFileSync(path.join(REPO_ROOT, ".env"), "utf8").split(/\r?\n/)) {
      const match = /^\s*(?:export\s+)?([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(line);
      if (!match) continue;
      let value = match[2];
      const quoted = /^(["'])(.*)\1$/.exec(value);
      value = quoted ? quoted[2] : value.replace(/\s+#.*$/, "");
      values[match[1]] = value;
    }
  } catch {
    // No .env yet is a normal first run.
  }
  for (const [key, value] of Object.entries(process.env)) {
    if (key.startsWith("COMICK_") && value) values[key] = value;
  }
  return values;
}
