// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import Home from "../src/app/page";

afterEach(cleanup);

describe("Landing page (PUB-01 placeholder)", () => {
  it("renders the value proposition with token typography classes", () => {
    render(<Home />);
    const hero = screen.getByRole("heading", { level: 1 });
    expect(hero.textContent).toMatch(/one workspace/i);
    expect(hero.className).toContain("type-display-");
  });

  it("renders the four pillars from the product vision", () => {
    render(<Home />);
    for (const pillar of [
      "AI Creation Studios",
      "AI-supervised Project OS",
      "Reusable Ecosystem",
      "Business Systems + Workflows",
    ]) {
      expect(screen.getByRole("heading", { level: 3, name: pillar })).toBeTruthy();
    }
  });

  it("renders the example-outcomes placeholder section", () => {
    render(<Home />);
    expect(screen.getByRole("heading", { name: /see it in action/i })).toBeTruthy();
    expect(screen.getByText(/example outcomes/i)).toBeTruthy();
  });

  it("has the PUB-01 calls to action (waitlist live, auth placeholder)", () => {
    render(<Home />);
    const start = screen.getByRole("link", { name: /join the waitlist/i });
    const signIn = screen.getByRole("link", { name: /sign in/i });
    // Phase 0: the primary CTA leads to the early-access waitlist (WU-P0-15);
    // auth does not exist yet, so sign-in stays a placeholder anchor.
    expect(start.getAttribute("href")).toBe("/early-access");
    expect(signIn.getAttribute("href")).toBe("#signin");
  });

  it("uses token utilities, not hardcoded colors", () => {
    const { container } = render(<Home />);
    expect(container.innerHTML).not.toMatch(/#[0-9a-fA-F]{6}|rgb\(/);
  });
});
