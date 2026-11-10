// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2026 Russhvith

"use client";

import { useCallback } from "react";
import { mutateResource, useResource } from "@/hooks/useResource";
import { request } from "@/lib/http";
import type { RunSummary } from "@/types/runs";
import type { VersionInfo } from "@/types/version";

const KEY = "/api/version";

export function useVersion() {
  const resource = useResource<VersionInfo>(KEY, () => request<VersionInfo>(KEY));

  const checkNow = useCallback(async () => {
    mutateResource(KEY, await request<VersionInfo>(`${KEY}?refresh=1`));
  }, []);

  return { ...resource, checkNow };
}

export function startUpdate() {
  return request<{ run: RunSummary }>("/api/update", { method: "POST" }).then((body) => body.run);
}

/**
 * After a successful update the server exits and serve.mjs brings it back
 * on the new build. Poll until a server with a different start time
 * answers, then reload so the page runs the new code too. If the same
 * server keeps answering, nothing restarted (dev mode or already up to
 * date) and we give up quietly.
 */
export async function waitForRestart(previousStart: number, onWaiting: (waiting: boolean) => void) {
  onWaiting(true);
  const deadline = Date.now() + 3 * 60 * 1000;
  let sameServer = 0;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 1500));
    try {
      const info = await request<VersionInfo>(KEY);
      if (info.startedAt !== previousStart) {
        window.location.reload();
        return;
      }
      if (++sameServer >= 3) break;
    } catch {
      // Expected while the old server is gone and the new one boots.
    }
  }
  onWaiting(false);
}
