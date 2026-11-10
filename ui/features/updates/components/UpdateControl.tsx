// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2026 Russhvith

"use client";

import { useState } from "react";
import { ArrowUpCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/atoms/Button";
import { IconButton } from "@/components/atoms/IconButton";
import { Skeleton } from "@/components/atoms/Skeleton";
import { useToast } from "@/components/organisms/Toaster";
import { cn } from "@/lib/cn";
import { useVersion } from "../useVersion";
import styles from "./UpdateControl.module.css";

type Props = {
  fallbackVersion: string;
  onUpdate: () => void;
};

export function UpdateControl({ fallbackVersion, onUpdate }: Props) {
  const { data, loading, checkNow } = useVersion();
  const [checking, setChecking] = useState(false);
  const toast = useToast();

  async function check() {
    setChecking(true);
    try {
      await checkNow();
    } catch (e) {
      toast({ tone: "error", message: `Couldn't check for updates: ${(e as Error).message}` });
    } finally {
      setChecking(false);
    }
  }

  const status = data?.updateAvailable ? null : data?.checkError ?? (data ? "Up to date" : null);

  return (
    <div className={styles.control}>
      <span className={styles.version} title={data?.commit ? `Commit ${data.commit} on ${data.branch}` : undefined}>
        v{data?.current ?? fallbackVersion}
        {loading ? <Skeleton width="4.5rem" height="0.75rem" /> : status && <span className={styles.status}>{status}</span>}
      </span>
      {data?.updateAvailable && data.latest ? (
        <Button size="sm" variant="primary" onClick={onUpdate}>
          <ArrowUpCircle size={14} aria-hidden />
          Update to {data.latest.version}
        </Button>
      ) : (
        <IconButton
          icon={RefreshCw}
          label="Check for updates"
          onClick={() => void check()}
          disabled={checking}
          className={cn(checking && styles.spinning)}
        />
      )}
    </div>
  );
}
