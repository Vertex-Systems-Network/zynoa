/** Audit hash chain (spec 04 §13): per-workspace chain + one global chain. */
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { computeAuditHash, type AuditHashInput } from "../../src/audit.js";

const base: AuditHashInput = {
  id: "0192f3a4-0000-7000-8000-000000000001",
  workspaceId: "0192f3a4-0000-7000-8000-00000000000a",
  actorType: "user",
  actorId: "0192f3a4-0000-7000-8000-000000000002",
  action: "workspace.created",
  targetType: "workspace",
  targetId: "0192f3a4-0000-7000-8000-00000000000a",
  metadata: { plan: "free" },
  prevHash: null,
};

describe("computeAuditHash", () => {
  it("is deterministic for identical input", () => {
    expect(computeAuditHash(base)).toBe(computeAuditHash({ ...base }));
  });

  it("is a 64-char lowercase sha256 hex digest", () => {
    expect(computeAuditHash(base)).toMatch(/^[0-9a-f]{64}$/);
  });

  it("chains: changing prevHash changes the hash", () => {
    const first = computeAuditHash(base);
    const second = computeAuditHash({ ...base, prevHash: first });
    expect(second).not.toBe(first);
  });

  it("covers every identifying field", () => {
    for (const patch of [
      { id: "0192f3a4-0000-7000-8000-0000000000ff" },
      { workspaceId: null },
      { actorType: "system" },
      { actorId: null },
      { action: "user.signed_up" },
      { targetType: "user" },
      { targetId: null },
      { metadata: { plan: "pro" } },
    ] satisfies Partial<AuditHashInput>[]) {
      expect(computeAuditHash({ ...base, ...patch })).not.toBe(computeAuditHash(base));
    }
  });

  it("is not fooled by delimiter-shaped field values", () => {
    // Field-separator injection: moving a boundary must not collide.
    const a = computeAuditHash({ ...base, action: "x|y", targetType: "z" });
    const b = computeAuditHash({ ...base, action: "x", targetType: "y|z" });
    expect(a).not.toBe(b);
  });

  it("matches sha256 over the documented canonical form", () => {
    const canonical = JSON.stringify([
      base.prevHash,
      base.id,
      base.workspaceId,
      base.actorType,
      base.actorId,
      base.action,
      base.targetType,
      base.targetId,
      JSON.stringify(base.metadata),
    ]);
    expect(computeAuditHash(base)).toBe(createHash("sha256").update(canonical).digest("hex"));
  });

  it("ignores metadata key order (jsonb round-trips reorder keys)", () => {
    const a = computeAuditHash({ ...base, metadata: { plan: "free", seat: 1 } });
    const b = computeAuditHash({ ...base, metadata: { seat: 1, plan: "free" } });
    expect(a).toBe(b);
    const nested = computeAuditHash({ ...base, metadata: { o: { x: 1, y: 2 } } });
    const nestedReordered = computeAuditHash({ ...base, metadata: { o: { y: 2, x: 1 } } });
    expect(nested).toBe(nestedReordered);
  });
});
