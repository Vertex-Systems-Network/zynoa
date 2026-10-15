// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { SIDEBAR_STORAGE_KEY, Sidebar } from "../src/components/sidebar";

beforeEach(() => window.localStorage.clear());
afterEach(cleanup);

describe("Sidebar (GL-01 shell)", () => {
  it("renders the Phase-0 navigation placeholders", () => {
    render(<Sidebar workspace="demo" />);
    const nav = screen.getByRole("navigation", { name: /workspace/i });
    for (const label of ["Home", "Projects", "Chat", "Inbox", "Jobs"]) {
      expect(screen.getByRole("link", { name: label })).toBeTruthy();
    }
    expect(nav).toBeTruthy();
  });

  it("nav links are scoped to the workspace route (/w/{ws})", () => {
    render(<Sidebar workspace="acme" />);
    expect(screen.getByRole("link", { name: "Home" }).getAttribute("href")).toBe("/w/acme");
    expect(screen.getByRole("link", { name: "Projects" }).getAttribute("href")).toBe(
      "/w/acme/projects",
    );
    expect(screen.getByRole("link", { name: "Jobs" }).getAttribute("href")).toBe("/w/acme/jobs");
  });

  it("starts expanded and collapses on toggle, keeping labels for screen readers", async () => {
    render(<Sidebar workspace="demo" />);
    const toggle = screen.getByRole("button", { name: /collapse sidebar/i });
    expect(toggle.getAttribute("aria-expanded")).toBe("true");

    await userEvent.click(toggle);
    const expand = screen.getByRole("button", { name: /expand sidebar/i });
    expect(expand.getAttribute("aria-expanded")).toBe("false");
    // Labels stay in the accessibility tree when collapsed.
    expect(screen.getByRole("link", { name: "Projects" })).toBeTruthy();
  });

  it("persists the collapsed state", async () => {
    const first = render(<Sidebar workspace="demo" />);
    await userEvent.click(screen.getByRole("button", { name: /collapse sidebar/i }));
    expect(window.localStorage.getItem(SIDEBAR_STORAGE_KEY)).toBe("1");
    first.unmount();

    render(<Sidebar workspace="demo" />);
    expect(screen.getByRole("button", { name: /expand sidebar/i })).toBeTruthy();
  });
});
