"use client";

import { useEffect, useRef } from "react";
import "@xterm/xterm/css/xterm.css";
import type { RunStatus } from "@/lib/runs";

type Props = {
  runId: string;
  onStatus: (status: RunStatus, code: number | null) => void;
};

const THEME = {
  background: "#161c2b",
  foreground: "#dce3f1",
  cursor: "#8fb0ff",
  selectionBackground: "#2d5be366",
  black: "#1c2333",
  red: "#ff7aa2",
  green: "#6fd3a1",
  yellow: "#f2c66d",
  blue: "#8fb0ff",
  magenta: "#e58bd4",
  cyan: "#6fd0e0",
  white: "#dce3f1",
  brightBlack: "#7a869e",
};

/**
 * xterm.js wired to one run.
 *
 * The scripts sit behind pipes rather than a real pseudo terminal, so this
 * does the line editing a terminal would: echo what's typed, handle
 * backspace, and send the line on Enter. Ctrl+C stops the run.
 */
export default function Terminal({ runId, onStatus }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const statusRef = useRef(onStatus);
  statusRef.current = onStatus;

  useEffect(() => {
    let disposed = false;
    let cleanup = () => {};

    (async () => {
      // xterm reaches for window as soon as it's imported, so it only loads
      // in the browser.
      const [{ Terminal: XTerm }, { FitAddon }] = await Promise.all([import("@xterm/xterm"), import("@xterm/addon-fit")]);
      if (disposed || !host.current) return;

      const term = new XTerm({
        convertEol: true,
        cursorBlink: true,
        fontFamily: "var(--font-mono), Consolas, monospace",
        fontSize: 13,
        lineHeight: 1.25,
        scrollback: 5000,
        theme: THEME,
      });
      const fit = new FitAddon();
      term.loadAddon(fit);
      term.open(host.current);
      fit.fit();
      term.focus();

      let line = "";
      let running = true;

      const send = async (text: string) => {
        const res = await fetch(`/api/runs/${runId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ line: text }),
        });
        if (!res.ok) term.write("\r\n\x1b[33m(This run isn't taking input any more)\x1b[0m\r\n");
      };

      const typing = term.onData((data) => {
        if (!running) return;
        for (const ch of data) {
          if (ch === "\r") {
            term.write("\r\n");
            const sent = line;
            line = "";
            void send(sent);
          } else if (ch === "\x7f" || ch === "\b") {
            if (line) {
              line = line.slice(0, -1);
              term.write("\b \b");
            }
          } else if (ch === "\x03") {
            void fetch(`/api/runs/${runId}`, { method: "DELETE" });
          } else if (ch >= " " && ch !== "\x7f") {
            line += ch;
            term.write(ch);
          }
        }
      });

      const events = new EventSource(`/api/runs/${runId}/stream`);
      events.onmessage = (message) => {
        const event = JSON.parse(message.data);
        if (event.type === "output") term.write(event.text);
        if (event.type === "exit") {
          running = false;
          term.options.cursorBlink = false;
          statusRef.current(event.status, event.code);
          events.close();
        }
      };

      const resize = new ResizeObserver(() => {
        try {
          fit.fit();
        } catch {}
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

  return <div className="terminal-host" ref={host} aria-label="Script output, type here to answer prompts" />;
}
