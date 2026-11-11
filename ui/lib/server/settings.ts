// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2026 Russhvith

import type { Settings, SettingsUpdate } from "@/types/settings";
import { forgetAccount } from "./account";
import { envExists, readEnv, termsAccepted, writeEnv } from "./env";
import { networkMode, networkUrls } from "./guard";

// Same defaults as lib/comick_tools/env.py.
const DEFAULTS = { uploadsPerSecond: "5", requestsPerMinute: "200", apiBase: "https://api.comick.dev" };
const COOKIE_NAME = "__Secure-comick-auth.session_token";

export function readSettings(): Settings {
  const env = readEnv();
  const listening = process.env.COMICK_TOOLS_LISTENING;
  const cookie = env.COMICK_SESSION_TOKEN?.trim() ?? "";
  return {
    envExists: envExists(),
    agreed: termsAccepted(),
    cookie: { set: cookie.length > 0, length: cookie.length },
    uploadsPerSecond: env.COMICK_UPLOADS_PER_SECOND ?? "",
    requestsPerMinute: env.COMICK_REQUESTS_PER_MINUTE ?? "",
    apiBase: env.COMICK_API_BASE ?? "",
    defaults: DEFAULTS,
    network: {
      enabled: networkMode(),
      // serve.mjs says how it started Next. The dev server doesn't go
      // through it, so there it's unknown.
      listening: listening === "network" || listening === "local" ? listening : null,
      urls: networkUrls(process.env.PORT || process.env.COMICK_TOOLS_PORT || "4321"),
    },
  };
}

/**
 * Tidy a pasted cookie: people copy it with its name, with quotes, or with
 * the semicolon from a Cookie header, and all of those mean the same value.
 */
function cleanCookie(raw: string): string {
  let value = raw.trim();
  if (value.startsWith(`${COOKIE_NAME}=`)) value = value.slice(COOKIE_NAME.length + 1);
  value = value.replace(/;.*$/, "").trim();
  const quoted = /^(["'])(.*)\1$/.exec(value);
  return quoted ? quoted[2].trim() : value;
}

/** Problems with a change, by field. Empty means it can be saved. */
export function checkSettings(update: SettingsUpdate): Record<string, string> {
  const problems: Record<string, string> = {};
  const positive = (field: "uploadsPerSecond" | "requestsPerMinute") => {
    const raw = update[field]?.trim();
    if (raw && !(Number(raw) > 0)) problems[field] = "A number above 0, or empty for the default";
  };
  positive("uploadsPerSecond");
  positive("requestsPerMinute");
  const base = update.apiBase?.trim();
  if (base) {
    try {
      const url = new URL(base);
      if (url.protocol !== "https:") problems.apiBase = "Has to start with https://, the cookie is sent there";
    } catch {
      problems.apiBase = "A full address like https://api.comick.dev, or empty for the default";
    }
  }
  if (update.cookie !== undefined) {
    const cookie = cleanCookie(update.cookie);
    if (/\s/.test(cookie)) problems.cookie = "That doesn't look like a cookie value, it has spaces in it";
  }
  return problems;
}

export function saveSettings(update: SettingsUpdate) {
  const changes: Record<string, string> = {};
  if (update.cookie !== undefined) changes.COMICK_SESSION_TOKEN = cleanCookie(update.cookie);
  if (update.uploadsPerSecond !== undefined) changes.COMICK_UPLOADS_PER_SECOND = update.uploadsPerSecond.trim();
  if (update.requestsPerMinute !== undefined) changes.COMICK_REQUESTS_PER_MINUTE = update.requestsPerMinute.trim();
  if (update.apiBase !== undefined) changes.COMICK_API_BASE = update.apiBase.trim().replace(/\/+$/, "");
  if (update.network !== undefined) changes.COMICK_TOOLS_NETWORK = update.network ? "true" : "false";
  if (Object.keys(changes).length) writeEnv(changes);
  // A different cookie or address can mean a different account.
  forgetAccount();
}

export function acceptTerms() {
  writeEnv({ COMICK_AGREED_TO_TERMS: "true" });
  forgetAccount();
}
