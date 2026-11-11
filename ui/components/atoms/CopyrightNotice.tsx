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

/**
 * Puts the copyright notice above the html tag, where it's the first thing
 * in the browser's element inspector. React can't render a comment there,
 * so it's added once the page is up, after hydration has seen the document.
 */
export function CopyrightNotice() {
  useEffect(() => {
    // Development mounts effects twice, so don't stack a second copy.
    const before = document.documentElement.previousSibling;
    if (before?.nodeType === Node.COMMENT_NODE && before.nodeValue === NOTICE) return;
    document.insertBefore(document.createComment(NOTICE), document.documentElement);
  }, []);
  return null;
}
