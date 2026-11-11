// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2026 Russhvith

import { site } from "@/config/site";

// Without this file the request falls through to the not-found redirect and
// returns the homepage HTML, which reads as a broken llms.txt.
const body = `# ${site.name}

> ${site.description} A local web interface for command line tools that act on ComicK with your own session cookie. It runs on your computer and is not a hosted service.

## Docs

- [Source and README](${site.repoUrl}): what the tools do and how to set them up
- [Docs](${site.docsUrl}): setup, auth and contributing guides

## Legal

- [Terms of Service](/legal/terms): includes the liability terms for code you run
- [Privacy Policy](/legal/privacy): what is stored and where requests go
- [Open source packages](/legal/packages): third-party packages and their licenses
`;

export function GET() {
  return new Response(body, {
    headers: { "Content-Type": "text/markdown; charset=utf-8", "Cache-Control": "no-store" },
  });
}
