// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2026 Russhvith

"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/atoms/Button";
import { ForbiddenPanel } from "@/components/organisms/ForbiddenPanel";
import { Modal } from "@/components/organisms/Modal";
import type { Tool } from "@/types/tools";
import { roleLabels } from "./AccountCard";
import { adminLocked, useAccount } from "./useAccount";

/**
 * The 403 page in an overlay, when an account without the role opens an
 * admin tool. The script would refuse it anyway after the account check,
 * this just says so before anyone fills in a form.
 */
export function AdminGate({ tool }: { tool: Tool }) {
  const { data: account } = useAccount();
  const router = useRouter();
  if (tool.group !== "admin" || !adminLocked(account) || account?.state !== "signed-in") return null;

  const leave = () => router.push("/");
  return (
    <Modal open title="Not available for this account" onRequestClose={leave}>
      <ForbiddenPanel
        title={`${account.username} can't use the ${tool.name}`}
        actions={
          <Button variant="primary" onClick={leave}>
            <ArrowLeft size={15} aria-hidden /> Back to the homepage
          </Button>
        }
      >
        <p>
          Admin tools need a trusted, moderator or admin account on ComicK, and this one is {roleLabels[account.role].toLowerCase() === "user" ? "a regular user" : `an ${roleLabels[account.role].toLowerCase()}`}.
        </p>
        <p>So there&apos;s nothing here you need. The tools in the Public section all work with your account.</p>
      </ForbiddenPanel>
    </Modal>
  );
}
