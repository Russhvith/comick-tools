"use client";

import { useEffect, useRef } from "react";

export const isMac = () => typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);

/**
 * `mod` means Ctrl on Windows and Linux, Cmd on macOS, so one binding
 * works for everyone. Combos look like "mod+k" or "escape".
 */
export function useHotkey(combo: string, handler: (event: KeyboardEvent) => void, enabled = true) {
  const ref = useRef(handler);
  ref.current = handler;

  useEffect(() => {
    if (!enabled) return;
    const parts = combo.toLowerCase().split("+");
    const key = parts.pop()!;
    const wantMod = parts.includes("mod");
    const wantShift = parts.includes("shift");

    const onKey = (event: KeyboardEvent) => {
      const mod = isMac() ? event.metaKey : event.ctrlKey;
      if (event.key.toLowerCase() !== key || mod !== wantMod || event.shiftKey !== wantShift) return;
      event.preventDefault();
      ref.current(event);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [combo, enabled]);
}
