import "./globals.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: { default: "Zynoa — AI workspace for real deliverables", template: "%s · Zynoa" },
  description:
    "One workspace where you describe an outcome and a supervised team of AI agents plans, creates, verifies and operates the deliverables.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  // The marketing site follows the visitor's system theme (tokens.css
  // prefers-color-scheme fallback); no toggle until the design pass.
  // suppressHydrationWarning: browser extensions (e.g. crxlauncher) inject
  // attributes on <html> before React hydrates; without this, dev logs a
  // hydration-mismatch warning that is not ours (observed on the owner's
  // machine, 2026-10-16). Same pattern as apps/web.
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-bg-canvas text-text-primary antialiased">{children}</body>
    </html>
  );
}
