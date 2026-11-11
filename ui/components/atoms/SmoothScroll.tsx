// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2026 Russhvith

"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import "lenis/dist/lenis.css";

// What Chromium moves for one arrow press.
const ARROW_STEP = 40;
// Share of the visible page a Page Down moves, so a few lines stay in view
// to read on from. Same fraction Chromium uses.
const PAGE_FRACTION = 0.875;

const EDITABLE = "input, textarea, select, [contenteditable]:not([contenteditable='false']), .xterm";
// Space presses these, it doesn't scroll.
const PRESSABLE = "button, a[href], summary, [role='button'], [role='checkbox'], [role='switch'], [role='radio'], [role='tab'], [role='menuitem'], [role='option']";
// Arrows, Home and End move the selection inside these.
const OWN_KEYS = "[role='radiogroup'], [role='tablist'], [role='listbox'], [role='menu'], [role='menubar'], [role='slider'], [role='grid'], [role='tree']";

/** The sticky header covers the top of the page, so a page step leaves it out. */
function pageStep() {
  const header = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--header-height")) || 3.5625;
  const headerPx = header * parseFloat(getComputedStyle(document.documentElement).fontSize);
  return Math.max(ARROW_STEP, (window.innerHeight - headerPx) * PAGE_FRACTION);
}

/**
 * Whether the focused element sits in its own scrolling box (the sidebar, a
 * list, an editor) that can still move that way. The browser scrolls that
 * box rather than the page, so the key is left to it.
 */
function inNestedScroller(start: Element | null, down: boolean) {
  for (let el = start; el && el !== document.body && el !== document.documentElement; el = el.parentElement) {
    if (el.scrollHeight <= el.clientHeight) continue;
    const overflow = getComputedStyle(el).overflowY;
    if (overflow !== "auto" && overflow !== "scroll") continue;
    const room = down ? el.scrollHeight - el.clientHeight - el.scrollTop > 1 : el.scrollTop > 1;
    if (room) return true;
  }
  return false;
}

/**
 * Smooth scrolling for the page with Lenis: the wheel, same page anchor
 * links and the keys that scroll (Page Up and Down, Space, the arrows, Home
 * and End). Nested scrollers, the console and open dialogs keep their
 * native behaviour, and anyone who asked for less motion gets plain
 * scrolling, which Lenis does on its own.
 */
export function SmoothScroll() {
  useEffect(() => {
    const lenis = new Lenis({
      autoRaf: true,
      // Lets the sidebar, lists and editors take the wheel when the pointer
      // is over them and they can still scroll.
      allowNestedScroll: true,
      // Pauses while a dialog's scroll lock sets overflow: hidden on html.
      autoToggle: true,
      stopInertiaOnNavigate: true,
      // The console draws its own scrollback, which Lenis can't see as a
      // scrolling box, so its wheel events stay with it. So do a dialog's,
      // backdrop included, since Lenis scrolling the page programmatically
      // would get past the scroll lock.
      prevent: (node) => node.tagName === "DIALOG" || (node.classList?.contains("xterm") ?? false),
    });

    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.ctrlKey || event.altKey || event.metaKey) return;
      if (lenis.isStopped || document.querySelector("dialog[open]")) return;
      const target = event.target instanceof Element ? event.target : null;
      if (target?.closest(EDITABLE)) return;

      let delta: number | "top" | "bottom";
      switch (event.key) {
        case "PageDown":
          delta = pageStep();
          break;
        case "PageUp":
          delta = -pageStep();
          break;
        case " ":
          if (target?.closest(PRESSABLE)) return;
          delta = event.shiftKey ? -pageStep() : pageStep();
          break;
        case "ArrowDown":
          delta = ARROW_STEP;
          break;
        case "ArrowUp":
          delta = -ARROW_STEP;
          break;
        case "Home":
          delta = "top";
          break;
        case "End":
          delta = "bottom";
          break;
        default:
          return;
      }
      // Shift with the other keys extends a text selection.
      if (event.key !== " " && event.shiftKey) return;
      const paging = event.key === " " || event.key === "PageDown" || event.key === "PageUp";
      if (!paging && target?.closest(OWN_KEYS)) return;
      const down = delta === "bottom" || (typeof delta === "number" && delta > 0);
      if (inNestedScroller(document.activeElement, down)) return;

      event.preventDefault();
      // From the target rather than the current position, so holding a key
      // keeps adding up instead of restarting from wherever it got to.
      const to = delta === "top" ? 0 : delta === "bottom" ? lenis.limit : lenis.targetScroll + delta;
      lenis.scrollTo(Math.max(0, Math.min(lenis.limit, to)));
    };

    // Same page anchors (#activity, the legal contents list) glide there
    // instead of jumping, landing below the sticky header through each
    // section's scroll-margin-top. The hash still goes in the address and
    // history, like a normal anchor click.
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[href^='#']") : null;
      if (!link || link.target) return;
      const id = decodeURIComponent(link.hash.slice(1));
      const section = id ? document.getElementById(id) : null;
      if (!section) return;
      event.preventDefault();
      lenis.scrollTo(section);
      if (window.location.hash !== link.hash) history.pushState(history.state, "", link.hash);
    };

    window.addEventListener("keydown", onKey);
    document.addEventListener("click", onClick);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("click", onClick);
      lenis.destroy();
    };
  }, []);

  return null;
}
