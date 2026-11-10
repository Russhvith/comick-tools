import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";
import { ROLES, type Account, type Role } from "@/types/account";
import { readEnv } from "./env";
import { REPO_ROOT } from "./paths";
import { pythonCommand } from "./runs";

const run = promisify(execFile);

// Cloudflare answers Node's fetch with a challenge page, but lets the
// Python client the tools use through, so the account check goes via that.
const SCRIPT = path.join(REPO_ROOT, "lib", "comick_tools", "whoami.py");

// The page asks on every load. Five minutes keeps that to one call to
// ComicK in a normal session while still noticing a role change soon.
const CACHE_MS = 5 * 60 * 1000;

const store = globalThis as unknown as { __comickAccount?: { at: number; token: string; account: Account } };

type Raw = {
  state: "ok" | "no-cookie" | "rejected" | "error";
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
    // server, never the email it came from.
    avatar: `https://secure.gravatar.com/avatar/${raw.email_hash ?? ""}?s=160&d=identicon`,
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

/** Who the cookie in .env belongs to. Never throws, failures come back as a state. */
export async function currentAccount(force = false): Promise<Account> {
  const token = readEnv().COMICK_SESSION_TOKEN?.trim() ?? "";
  const now = Date.now();
  if (!token) return { state: "no-cookie", checkedAt: now };

  // A new cookie in .env is a new account, so the cache is per token.
  const cached = store.__comickAccount;
  if (!force && cached && cached.token === token && now - cached.at < CACHE_MS) return cached.account;

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
  // Keep answers ComicK gave for a while, but try again on the next load
  // after a failure, since that's usually a blip.
  if (account.state !== "error") store.__comickAccount = { at: now, token, account };
  return account;
}
