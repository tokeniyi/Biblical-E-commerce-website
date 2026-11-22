import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";
import type { ReactNode } from "react";
import { AnalyticsProvider } from "@/components/analytics/AnalyticsProvider";
import { DevToolbar } from "@/components/dev/DevToolbar";
import { mockToolsEnabled } from "@/lib/dev/mock-tools";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Bible Store — Bibles for every reader", template: "%s · Bible Store" },
  description: "Study Bibles, devotional editions, large print and gifts. Compare translations, bindings and print sizes.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${fraunces.variable}`}>
      <body>
        <AnalyticsProvider>{children}</AnalyticsProvider>
        {mockToolsEnabled() ? <DevToolbar /> : null}
      </body>
    </html>
  );
}
