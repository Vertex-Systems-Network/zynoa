"use client";
import { Monitor, Moon, Sun } from "lucide-react";
import { THEMES, useTheme } from "./theme";
import type { Theme } from "./theme";

const ICONS: Record<Theme, typeof Sun> = { light: Sun, dark: Moon, system: Monitor };
const LABELS: Record<Theme, string> = { light: "Light", dark: "Dark", system: "System" };

/** Three-way light/dark/system switch, rendered as a radio group. */
export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  return (
    <div
      role="group"
      aria-label="Theme"
      className="flex items-center gap-1 rounded-md border border-border-default bg-bg-surface p-1"
    >
      {THEMES.map((value) => {
        const Icon = ICONS[value];
        const active = theme === value;
        return (
          <button
            key={value}
            type="button"
            aria-pressed={active}
            aria-label={LABELS[value]}
            title={`${LABELS[value]} theme`}
            onClick={() => setTheme(value)}
            className={
              "rounded p-1.5 text-text-secondary transition-colors hover:text-text-primary " +
              "focus-visible:outline focus-visible:outline-2 focus-visible:outline-border-focus " +
              (active ? "bg-bg-subtle text-text-primary" : "")
            }
          >
            <Icon aria-hidden="true" className="size-4" />
          </button>
        );
      })}
    </div>
  );
}
