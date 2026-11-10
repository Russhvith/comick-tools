// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2026 Russhvith

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Nothing here is meant to be reachable from outside this machine, and
  // the header only advertises the framework.
  poweredByHeader: false,
  reactStrictMode: true,
};

export default nextConfig;
