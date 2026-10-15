// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import WorkspaceHome from "../src/app/w/[workspace]/page";

afterEach(cleanup);

describe("Workspace Home (GL-01 skeleton)", () => {
  it("renders the GL-01 sections as empty placeholders", async () => {
    render(await WorkspaceHome({ params: Promise.resolve({ workspace: "demo" }) }));
    expect(screen.getByRole("heading", { level: 1, name: /home/i })).toBeTruthy();
    // Ask bar placeholder (disabled until GL-03 ships).
    expect(screen.getByPlaceholderText(/ask zynoa/i)).toBeTruthy();
    for (const section of [
      "My work",
      "Active projects",
      "Running jobs",
      "Recent assets",
      "Spend this month",
    ]) {
      expect(screen.getByRole("heading", { name: section })).toBeTruthy();
    }
  });

  it("contains no interactive features yet (Phase 0: ask bar disabled)", async () => {
    render(await WorkspaceHome({ params: Promise.resolve({ workspace: "demo" }) }));
    const ask = screen.getByPlaceholderText<HTMLInputElement>(/ask zynoa/i);
    expect(ask.disabled).toBe(true);
  });
});
