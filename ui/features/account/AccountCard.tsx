// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2026 Russhvith

"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { ExternalLink, KeyRound, RefreshCw, ScrollText, TriangleAlert } from "lucide-react";
import { Button } from "@/components/atoms/Button";
import { IconButton } from "@/components/atoms/IconButton";
import { Skeleton } from "@/components/atoms/Skeleton";
import { TermsDialog } from "@/features/settings/TermsDialog";
import { cn } from "@/lib/cn";
import type { Account, Role } from "@/types/account";
import { useAccount } from "./useAccount";
import styles from "./AccountCard.module.css";

export const roleLabels: Record<Role, string> = {
  user: "User",
  uploader: "Uploader",
  trusted: "Trusted",
  moderator: "Moderator",
  admin: "Admin",
};

const date = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Unknown";

function ago(iso: string | null) {
  if (!iso) return "Unknown";
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 2) return "Just now";
  if (minutes < 60) return `${minutes} minutes ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  return days < 30 ? `${days} day${days === 1 ? "" : "s"} ago` : date(iso);
}

const count = (n: number | null) => (n === null ? "?" : n.toLocaleString("en-US"));

function Problem({ title, text, docs, action }: { title: string; text: string; docs?: boolean; action?: ReactNode }) {
  return (
    <div className={styles.problem}>
      <span className={styles.problemIcon} aria-hidden>
        {docs ? <KeyRound size={18} /> : <TriangleAlert size={18} />}
      </span>
      <div className={styles.problemBody}>
        <p className={styles.problemTitle}>{title}</p>
        <p className={styles.problemText}>{text}</p>
        {action && <div className={styles.problemAction}>{action}</div>}
      </div>
    </div>
  );
}

const toSettings = (label: string) => (
  <Link href="/settings" className={styles.problemLink}>
    {label}
  </Link>
);

function Body({ account, onAccept }: { account: Account; onAccept: () => void }) {
  if (account.state === "not-agreed")
    return (
      <div className={styles.problem}>
        <span className={styles.problemIcon} data-tone="info" aria-hidden>
          <ScrollText size={18} />
        </span>
        <div className={styles.problemBody}>
          <p className={styles.problemTitle}>Accept the Terms to connect</p>
          <p className={styles.problemText}>Nothing is sent to ComicK, not even this account check, until you accept the Terms of Service.</p>
          <div className={styles.problemAction}>
            <Button variant="primary" size="sm" onClick={onAccept}>
              Review and accept
            </Button>
          </div>
        </div>
      </div>
    );
  if (account.state === "no-cookie")
    return <Problem docs title="Not connected to ComicK" text="Add your ComicK session cookie to see which account the tools use." action={toSettings("Add it in Settings")} />;
  if (account.state === "rejected")
    return <Problem docs title="ComicK refused the cookie" text="The saved one has expired or been signed out. Copy a fresh one." action={toSettings("Replace it in Settings")} />;
  if (account.state === "inactive")
    return <Problem title={`${account.username ?? "This account"} isn't active`} text="ComicK says the account behind the cookie can't be used right now." />;
  if (account.state === "error") return <Problem title="Couldn't check the account" text={account.message} />;

  const stats = [
    { label: "Karma", value: count(account.karma) },
    { label: "Uploads", value: count(account.uploads) },
    { label: "Comments", value: count(account.comments) },
    { label: "Following", value: count(account.following) },
  ];
  return (
    <>
      <div className={styles.who}>
        {/* Anonymous CORS keeps the request cookie free, so Gravatar's own cookies
            are neither sent nor set. Gravatar answers with Allow-Origin *. */}
        <img
          src={account.avatar}
          alt=""
          width={56}
          height={56}
          className={styles.avatar}
          referrerPolicy="no-referrer"
          crossOrigin="anonymous"
        />
        <div className={styles.names}>
          <span className={styles.kicker}>Logged in to ComicK as</span>
          <span className={styles.username}>{account.username}</span>
          <span className={cn(styles.role, styles[`role-${account.role}`])}>{roleLabels[account.role]}</span>
        </div>
      </div>
      <dl className={styles.stats}>
        {stats.map((s) => (
          <div key={s.label} className={styles.stat}>
            <dt>{s.label}</dt>
            <dd>{s.value}</dd>
          </div>
        ))}
      </dl>
      <dl className={styles.meta}>
        <div>
          <dt>Member since</dt>
          <dd>{date(account.memberSince)}</dd>
        </div>
        <div>
          <dt>Last active</dt>
          <dd>{ago(account.lastActive)}</dd>
        </div>
      </dl>
      <a href={account.profileUrl} target="_blank" rel="noreferrer" className={styles.profile}>
        View profile on ComicK <ExternalLink size={13} aria-hidden />
      </a>
    </>
  );
}

/** Which ComicK account the tools act as, from the cookie in .env. */
export function AccountCard({ className }: { className?: string }) {
  const { data, loading, recheck } = useAccount();
  const [checking, setChecking] = useState(false);
  const [asking, setAsking] = useState(false);

  return (
    <section className={cn(styles.card, className)} aria-label="ComicK account">
      <header className={styles.header}>
        <h2 className={styles.title}>Account</h2>
        <IconButton
          icon={RefreshCw}
          label="Check again"
          className={cn(checking && styles.spinning)}
          disabled={checking}
          onClick={async () => {
            setChecking(true);
            try {
              await recheck();
            } catch {
              // The card keeps showing the last answer.
            } finally {
              setChecking(false);
            }
          }}
        />
      </header>
      {loading && !data ? (
        <div className={styles.loading} aria-label="Checking the account">
          <Skeleton height="3.5rem" />
          <Skeleton height="4rem" />
        </div>
      ) : data ? (
        <Body account={data} onAccept={() => setAsking(true)} />
      ) : (
        <Problem title="Couldn't check the account" text="The tools server didn't answer." />
      )}
      <TermsDialog open={asking} onClose={() => setAsking(false)} />
    </section>
  );
}
