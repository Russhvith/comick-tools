"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Banner } from "@/components/molecules/Banner";
import { SegmentedControl } from "@/components/molecules/SegmentedControl";
import { CommandPalette } from "@/components/organisms/CommandPalette";
import { useToast } from "@/components/organisms/Toaster";
import { TopBar } from "@/components/organisms/TopBar";
import { AppShell } from "@/components/templates/AppShell";
import { shortcuts } from "@/config/shortcuts";
import { pageTitle, site } from "@/config/site";
import { flows } from "@/features/flows";
import { useHotkey } from "@/hooks/useHotkey";
import { useViewTransition } from "@/hooks/useViewTransition";
import { buildCommands } from "@/features/command/buildCommands";
import { FileEditor } from "@/features/files/components/FileEditor";
import { stopRun } from "@/features/runs/api";
import { RecentRuns } from "@/features/runs/components/RecentRuns";
import { RunConsole } from "@/features/runs/components/RunConsole";
import { addRunOptimistically, markRun, useRuns } from "@/features/runs/useRuns";
import { StepFlow } from "@/features/steps/StepFlow";
import { ScriptForm } from "@/features/tools/components/ScriptForm";
import { ToolHeader } from "@/features/tools/components/ToolHeader";
import { ToolNav } from "@/features/tools/components/ToolNav";
import { RestartOverlay } from "@/features/updates/components/RestartOverlay";
import { UpdateControl } from "@/features/updates/components/UpdateControl";
import { startUpdate, useVersion, waitForRestart } from "@/features/updates/useVersion";
import type { RunStatus, RunSummary } from "@/types/runs";
import type { Tool } from "@/types/tools";
import styles from "./Workbench.module.css";

type Props = {
  tools: Tool[];
  /** The tool the URL named when the page loaded. */
  initialToolId: string;
  cookieSet: boolean;
  version: string;
  initialRuns: RunSummary[];
};

const toolPath = (id: string) => `/tools/${id}`;

