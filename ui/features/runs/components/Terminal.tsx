"use client";

import { useEffect, useRef } from "react";
import "@xterm/xterm/css/xterm.css";
import type { RunEvent, RunStatus } from "@/types/runs";
import { sendLine, stopRun } from "../api";
import styles from "./RunConsole.module.css";

type Props = {
  runId: string;
  onExit: (status: RunStatus, code: number | null) => void;
};

// ComicK palette, nudged brighter where the dark card would swallow it.
const theme = {
  background: "#111827",
  foreground: "#d1d5db",
  cursor: "#60a5fa",
  selectionBackground: "#2563eb55",
  black: "#1f2937",
  red: "#f87171",
  green: "#4ade80",
  yellow: "#facc15",
  blue: "#60a5fa",
  magenta: "#e879f9",
  cyan: "#22d3ee",
  white: "#e5e7eb",
  brightBlack: "#6b7280",
};

/**
 * Scripts run behind pipes, not a pseudo terminal, so this does the line
 * editing a terminal would: echo what's typed, handle backspace, send on
 * Enter. Ctrl+C stops the run.
 */
export function Terminal({ runId, onExit }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const exitRef = useRef(onExit);
  exitRef.current = onExit;

  useEffect(() => {
    let disposed = false;
    let cleanup = () => {};

    (async () => {
      // xterm touches window on import, so it can only load in the browser.
      const [{ Terminal: XTerm }, { FitAddon }] = await Promise.all([import("@xterm/xterm"), import("@xterm/addon-fit")]);
      if (disposed || !host.current) return;

      const term = new XTerm({
        convertEol: true,
        cursorBlink: true,
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace',
        fontSize: 13,
        lineHeight: 1.3,
        scrollback: 5000,
        theme,
      });
      const fit = new FitAddon();
      term.loadAddon(fit);
      term.open(host.current);
      fit.fit();
      term.focus();

      let line = "";
      let running = true;

      const typing = term.onData((data) => {
        if (!running) return;
        for (const ch of data) {
          if (ch === "\r") {
            term.write("\r\n");
            const sent = line;
            line = "";
            sendLine(runId, sent).catch(() => term.write("\r\n\x1b[33m(this run isn't taking input any more)\x1b[0m\r\n"));
          } else if (ch === "\x7f" || ch === "\b") {
            if (line) {
              line = line.slice(0, -1);
              term.write("\b \b");
            }
          } else if (ch === "\x03") {
            void stopRun(runId).catch(() => {});
          } else if (ch >= " ") {
            line += ch;
            term.write(ch);
          }
        }
      });

      const events = new EventSource(`/api/runs/${runId}/stream`);
      events.onmessage = (message) => {
        const event = JSON.parse(message.data) as RunEvent;
        if (event.type === "output") term.write(event.text);
        if (event.type === "exit") {
          running = false;
          term.options.cursorBlink = false;
          exitRef.current(event.status, event.code);
          events.close();
        }
      };

      const resize = new ResizeObserver(() => {
        try {
          fit.fit();
        } catch {
          // Fit throws while the element is hidden, the next resize fixes it.
        }
      });
      resize.observe(host.current);

      cleanup = () => {
        events.close();
        resize.disconnect();
        typing.dispose();
        term.dispose();
      };
    })();

    return () => {
      disposed = true;
      cleanup();
    };
  }, [runId]);

  return <div className={styles.terminal} ref={host} aria-label="Script output. Click and type to answer prompts." />;
}
