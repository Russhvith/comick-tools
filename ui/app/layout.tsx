// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2026 Russhvith

import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "@/components/organisms/Toaster";
import { site } from "@/config/site";
import "./globals.css";

// The server only runs on this machine, so the font arrives about as fast as
// the CSS does. A preload buys nothing and makes Chrome warn about an unused
// preload whenever the page loads in a background tab.
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", preload: false });

export const metadata: Metadata = {
  title: site.name,
  description: site.description,
  applicationName: site.name,
};

export const viewport: Viewport = {
  themeColor: "#1f2937",
  colorScheme: "dark",
  // Lets the safe-area insets in the CSS take effect on notched phones.
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <Toaster>{children}</Toaster>
      </body>
    </html>
  );
}
