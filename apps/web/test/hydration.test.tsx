// @vitest-environment jsdom
/**
 * Hydration regression tests (PR #46 review): with a stored theme or collapsed
 * sidebar, server HTML and the first client render must match — React 19 does
 * not patch attribute mismatches and regenerates the tree on structural ones.
 */
import { act } from "react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Sidebar } from "../src/components/sidebar";
import { THEME_STORAGE_KEY, ThemeProvider } from "../src/components/theme";
import { ThemeToggle } from "../src/components/theme-toggle";

let host: HTMLDivElement;
let roots: Array<ReturnType<typeof hydrateRoot>>;

beforeEach(() => {
  window.localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
  host = document.createElement("div");
  document.body.appendChild(host);
  roots = [];
});

afterEach(async () => {
  await act(async () => roots.forEach((root) => root.unmount()));
  host.remove();
});

async function hydrate(element: React.ReactElement): Promise<unknown[]> {
  // Simulate a real server render: on the server there is no `window`, so any
  // `typeof window` branch in a component takes the server path. Without this,
  // renderToString under jsdom reads localStorage too and the mismatch these
  // tests exist to catch can never occur.
  const jsdomWindow = globalThis.window;
  Reflect.deleteProperty(globalThis, "window");
  let html: string;
  try {
    html = renderToString(element);
  } finally {
    globalThis.window = jsdomWindow;
  }
  host.innerHTML = html;
  const errors: unknown[] = [];
  await act(async () => {
    roots.push(hydrateRoot(host, element, { onRecoverableError: (error) => errors.push(error) }));
  });
  return errors;
}

describe("SSR hydration", () => {
  it("theme toggle hydrates cleanly with a stored explicit theme", async () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, "dark");
    const errors = await hydrate(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>,
    );
    expect(errors).toEqual([]);
    // After mount the stored choice is restored and applied.
    const dark = host.querySelector('button[aria-label="Dark"]');
    expect(dark?.getAttribute("aria-pressed")).toBe("true");
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });

  it("sidebar hydrates cleanly with a stored collapsed preference", async () => {
    window.localStorage.setItem("zynoa.sidebar.collapsed", "1");
    const errors = await hydrate(<Sidebar workspace="demo" />);
    expect(errors).toEqual([]);
    // After mount the stored preference is restored.
    const toggle = host.querySelector('button[aria-label="Expand sidebar"]');
    expect(toggle?.getAttribute("aria-expanded")).toBe("false");
  });
});
