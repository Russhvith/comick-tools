// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2026 Russhvith

/**
 * Where the browser can load an episode's preview from, or null when there
 * is nothing local to show. A link means the formatter skipped or failed
 * the download, and we don't hotlink Crunchyroll's CDN for it.
 *
 * Preview paths in output.txt are relative to output.txt itself, so they
 * get joined onto that file's folder before going to the server.
 *
 * `version` should change whenever the images might have, like output.txt's
 * modified time. A format run rewrites them under the same names, and
 * without it the browser keeps showing the old ones until a reload.
 */
export function previewSrc(
  toolId: string,
  filePath: string,
  preview: string | null | undefined,
  version?: number | null,
): string | null {
  const value = preview?.trim();
  if (!value || /^[a-z][a-z0-9+.-]*:/i.test(value)) return null;
  const folder = filePath.includes("/") ? filePath.slice(0, filePath.lastIndexOf("/") + 1) : "";
  const path = encodeURIComponent(folder + value.replace(/\\/g, "/"));
  return `/api/images?tool=${encodeURIComponent(toolId)}&path=${path}${version ? `&v=${Math.floor(version)}` : ""}`;
}
