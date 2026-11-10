"use client";

import { useCallback } from "react";
import { mutateResource, useResource } from "@/hooks/useResource";
import { request } from "@/lib/http";
import { canUseAdmin, type Account } from "@/types/account";

const KEY = "/api/account";

/**
 * The ComicK account behind the .env cookie. Every part of the page that
 * cares (the homepage card, the sidebar locks, the tool notes) shares this
 * one request per load.
 */
export function useAccount() {
  const resource = useResource<Account>(KEY, () => request<Account>(KEY));

  const recheck = useCallback(async () => {
    mutateResource(KEY, await request<Account>(`${KEY}?refresh=1`));
  }, []);

  return { ...resource, recheck };
}

/**
 * Whether an admin tool should be locked. Only when we know for sure: a
 * signed in account without the role. While loading, or when the check
 * failed, the tool stays open and the script makes the final call.
 */
export function adminLocked(account: Account | undefined): boolean {
  return account?.state === "signed-in" && !canUseAdmin(account.role);
}
