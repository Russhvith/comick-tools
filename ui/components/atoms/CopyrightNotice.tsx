// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2026 Russhvith

"use client";

import { useEffect } from "react";
import { site } from "@/config/site";

const NOTICE = `
  ${site.name}
  Copyright (C) 2026 ${site.author.name}

  Free software under the GNU General Public License v3.0 only.
  Source: ${site.repoUrl}
`;

const shown = Symbol.for("comick-tools.console-notice");

/**
 * Pasting code into the console is the classic way people get talked into
 * handing over a session, and here that session is a ComicK cookie. Say so
 * where they'd paste it, once per page load.
 */
function warnInConsole() {
  const flags = window as unknown as Record<symbol, boolean>;
  if (flags[shown]) return;
  flags[shown] = true;

  const big = "color:#ef4444;font-size:32px;font-weight:800;font-family:Inter,system-ui,sans-serif";
  const body = "font-size:14px;line-height:1.5;font-family:Inter,system-ui,sans-serif";
  const muted = "color:#9ca3af;font-size:12px;font-family:Inter,system-ui,sans-serif";

  console.log("%cStop!", big);
  console.log(
    "%cThis is a browser feature meant for developers. Don't paste anything here unless you know exactly what it does " +
      "and you trust where it came from. Code from someone else can run the tools as you, swap the saved cookie " +
      "for another one or delete your content on ComicK.",
    body,
  );
  console.log(
    `%c${site.name} isn't responsible for anything that happens because of code you run here. ` +
      `See section 12 of the Terms of Service: ${window.location.origin}/legal/terms`,
    body,
  );
  console.log(
    `%c${site.name}, Copyright (C) 2026 ${site.author.name}. Free software under the GPL v3.0 only. ${site.repoUrl}`,
    muted,
  );
}

/**
 * Puts the copyright notice above the html tag, where it's the first thing
 * in the browser's element inspector, and the paste warning in the console.
 * React can't render a comment there, so it's added once the page is up,
 * after hydration has seen the document.
 */
export function CopyrightNotice() {
  useEffect(() => {
    warnInConsole();
    // Development mounts effects twice, so don't stack a second copy.
    const before = document.documentElement.previousSibling;
    if (before?.nodeType === Node.COMMENT_NODE && before.nodeValue === NOTICE) return;
    document.insertBefore(document.createComment(NOTICE), document.documentElement);
  }, []);
  return null;
}
