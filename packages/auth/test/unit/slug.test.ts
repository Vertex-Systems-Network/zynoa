/** Personal workspace slug: email local-part + random suffix (spec 05 §3). */
import { describe, expect, it } from "vitest";
import { workspaceSlugFromEmail } from "../../src/provisioning.js";

describe("workspaceSlugFromEmail", () => {
  it("uses the lowercased email local-part plus a random suffix", () => {
    const slug = workspaceSlugFromEmail("Jane.Doe@example.com");
    expect(slug).toMatch(/^jane-doe-[a-z0-9]{6}$/);
  });

  it("strips characters that are not slug-safe", () => {
    const slug = workspaceSlugFromEmail("weird+tag_user!@example.com");
    expect(slug).toMatch(/^weird-tag-user-[a-z0-9]{6}$/);
  });

  it("never returns an empty base even for degenerate local-parts", () => {
    const slug = workspaceSlugFromEmail("___@example.com");
    expect(slug).toMatch(/^workspace-[a-z0-9]{6}$/);
  });

  it("caps the base so slugs stay short", () => {
    const slug = workspaceSlugFromEmail(`${"a".repeat(100)}@example.com`);
    // 40-char base + "-" + 6-char suffix
    expect(slug.length).toBeLessThanOrEqual(47);
  });

  it("differs between calls (random suffix)", () => {
    expect(workspaceSlugFromEmail("same@example.com")).not.toBe(
      workspaceSlugFromEmail("same@example.com"),
    );
  });
});
