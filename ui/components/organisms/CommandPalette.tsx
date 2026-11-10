"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { Search } from "lucide-react";
import { Kbd } from "@/components/atoms/Kbd";
import { cn } from "@/lib/cn";
import styles from "./CommandPalette.module.css";

export type Command = {
  id: string;
  group: string;
  label: string;
  detail?: string;
  icon: LucideIcon;
  keywords?: string;
  shortcut?: readonly string[];
  run: () => void;
};

type Props = {
  open: boolean;
  onClose: () => void;
  commands: Command[];
  placeholder: string;
};

function matches(command: Command, query: string) {
  const haystack = `${command.label} ${command.detail ?? ""} ${command.keywords ?? ""} ${command.group}`.toLowerCase();
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((word) => haystack.includes(word));
}

export function CommandPalette({ open, onClose, commands, placeholder }: Props) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const dialog = useRef<HTMLDialogElement>(null);
  const list = useRef<HTMLUListElement>(null);

  const results = useMemo(() => commands.filter((c) => matches(c, query)), [commands, query]);

  useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    if (open && !el.open) {
      setQuery("");
      setActive(0);
      el.showModal();
    } else if (!open && el.open) {
      el.close();
    }
  }, [open]);

  useEffect(() => setActive(0), [query]);

  useEffect(() => {
    list.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  function choose(command: Command | undefined) {
    if (!command) return;
    onClose();
    command.run();
  }

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((i) => Math.min(i + 1, results.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      choose(results[active]);
    }
  }

  let lastGroup = "";

  return (
    <dialog
      ref={dialog}
      className={styles.dialog}
      onClose={onClose}
      onClick={(event) => event.target === dialog.current && onClose()}
      aria-label="Command menu"
    >
      {/* Only mounted while open. Closed, there's nothing to show, and the
          server shouldn't render a list that mentions run times. */}
      {open && (
        <div className={styles.panel}>
          <div className={styles.inputRow}>
            <Search size={16} aria-hidden />
            <input
              className={styles.input}
              autoFocus
              value={query}
              placeholder={placeholder}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onKeyDown}
              role="combobox"
              aria-expanded
              aria-controls="command-results"
              aria-activedescendant={results[active] ? `command-${results[active].id}` : undefined}
            />
            <Kbd keys={["Esc"]} />
          </div>
          <ul id="command-results" ref={list} className={styles.results} role="listbox">
            {results.length === 0 && <li className={styles.empty}>Nothing matches “{query}”.</li>}
            {results.map((command, index) => {
              const heading = command.group !== lastGroup ? command.group : null;
              lastGroup = command.group;
              const Icon = command.icon;
              return (
                <li key={command.id} role="presentation">
                  {heading && <div className={styles.group}>{heading}</div>}
                  <div
                    id={`command-${command.id}`}
                    role="option"
                    aria-selected={index === active}
                    data-index={index}
                    className={cn(styles.option, index === active && styles.active)}
                    onMouseMove={() => setActive(index)}
                    onClick={() => choose(command)}
                  >
                    <Icon size={16} aria-hidden className={styles.optionIcon} />
                    <span className={styles.optionText}>
                      <span>{command.label}</span>
                      {command.detail && <span className={styles.detail}>{command.detail}</span>}
                    </span>
                    {command.shortcut && <Kbd keys={command.shortcut} />}
                  </div>
                </li>
              );
            })}
          </ul>
          <footer className={styles.footer}>
            <span>
              <Kbd keys={["↑", "↓"]} /> to move
            </span>
            <span>
              <Kbd keys={["Enter"]} /> to open
            </span>
          </footer>
        </div>
      )}
    </dialog>
  );
}
