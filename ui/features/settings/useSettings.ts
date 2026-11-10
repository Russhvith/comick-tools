// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2026 Russhvith

"use client";

import { useCallback } from "react";
import { mutateResource, useResource } from "@/hooks/useResource";
import { request } from "@/lib/http";
import type { Account } from "@/types/account";
import type { Settings, SettingsUpdate } from "@/types/settings";

const KEY = "/api/settings";
const ACCOUNT = "/api/account";

/** Ask for the account again, since the terms or the cookie just changed. */
async function refreshAccount() {
  try {
    mutateResource(ACCOUNT, await request<Account>(`${ACCOUNT}?refresh=1`));
  } catch {
    // The card shows its own error on the next load.
  }
}

/** What's in .env, and the two ways to change it. */
export function useSettings() {
  const resource = useResource<Settings>(KEY, () => request<Settings>(KEY));

  const accept = useCallback(async () => {
    mutateResource(KEY, await request<Settings>("/api/terms", { method: "POST" }));
    void refreshAccount();
  }, []);

  const save = useCallback(async (update: SettingsUpdate) => {
    mutateResource(KEY, await request<Settings>(KEY, { method: "PUT", body: JSON.stringify(update) }));
    void refreshAccount();
  }, []);

  return { ...resource, accept, save };
}
