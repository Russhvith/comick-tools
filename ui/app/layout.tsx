import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "@/components/organisms/Toaster";
import { site } from "@/config/site";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: site.name,
  description: "Run the ComicK staff tools from the browser",
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
