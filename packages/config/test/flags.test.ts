import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createFlags, fileFlagSource, memoryFlagSource, rolloutBucket } from "../src/flags.js";

const WS_A = "0192f3a4-0000-7000-8000-000000000001";
const WS_B = "0192f3a4-0000-7000-8000-000000000002";

describe("feature flags", () => {
  it("is off by default for unknown flags", async () => {
    const flags = createFlags([memoryFlagSource([])]);
    expect(await flags.isEnabled("phase1.chat", WS_A)).toBe(false);
    expect(await flags.isEnabled("phase1.chat", null)).toBe(false);
  });

  it("applies a global row to every workspace", async () => {
    const flags = createFlags([
      memoryFlagSource([{ key: "phase1.chat", workspaceId: null, enabled: true }]),
    ]);
    expect(await flags.isEnabled("phase1.chat", WS_A)).toBe(true);
    expect(await flags.isEnabled("phase1.chat", null)).toBe(true);
  });

  it("lets a workspace row override the global row", async () => {
    const flags = createFlags([
      memoryFlagSource([
        { key: "phase2.coding-studio", workspaceId: null, enabled: false },
        { key: "phase2.coding-studio", workspaceId: WS_A, enabled: true },
      ]),
    ]);
    expect(await flags.isEnabled("phase2.coding-studio", WS_A)).toBe(true);
    expect(await flags.isEnabled("phase2.coding-studio", WS_B)).toBe(false);
  });

  it("uses the first source that has a value (e.g. DB before file)", async () => {
    const db = memoryFlagSource([{ key: "phase1.library", workspaceId: WS_A, enabled: false }]);
    const file = memoryFlagSource([{ key: "phase1.library", workspaceId: null, enabled: true }]);
    const flags = createFlags([db, file]);
    expect(await flags.isEnabled("phase1.library", WS_A)).toBe(false);
    expect(await flags.isEnabled("phase1.library", WS_B)).toBe(true);
  });

  it("rolls out deterministically by workspace", async () => {
    const flags = createFlags([
      memoryFlagSource([{ key: "phase1.board", workspaceId: null, enabled: true, rolloutPct: 30 }]),
    ]);
    const ids = Array.from({ length: 2000 }, (_, i) => `ws-${i}`);
    const on = (await Promise.all(ids.map((id) => flags.isEnabled("phase1.board", id)))).filter(
      Boolean,
    );
    expect(on.length / ids.length).toBeGreaterThan(0.25);
    expect(on.length / ids.length).toBeLessThan(0.35);
    expect(await flags.isEnabled("phase1.board", "ws-7")).toBe(
      await flags.isEnabled("phase1.board", "ws-7"),
    );
    expect(await flags.isEnabled("phase1.board", null)).toBe(false); // partial rollout needs a workspace
    expect(rolloutBucket("phase1.board", "ws-7")).toBe(rolloutBucket("phase1.board", "ws-7"));
  });

  it("rejects malformed flag keys", async () => {
    const flags = createFlags([memoryFlagSource([])]);
    await expect(flags.isEnabled("Phase1 Chat", WS_A)).rejects.toThrow(/flag key/);
    expect(() => memoryFlagSource([{ key: "bad key", workspaceId: null, enabled: true }])).toThrow(
      /flag key/,
    );
  });

  it("reads and validates a flag file", async () => {
    const dir = mkdtempSync(join(tmpdir(), "flags-"));
    const path = join(dir, "flags.json");
    writeFileSync(path, JSON.stringify([{ key: "phase0.demo", enabled: true }]));
    const flags = createFlags([fileFlagSource(path)]);
    expect(await flags.isEnabled("phase0.demo", WS_A)).toBe(true);
    writeFileSync(path, JSON.stringify([{ key: "phase0.demo", enabled: "yes" }]));
    expect(() => fileFlagSource(path)).toThrow(/flags\.json/);
  });

  it("treats a missing flag file as no flags (default off)", async () => {
    const flags = createFlags([fileFlagSource(join(tmpdir(), "does-not-exist", "flags.json"))]);
    expect(await flags.isEnabled("phase0.demo", WS_A)).toBe(false);
  });
});