export function Workbench({ tools, initialToolId, cookieSet, version, initialRuns }: Props) {
  // The URL is the source of truth for which tool is open, so the sidebar,
  // search and the back button all agree. Switching pushes a new entry
  // without a server round trip, which keeps the console and its run alive.
  const pathname = usePathname();
  const fromPath = pathname?.startsWith("/tools/") ? pathname.slice("/tools/".length).replace(/\/$/, "") : null;
  const toolId = tools.some((t) => t.id === fromPath) ? fromPath! : initialToolId;
  const [scriptId, setScriptId] = useState(tools.find((t) => t.id === toolId)?.scripts[0]?.id);
  const [activeRunId, setActiveRunId] = useState<string | null>(() => initialRuns.find((r) => r.status === "running")?.id ?? null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [restarting, setRestarting] = useState(false);
  const [updateWatch, setUpdateWatch] = useState<{ runId: string; startedAt: number } | null>(null);

  const { runs, busy, refresh } = useRuns(initialRuns);
  const { data: versionInfo, checkNow } = useVersion();
  const toast = useToast();
  const transition = useViewTransition();

  const tool = tools.find((t) => t.id === toolId);
  const Flow = tool?.flow ? flows[tool.flow] : undefined;
  const script = tool?.scripts.find((s) => s.id === scriptId) ?? tool?.scripts[0];
  const activeRun = runs.find((r) => r.id === activeRunId) ?? null;
  // A tool with steps uses all its scripts on one page, otherwise just
  // the one that's selected.
  const needsCookie = !cookieSet && !!tool && (tool.steps ? tool.scripts.some((s) => s.needsCookie) : !!script?.needsCookie);

  // Tools switch without a navigation, so the tab title follows by hand.
  useEffect(() => {
    document.title = pageTitle(tool?.name);
  }, [tool?.name]);

  const openScript = useCallback(
    (nextTool: string, nextScript: string) => {
      transition(() => {
        if (nextTool !== toolId) window.history.pushState(null, "", toolPath(nextTool));
        setScriptId(nextScript);
      });
    },
    [transition, toolId],
  );

  const openRun = useCallback(
    (id: string) => {
      setActiveRunId(id);
      void refresh();
    },
    [refresh],
  );

  function onStarted(run: RunSummary) {
    addRunOptimistically(run);
    setActiveRunId(run.id);
  }

  async function stopActive() {
    if (!activeRun) return;
    markRun(activeRun.id, { status: "stopped", endedAt: Date.now() });
    try {
      await stopRun(activeRun.id);
    } catch (e) {
      toast({ tone: "error", message: (e as Error).message });
    }
    void refresh();
  }

  async function update() {
    try {
      const run = await startUpdate();
      addRunOptimistically(run);
      setActiveRunId(run.id);
      setUpdateWatch({ runId: run.id, startedAt: versionInfo?.startedAt ?? 0 });
    } catch (e) {
      toast({ tone: "error", message: (e as Error).message });
    }
  }

  function onExit(status: RunStatus, code: number | null) {
    if (activeRunId) markRun(activeRunId, { status, code, endedAt: Date.now() });
    setRefreshKey((k) => k + 1);
    void refresh();
    if (updateWatch && updateWatch.runId === activeRunId && status === "done") {
      setUpdateWatch(null);
      void waitForRestart(updateWatch.startedAt, setRestarting);
    }
  }

  async function checkUpdates() {
    try {
      await checkNow();
      toast({ tone: "success", message: "Checked GitHub for a newer release" });
    } catch (e) {
      toast({ tone: "error", message: `Couldn't check for updates: ${(e as Error).message}` });
    }
  }

  useHotkey(shortcuts.commandMenu.combo, () => setPaletteOpen((open) => !open));

  const commands = buildCommands(tools, runs, {
    openScript,
    openRun,
    stopActive: activeRun?.status === "running" && activeRun.kind === "script" ? () => void stopActive() : null,
    checkUpdates: () => void checkUpdates(),
    update: versionInfo?.updateAvailable ? () => void update() : null,
    updateLabel: versionInfo?.latest ? `Update to ${versionInfo.latest.version}` : undefined,
  });

  return (
    <>
      <AppShell
        header={
          <TopBar
            wordmark={site.wordmark}
            subtitle={site.tagline}
            search={{ label: "Search tools, files and runs", keys: shortcuts.commandMenu.keys, onOpen: () => setPaletteOpen(true) }}
            end={<UpdateControl fallbackVersion={version} onUpdate={() => void update()} />}
          />
        }
        sidebar={
          <ToolNav
            tools={tools}
            active={toolId}
            onSelectTool={(id) => openScript(id, tools.find((t) => t.id === id)?.scripts[0]?.id ?? "")}
          />
        }
        aside={<RecentRuns runs={runs} activeId={activeRunId} onOpen={openRun} />}
      >
        {tool && script ? (
          <div className={styles.stack}>
            <ToolHeader tool={tool} />

            {needsCookie && (
              <Banner tone="warning">
                No session cookie in <code>.env</code> yet. Set <code>COMICK_SESSION_TOKEN</code> there before running this, see{" "}
                <a href={`${site.repoUrl}/blob/main/docs/auth.md`} target="_blank" rel="noreferrer">
                  docs/auth.md
                </a>
                .
              </Banner>
            )}

            {Flow ? (
              <Flow key={tool.id} tool={tool} busy={busy} onStarted={onStarted} />
            ) : tool.steps ? (
              <StepFlow key={tool.id} tool={tool} steps={tool.steps} busy={busy} refreshKey={refreshKey} onStarted={onStarted} />
            ) : (
              <>
                {tool.scripts.length > 1 && (
                  <SegmentedControl
                    label="Scripts"
                    value={script.id}
                    options={tool.scripts.map((s) => ({ value: s.id, label: s.title }))}
                    onChange={(id) => openScript(tool.id, id)}
                  />
                )}

                <div className={styles.work} data-files={tool.files.length > 0}>
                  <ScriptForm key={`${tool.id}/${script.id}`} toolId={tool.id} group={tool.group} script={script} busy={busy} onStarted={onStarted} />
                  {tool.files.length > 0 && <FileEditor key={tool.id} toolId={tool.id} files={tool.files} refreshKey={refreshKey} />}
                </div>
              </>
            )}

            <RunConsole run={activeRun} onStop={() => void stopActive()} onExit={onExit} />
          </div>
        ) : (
          <Banner>No tools found. Each tool needs a tool.json next to its scripts, see docs/contributing.md.</Banner>
        )}
      </AppShell>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} commands={commands} placeholder="Search tools, files and runs" />
      {restarting && <RestartOverlay />}
    </>
  );
}
