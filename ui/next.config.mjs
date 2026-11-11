// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2026 Russhvith

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Nothing here is meant to be reachable from outside this machine, and
  // the header only advertises the framework.
  poweredByHeader: false,
  reactStrictMode: true,
  // The dev server's badge sits bottom left by default, right on top of
  // the sidebar's footer links.
  devIndicators: { position: "bottom-right" },
  // Another site could otherwise load the UI in a hidden frame and steer
  // the owner's clicks onto Start over or the network switch. The old
  // header covers browsers that predate frame-ancestors.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
        ],
      },
    ];
  },
};

export default nextConfig;
