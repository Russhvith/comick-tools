import fs from "node:fs";
import path from "node:path";
import type { Script, Step, Tool } from "@/types/tools";
import { GROUPS, REPO_ROOT, TOOLS_DIR, isInside } from "./paths";

/**
 * Keep only steps that point at something real, so a typo in a manifest
 * drops that step instead of rendering an empty box. A tool whose steps
 * all fall away just shows its scripts as tabs.
 */
function readSteps(raw: unknown, scripts: Script[], files: Tool["files"]): Step[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const steps = raw.filter((s): s is Step => {
    if (!s || typeof s !== "object" || typeof s.id !== "string" || typeof s.title !== "string") return false;
    if (typeof s.script === "string") return scripts.some((x) => x.id === s.script);
    return typeof s.file === "string" && files.some((f) => f.path === s.file);
  });
  return steps.length ? steps : undefined;
}

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
        const scripts: Script[] = Array.isArray(raw.scripts) ? raw.scripts : [];
        const files: Tool["files"] = Array.isArray(raw.files) ? raw.files : [];
        tools.push({
          id: `${group}/${folder}`,
          group,
          folder,
          name: String(raw.name || folder),
          summary: String(raw.summary || ""),
          scripts,
          files,
          steps: readSteps(raw.steps, scripts, files),
          flow: typeof raw.flow === "string" ? raw.flow : undefined,
          roleNotes: raw.roleNotes && typeof raw.roleNotes === "object" ? raw.roleNotes : undefined,
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

export const IMAGE_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".avif": "image/avif",
};

/**
 * An image a script saved next to one of the tool's files, like the
 * previews the formatter downloads into data/images. Only image types, and
 * only under a folder that holds a file the manifest lists, so this can't
 * be pointed at the scripts or anything outside the tool.
 */
export function resolveToolImage(toolId: string, rel: string): { full: string; type: string } | null {
  const tool = loadTools().find((t) => t.id === toolId);
  if (!tool) return null;
  const type = IMAGE_TYPES[path.extname(rel).toLowerCase()];
  if (!type) return null;
  const toolDir = path.join(TOOLS_DIR, tool.group, tool.folder);
  const full = path.resolve(toolDir, rel);
  const allowed = new Set(tool.files.map((f) => path.dirname(path.resolve(toolDir, f.path))));
  for (const dir of allowed) {
    if (isInside(toolDir, dir) && isInside(dir, full)) return { full, type };
  }
  return null;
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
