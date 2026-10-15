"use client";
/**
 * Light/dark/system theme for the dashboard (WU-P0-07).
 *
 * Contract with @zynoa/tokens/tokens.css: an explicit choice sets
 * `data-theme="light" | "dark"` on <html>; "system" removes the attribute so the
 * stylesheet's `prefers-color-scheme` fallback decides. The choice persists in
 * localStorage (a per-browser convenience — every read/write is try/catch'd).
 */
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";

export const THEME_STORAGE_KEY = "zynoa.theme";
export const THEMES = ["light", "dark", "system"] as const;
export type Theme = (typeof THEMES)[number];

function isTheme(value: unknown): value is Theme {
  return typeof value === "string" && (THEMES as readonly string[]).includes(value);
}

export function readStoredTheme(): Theme {
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isTheme(stored) ? stored : "system";
  } catch {
    return "system";
  }
}

export function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  if (theme === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", theme);
}

/**
 * Inline <script> body for the root layout: re-applies a stored explicit theme
 * before first paint so a dark-mode user never sees a light flash.
 */
export const themeInitScript =
  `try{var t=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});` +
  `if(t==="light"||t==="dark"){document.documentElement.setAttribute("data-theme",t)}}catch(e){}`;

type ThemeContextValue = { theme: Theme; setTheme: (theme: Theme) => void };

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Server and first client render must agree ("system") or hydration mismatches
  // leave stale aria/class attributes in the DOM (React does not patch them up).
  // The stored choice is read in a mount effect; until then the init script's
  // data-theme keeps the page colors correct.
  const [theme, setThemeState] = useState<Theme>("system");
  const [restored, setRestored] = useState(false);

  useEffect(() => {
    setThemeState(readStoredTheme());
    setRestored(true);
  }, []);

  useEffect(() => {
    // Before restore, leave the init script's attribute alone (applying "system"
    // here would strip it and flash a dark-mode user to light).
    if (restored) applyTheme(theme);
  }, [restored, theme]);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Storage may be unavailable (private mode); the in-memory theme still applies.
    }
  }, []);

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside <ThemeProvider>");
  return ctx;
}
