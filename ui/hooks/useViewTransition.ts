"use client";

import { useCallback } from "react";
import { flushSync } from "react-dom";

type DocumentWithTransitions = Document & { startViewTransition?: (cb: () => void) => unknown };

/** Run a state change inside a view transition where the browser has them. */
export function useViewTransition() {
  return useCallback((update: () => void) => {
    const doc = document as DocumentWithTransitions;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!doc.startViewTransition || reduced) {
      update();
      return;
    }
    doc.startViewTransition(() => flushSync(update));
  }, []);
}
