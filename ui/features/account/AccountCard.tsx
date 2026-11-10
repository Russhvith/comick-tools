// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2026 Russhvith

"use client";

import { useState } from "react";
import { ExternalLink, KeyRound, RefreshCw, TriangleAlert } from "lucide-react";
import { IconButton } from "@/components/atoms/IconButton";
import { Skeleton } from "@/components/atoms/Skeleton";
import { site } from "@/config/site";
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

function Problem({ title, text, docs }: { title: string; text: string; docs?: boolean }) {
  return (
    <div className={styles.problem}>
      <span className={styles.problemIcon} aria-hidden>
        {docs ? <KeyRound size={18} /> : <TriangleAlert size={18} />}
      </span>
      <div>
        <p className={styles.problemTitle}>{title}</p>
        <p className={styles.problemText}>
          {text}
          {docs && (
            <>
              {" "}
              <a href={`${site.repoUrl}/blob/main/docs/auth.md`} target="_blank" rel="noreferrer">
                How to get it
              </a>
              .
            </>
          )}
        </p>
      </div>
    </div>
  );
}

function Body({ account }: { account: Account }) {
  if (account.state === "no-cookie")
    return <Problem docs title="Not connected to ComicK" text="Set COMICK_SESSION_TOKEN in .env to see which account the tools use." />;
  if (account.state === "rejected")
    return <Problem docs title="ComicK refused the cookie" text="The one in .env has expired or been signed out. Copy a fresh one." />;
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
        <img src={account.avatar} alt="" width={56} height={56} className={styles.avatar} referrerPolicy="no-referrer" />
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
        <Body account={data} />
      ) : (
        <Problem title="Couldn't check the account" text="The tools server didn't answer." />
      )}
    </section>
  );
}
