// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2026 Russhvith

import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";
import { ROLES, type Account, type Role } from "@/types/account";
import { readEnv, termsAccepted } from "./env";
import { REPO_ROOT } from "./paths";
import { pythonCommand } from "./runs";

const run = promisify(execFile);

// Cloudflare answers Node's fetch with a challenge page, but lets the
// Python client the tools use through, so the account check goes via that.
const SCRIPT = path.join(REPO_ROOT, "lib", "comick_tools", "whoami.py");

// The page asks on every load. Five minutes keeps that to one call to
// ComicK in a normal session while still noticing a role change soon.
const CACHE_MS = 5 * 60 * 1000;
// A refresh asked for this soon after the last check gets that check's
// answer. Each check is a call to ComicK outside the tools' rate limiter,
// so a page (or a loop of them) mustn't be able to fire them back to back
// and push a running upload or delete over the per-IP limit.
const MIN_FORCE_MS = 15 * 1000;
// Failures are kept briefly for the same reason: once ComicK is limiting
// us, every page load would otherwise start another check.
const ERROR_CACHE_MS = 15 * 1000;

const store = globalThis as unknown as {
  __comickAccount?: { at: number; token: string; account: Account };
  // A check already on its way, so callers arriving together share one
  // Python process instead of starting one each.
  __comickAccountPending?: { token: string; force: boolean; promise: Promise<Account> };
};

type Raw = {
  state: "ok" | "not-agreed" | "no-cookie" | "rejected" | "error";
  message?: string;
  active?: boolean;
  id?: string | null;
  username?: string | null;
  email_hash?: string | null;
  created_at?: string | null;
  role?: string | null;
  karma?: number | null;
  uploads?: number | null;
  comments?: number | null;
  following?: number | null;
  last_active?: string | null;
};

const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
const str = (v: unknown) => (typeof v === "string" && v ? v : null);

function toRole(value: unknown): Role {
  const role = typeof value === "string" ? value.toLowerCase() : "";
  return (ROLES as readonly string[]).includes(role) ? (role as Role) : "user";
}

function shape(raw: Raw, now: number): Account {
  if (raw.state === "not-agreed") return { state: "not-agreed", checkedAt: now };
  if (raw.state === "no-cookie") return { state: "no-cookie", checkedAt: now };
  if (raw.state === "rejected") return { state: "rejected", checkedAt: now };
  if (raw.state === "error") return { state: "error", message: raw.message || "ComicK didn't answer", checkedAt: now };
  if (!raw.active) return { state: "inactive", username: str(raw.username), checkedAt: now };
  const id = str(raw.id) ?? "";
  return {
    state: "signed-in",
    id,
    username: str(raw.username) ?? "Unknown",
    role: toRole(raw.role),
    // The same picture comick.dev shows. The hash is all that leaves the
    // server, never the email it came from. The card shows it at 56px, so
    // asking for twice that stays sharp on high density screens.
    avatar: `https://secure.gravatar.com/avatar/${raw.email_hash ?? ""}?s=112&d=identicon`,
    profileUrl: id ? `https://comick.dev/user/${id}` : "https://comick.dev",
    karma: num(raw.karma),
    uploads: num(raw.uploads),
    comments: num(raw.comments),
    following: num(raw.following),
    memberSince: str(raw.created_at),
    lastActive: str(raw.last_active),
    checkedAt: now,
  };
}

/** Drop the cached answer, after the cookie or the terms change. */
export function forgetAccount() {
  store.__comickAccount = undefined;
  store.__comickAccountPending = undefined;
}

/** Who the cookie in .env belongs to. Never throws, failures come back as a state. */
export async function currentAccount(force = false): Promise<Account> {
  const now = Date.now();
  // Nothing is sent to ComicK, not even this check, until the Terms are
  // accepted. Every page asks for the account, so this is the gate.
  if (!termsAccepted()) return { state: "not-agreed", checkedAt: now };
  const token = readEnv().COMICK_SESSION_TOKEN?.trim() ?? "";
  if (!token) return { state: "no-cookie", checkedAt: now };

  // A new cookie in .env is a new account, so the cache is per token.
  const cached = store.__comickAccount;
  if (cached && cached.token === token) {
    const age = now - cached.at;
    const limit = cached.account.state === "error" ? ERROR_CACHE_MS : force ? MIN_FORCE_MS : CACHE_MS;
    if (age < limit) return cached.account;
  }

  const pending = store.__comickAccountPending;
  // A forced check can ride on another forced one, never on a plain one
  // that may have started before whatever prompted the force.
  if (pending && pending.token === token && (pending.force || !force)) return pending.promise;
  const promise = checkAccount(token, now);
  store.__comickAccountPending = { token, force, promise };
  try {
    return await promise;
  } finally {
    if (store.__comickAccountPending?.promise === promise) store.__comickAccountPending = undefined;
  }
}

async function checkAccount(token: string, now: number): Promise<Account> {
  let account: Account;
  try {
    const { stdout } = await run(pythonCommand, [SCRIPT], {
      cwd: REPO_ROOT,
      windowsHide: true,
      timeout: 20_000,
      env: { ...process.env, PYTHONIOENCODING: "utf-8" },
    });
    account = shape(JSON.parse(stdout.trim().split(/\r?\n/).pop() || "{}") as Raw, now);
  } catch (error) {
    account = { state: "error", message: `Couldn't check the account (${(error as Error).message.split("\n")[0].slice(0, 120)})`, checkedAt: now };
  }
  // Keep answers ComicK gave for a while. Failures are usually a blip, so
  // they only hold for ERROR_CACHE_MS before the next load tries again.
  store.__comickAccount = { at: now, token, account };
  return account;
}
