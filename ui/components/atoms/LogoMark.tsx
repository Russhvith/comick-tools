// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2026 Russhvith

/**
 * The app's mark, a plain R on ComicK's blue. Kept in step with
 * app/icon.svg, which is the same drawing used as the favicon.
 */
export function LogoMark({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" className={className} aria-hidden focusable="false">
      <rect width="32" height="32" rx="7" fill="#2563eb" />
      <path
        d="M11.5 23.5v-15h5.25a4.25 4.25 0 0 1 0 8.5H11.5M16 17l5 6.5"
        fill="none"
        stroke="#fff"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
