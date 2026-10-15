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
  return (
    <html lang="en">
      <body className="bg-bg-canvas text-text-primary antialiased">{children}</body>
    </html>
  );
}
