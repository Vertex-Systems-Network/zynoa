import "./globals.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ThemeProvider, themeInitScript } from "../components/theme";

export const metadata: Metadata = {
  title: { default: "Zynoa", template: "%s · Zynoa" },
  description: "Zynoa dashboard",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    // data-theme is set by the inline script before hydration; React must not diff it.
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="bg-bg-canvas text-text-primary antialiased">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
