// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2026 Russhvith

/**
 * What the settings page can see of .env. The cookie itself never comes
 * back to the browser, only whether it's set and how long it is.
 */
export type Settings = {
  envExists: boolean;
  agreed: boolean;
  cookie: { set: boolean; length: number };
  uploadsPerSecond: string;
  requestsPerMinute: string;
  apiBase: string;
  defaults: { uploadsPerSecond: string; requestsPerMinute: string; apiBase: string };
};

/** A change to .env. A field left out stays as it is. */
export type SettingsUpdate = {
  /** A new cookie, or "" to remove it. */
  cookie?: string;
  uploadsPerSecond?: string;
  requestsPerMinute?: string;
  apiBase?: string;
};
