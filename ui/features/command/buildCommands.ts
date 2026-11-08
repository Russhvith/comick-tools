import { ArrowUpCircle, BookOpen, ExternalLink, FileText, History, Play, RefreshCw, Square } from "lucide-react";
import type { Command } from "@/components/organisms/CommandPalette";
import { site } from "@/config/site";
import { toolIcon } from "@/config/tools";
import { clockTime } from "@/lib/format";
import type { RunSummary } from "@/types/runs";
import type { Tool } from "@/types/tools";

type Actions = {
  openScript: (toolId: string, scriptId: string) => void;
  openRun: (runId: string) => void;
  stopActive: (() => void) | null;
  checkUpdates: () => void;
  update: (() => void) | null;
  updateLabel?: string;
};

export function buildCommands(tools: Tool[], runs: RunSummary[], actions: Actions): Command[] {
  const commands: Command[] = [];

  for (const tool of tools) {
    for (const script of tool.scripts) {
      commands.push({
        id: `script:${tool.id}:${script.id}`,
        group: "Tools",
        label: tool.scripts.length > 1 ? `${tool.name}: ${script.title}` : tool.name,
        detail: script.summary,
        icon: toolIcon(tool.id),
        keywords: `${tool.group} ${tool.folder} ${script.file}`,
        run: () => actions.openScript(tool.id, script.id),
      });
    }
    for (const file of tool.files) {
      commands.push({
        id: `file:${tool.id}:${file.path}`,
        group: "Files",
        label: file.label,
        detail: `${tool.name}, ${file.path}`,
        icon: FileText,
        keywords: "edit data",
        run: () => actions.openScript(tool.id, tool.scripts[0]?.id ?? ""),
      });
    }
  }

  if (actions.stopActive) {
    commands.push({ id: "run:stop", group: "Runs", label: "Stop the current run", icon: Square, run: actions.stopActive });
  }
  for (const run of runs.slice(0, 8)) {
    commands.push({
      id: `run:${run.id}`,
      group: "Runs",
      label: run.title,
      detail: `${run.status}, started ${clockTime(run.startedAt)}`,
      icon: run.status === "running" ? Play : History,
      keywords: run.status,
      run: () => actions.openRun(run.id),
    });
  }

  if (actions.update) {
    commands.push({ id: "update:run", group: "App", label: actions.updateLabel ?? "Update", icon: ArrowUpCircle, run: actions.update });
  }
  commands.push(
    { id: "update:check", group: "App", label: "Check for updates", icon: RefreshCw, keywords: "version release", run: actions.checkUpdates },
    { id: "link:docs", group: "App", label: "Open the docs on GitHub", icon: BookOpen, run: () => window.open(site.docsUrl, "_blank", "noopener") },
    { id: "link:comick", group: "App", label: "Open ComicK", icon: ExternalLink, run: () => window.open(site.comickUrl, "_blank", "noopener") },
  );

  return commands;
}
