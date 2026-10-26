import type { Metadata } from "next";
import type { ReactNode } from "react";
import { DevToolbar } from "@/components/dev/DevToolbar";
import { mockToolsEnabled } from "@/lib/dev/mock-tools";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bible Store (wireframe)",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        {mockToolsEnabled() ? <DevToolbar /> : null}
      </body>
    </html>
  );
}
