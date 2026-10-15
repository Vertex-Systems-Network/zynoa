// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { THEME_STORAGE_KEY, ThemeProvider, themeInitScript } from "../src/components/theme";
import { ThemeToggle } from "../src/components/theme-toggle";

function renderToggle() {
  return render(
    <ThemeProvider>
      <ThemeToggle />
    </ThemeProvider>,
  );
}

beforeEach(() => {
  window.localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
});

afterEach(cleanup);

describe("theme", () => {
  it("defaults to system: no data-theme attribute on <html>", () => {
    renderToggle();
    expect(document.documentElement.hasAttribute("data-theme")).toBe(false);
    expect(screen.getByRole("radio", { name: /system/i })).toBeTruthy();
  });

  it("selecting dark sets data-theme and persists the choice", async () => {
    renderToggle();
    await userEvent.click(screen.getByRole("radio", { name: /dark/i }));
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
  });

  it("selecting light sets data-theme=light", async () => {
    renderToggle();
    await userEvent.click(screen.getByRole("radio", { name: /light/i }));
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
  });

  it("returning to system removes the attribute so CSS prefers-color-scheme applies", async () => {
    renderToggle();
    await userEvent.click(screen.getByRole("radio", { name: /dark/i }));
    await userEvent.click(screen.getByRole("radio", { name: /system/i }));
    expect(document.documentElement.hasAttribute("data-theme")).toBe(false);
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("system");
  });

  it("restores a stored choice on mount", () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, "dark");
    renderToggle();
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    expect(screen.getByRole("radio", { name: /dark/i }).getAttribute("aria-checked")).toBe("true");
  });

  it("ignores an invalid stored value", () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, "neon");
    renderToggle();
    expect(document.documentElement.hasAttribute("data-theme")).toBe(false);
  });

  it("the no-flash init script applies a stored explicit theme before hydration", () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, "dark");
    // Execute the inline <script> body exactly as the browser would.
    new Function(themeInitScript)();
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });

  it("the no-flash init script leaves system untouched", () => {
    // Execute the inline <script> body exactly as the browser would.
    new Function(themeInitScript)();
    expect(document.documentElement.hasAttribute("data-theme")).toBe(false);
  });
});
