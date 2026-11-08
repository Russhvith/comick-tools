import fs from "node:fs";
import path from "node:path";
import { GROUPS, REPO_ROOT, TOOLS_DIR, isInside } from "./paths";

export type Field =
  | { flag: string; type: "bool"; label: string }
  | { flag: string; type: "text"; label: string; placeholder?: string }
  | { flag: string; type: "select"; label: string; options: string[] };

export type Script = { id: string; file: string; title: string; summary: string; fields: Field[] };
export type ToolFile = { path: string; label: string; hint?: string };

export type Tool = {
  /** group/folder, e.g. public/crunchyroll-importer */
  id: string;
  group: (typeof GROUPS)[number];
  folder: string;
  name: string;
  summary: string;
  scripts: Script[];
  files: ToolFile[];
};

/**
 * Every tool with a tool.json, read fresh on each call so a new tool or an
 * edited manifest shows up on the next page load without a restart.
 */
export function loadTools(): Tool[] {
  const tools: Tool[] = [];
  for (const group of GROUPS) {
    const groupDir = path.join(TOOLS_DIR, group);
    if (!fs.existsSync(groupDir)) continue;
    for (const folder of fs.readdirSync(groupDir).sort()) {
      const manifest = path.join(groupDir, folder, "tool.json");
      if (!fs.existsSync(manifest)) continue;
      try {
        const raw = JSON.parse(fs.readFileSync(manifest, "utf8"));
        tools.push({
          id: `${group}/${folder}`,
          group,
          folder,
          name: String(raw.name || folder),
          summary: String(raw.summary || ""),
          scripts: Array.isArray(raw.scripts) ? raw.scripts : [],
          files: Array.isArray(raw.files) ? raw.files : [],
        });
      } catch {
        // A broken manifest hides that one tool rather than the whole menu.
      }
    }
  }
  return tools;
}

export function findScript(toolId: string, scriptId: string) {
  const tool = loadTools().find((t) => t.id === toolId);
  const script = tool?.scripts.find((s) => s.id === scriptId);
  if (!tool || !script) return null;
  const file = path.join(TOOLS_DIR, tool.group, tool.folder, script.file);
  if (!isInside(TOOLS_DIR, file) || !fs.existsSync(file)) return null;
  return { tool, script, file };
}

/**
 * Turn form values into argv, only for fields the manifest declares.
 *
 * Text goes out as a single `--flag=value` argument so a value starting
 * with a dash can't be read as a separate option. Nothing passes through
 * a shell.
 */
export function buildArgs(script: Script, values: Record<string, unknown>): string[] {
  const args: string[] = [];
  for (const field of script.fields) {
    const value = values[field.flag];
    if (value === undefined || value === null || value === "" || value === false) continue;
    if (field.type === "bool") {
      if (value === true) args.push(field.flag);
      continue;
    }
    const text = String(value).trim();
    if (!text) continue;
    if (text.length > 2000 || text.includes("\0") || /[\r\n]/.test(text)) {
      throw new Error(`${field.label} has characters or a length the script won't accept`);
    }
    if (field.type === "select" && !field.options.includes(text)) {
      throw new Error(`${field.label} must be one of ${field.options.join(", ")}`);
    }
    args.push(`${field.flag}=${text}`);
  }
  return args;
}

/** Absolute path of a data file the tool's manifest lists, or null. */
export function resolveToolFile(toolId: string, rel: string): string | null {
  const tool = loadTools().find((t) => t.id === toolId);
  if (!tool || !tool.files.some((f) => f.path === rel)) return null;
  const toolDir = path.join(TOOLS_DIR, tool.group, tool.folder);
  const full = path.resolve(toolDir, rel);
  return isInside(toolDir, full) ? full : null;
}

/** Whether the shared .env (or the environment) has a session cookie. */
export function cookieConfigured(): boolean {
  if (process.env.COMICK_SESSION_TOKEN?.trim()) return true;
  try {
    const text = fs.readFileSync(path.join(REPO_ROOT, ".env"), "utf8");
    return /^\s*(export\s+)?COMICK_SESSION_TOKEN\s*=\s*["']?[^"'\s#]+/m.test(text);
  } catch {
    return false;
  }
}
