"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { RunStatus, RunSummary } from "@/lib/runs";
import type { Tool } from "@/lib/tools";
import FilesPanel from "./FilesPanel";
import ScriptForm from "./ScriptForm";
import Terminal from "./Terminal";
import VersionStatus from "./VersionStatus";

type Props = {
  tools: Tool[];
  cookieSet: boolean;
  version: string;
  initialRuns: RunSummary[];
};

const GROUP_NAMES = { public: "Public", admin: "Admin" } as const;
const STATUS_TEXT: Record<RunStatus, string> = { running: "Running", done: "Finished", failed: "Failed", stopped: "Stopped" };

function timeOf(ms: number) {
  return new Date(ms).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function App({ tools, cookieSet, version, initialRuns }: Props) {
  const [toolId, setToolId] = useState(tools[0]?.id);
  const [scriptId, setScriptId] = useState(tools[0]?.scripts[0]?.id);
  const [runs, setRuns] = useState(initialRuns);
  const [activeRunId, setActiveRunId] = useState<string | null>(initialRuns.find((r) => r.status === "running")?.id ?? null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [restarting, setRestarting] = useState(false);
  const updateRun = useRef<{ id: string; startedAt: number } | null>(null);

  const tool = tools.find((t) => t.id === toolId);
  const script = tool?.scripts.find((s) => s.id === scriptId) ?? tool?.scripts[0];
  const activeRun = runs.find((r) => r.id === activeRunId) ?? null;
  const busy = runs.some((r) => r.status === "running");
  const needsCookie = tool?.group === "admin" || script?.id === "upload";

  const groups = useMemo(
    () => (["public", "admin"] as const).map((g) => ({ group: g, tools: tools.filter((t) => t.group === g) })).filter((g) => g.tools.length),
    [tools],
  );

  const refreshRuns = useCallback(async () => {
    try {
      const res = await fetch("/api/runs");
      if (res.ok) setRuns((await res.json()).runs);
    } catch {
      // The server is mid restart during an update. The next poll catches up.
    }
  }, []);

  useEffect(() => {
    const timer = setInterval(() => void refreshRuns(), busy ? 1500 : 5000);
    return () => clearInterval(timer);
  }, [busy, refreshRuns]);

  function openRun(runId: string) {
    setActiveRunId(runId);
    void refreshRuns();
  }

  async function startUpdateWatch(runId: string) {
    try {
      const info = await (await fetch("/api/version")).json();
      updateRun.current = { id: runId, startedAt: info.startedAt };
    } catch {
      updateRun.current = { id: runId, startedAt: 0 };
    }
    openRun(runId);
  }

  /**
   * After a successful update the server exits and serve.mjs starts it on
   * the new build. Poll until a server with a different start time
   * answers, then reload so the page matches the new code. If the same
   * server keeps answering, nothing restarted (dev mode, or already up to
   * date) and we just stop watching.
   */
  async function waitForRestart(previous: number) {
    setRestarting(true);
    const deadline = Date.now() + 3 * 60 * 1000;
    let sameAnswers = 0;
    while (Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 1500));
      try {
        const res = await fetch("/api/version", { cache: "no-store" });
        if (!res.ok) continue;
        const info = await res.json();
        if (info.startedAt !== previous) {
          window.location.reload();
          return;
        }
        if (++sameAnswers >= 3) break;
      } catch {
        // Expected while the old server is gone and the new one is booting.
      }
    }
    setRestarting(false);
  }

  const onStatus = useCallback(
    (status: RunStatus) => {
      setRefreshKey((k) => k + 1);
      void refreshRuns();
      const watch = updateRun.current;
      if (watch && watch.id === activeRunId && status === "done") {
        updateRun.current = null;
        void waitForRestart(watch.startedAt);
      }
    },
    [activeRunId, refreshRuns],
  );

  async function stop() {
    if (activeRunId) await fetch(`/api/runs/${activeRunId}`, { method: "DELETE" });
    void refreshRuns();
  }

  const accent = tool?.group === "admin" ? "var(--pink)" : "var(--blue)";

  return (
    <div className="shell" style={{ ["--accent" as string]: accent }}>
      <nav className="rail" aria-label="Tools">
        <p className="wordmark">
          comick tools
          <span>Staff tools for ComicK</span>
        </p>

        {groups.map(({ group, tools: list }) => (
          <div key={group}>
            <h2>{GROUP_NAMES[group]}</h2>
            <ul className="tool-list">
              {list.map((t) => (
                <li key={t.id}>
                  <button
                    className="tool-link"
                    aria-current={t.id === toolId}
                    style={{ ["--accent" as string]: t.group === "admin" ? "var(--pink)" : "var(--blue)" }}
                    onClick={() => {
                      setToolId(t.id);
                      setScriptId(t.scripts[0]?.id);
                    }}
                  >
                    <strong>{t.name}</strong>
                    <small>{t.summary}</small>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}

        <div>
          <h2>Recent runs</h2>
          {runs.length ? (
            <ul className="run-list">
              {runs.slice(0, 12).map((r) => (
                <li key={r.id}>
                  <button className="run-link" aria-current={r.id === activeRunId} onClick={() => openRun(r.id)} title={STATUS_TEXT[r.status]}>
                    <span className="dot" data-status={r.status} aria-hidden />
                    <span>{r.title}</span>
                    <time>{timeOf(r.startedAt)}</time>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="empty-note">Nothing run yet.</p>
          )}
        </div>

        <VersionStatus version={version} onUpdateStarted={(id) => void startUpdateWatch(id)} />
      </nav>

      <main className="main">
        {tool && script ? (
          <>
            <header className="tool-head">
              <span className="group-tag">{tool.group === "admin" ? "Admin, needs a trusted or higher account" : "Public, any account"}</span>
              <h1>{tool.name}</h1>
              <p>{tool.summary}</p>
            </header>

            {needsCookie && !cookieSet && (
              <div className="notice">
                No session cookie in <code>.env</code> yet. Set <code>COMICK_SESSION_TOKEN</code> there (see docs/auth.md) before running this.
              </div>
            )}

            {tool.scripts.length > 1 && (
              <div className="tabs" role="tablist" aria-label="Scripts">
                {tool.scripts.map((s) => (
                  <button key={s.id} role="tab" className="tab" aria-selected={s.id === script.id} onClick={() => setScriptId(s.id)}>
                    {s.title}
                  </button>
                ))}
              </div>
            )}

            <div className="work" data-single={tool.files.length === 0}>
              <ScriptForm key={`${tool.id}/${script.id}`} toolId={tool.id} script={script} busy={busy} onStarted={openRun} />
              {tool.files.length > 0 && <FilesPanel key={tool.id} toolId={tool.id} files={tool.files} refreshKey={refreshKey} />}
            </div>
          </>
        ) : (
          <div className="panel">
            <h3>No tools found</h3>
            <p>Each tool needs a tool.json next to its scripts. See docs/contributing.md.</p>
          </div>
        )}

        <section className="console" aria-label="Console">
          <div className="console-bar">
            <strong>{activeRun ? activeRun.title : "Console"}</strong>
            {activeRun && (
              <span className="status-text" data-status={activeRun.status}>
                {STATUS_TEXT[activeRun.status]}
                {activeRun.code !== null && activeRun.status !== "done" ? ` (exit ${activeRun.code})` : ""}
              </span>
            )}
            {activeRun?.status === "running" && activeRun.kind === "script" && (
              <button className="stop-button" onClick={() => void stop()}>
                Stop
              </button>
            )}
          </div>
          {activeRunId ? (
            <Terminal key={activeRunId} runId={activeRunId} onStatus={onStatus} />
          ) : (
            <div className="console-empty">
              <p>Run a script and its output shows up here. When it asks a question, click in here and type the answer.</p>
            </div>
          )}
        </section>
      </main>

      {restarting && (
        <div className="overlay" role="status">
          <div className="panel">
            <h3>Restarting on the new version</h3>
            <p>The page reloads by itself once the server is back.</p>
          </div>
        </div>
      )}
    </div>
  );
}
