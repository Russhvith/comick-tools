import type { Metadata } from "next";
import { Dela_Gothic_One, Instrument_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const display = Dela_Gothic_One({ weight: "400", subsets: ["latin"], variable: "--font-display" });
const body = Instrument_Sans({ subsets: ["latin"], variable: "--font-body" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "comick tools",
  description: "Run the ComicK staff tools from the browser",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
