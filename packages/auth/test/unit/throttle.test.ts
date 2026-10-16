/** Sliding-window per-key throttle (per-email verification-mail cap). */
import { describe, expect, it } from "vitest";
import { createThrottle } from "../../src/throttle.js";

describe("createThrottle", () => {
  it("allows up to max hits per window, then refuses", () => {
    const allow = createThrottle({ max: 3, windowMs: 1000, now: () => 0 });
    expect([allow("a"), allow("a"), allow("a"), allow("a")]).toEqual([true, true, true, false]);
  });

  it("keys are independent", () => {
    const allow = createThrottle({ max: 1, windowMs: 1000, now: () => 0 });
    expect(allow("a")).toBe(true);
    expect(allow("b")).toBe(true);
    expect(allow("a")).toBe(false);
  });

  it("frees capacity as old hits leave the window", () => {
    let now = 0;
    const allow = createThrottle({ max: 2, windowMs: 1000, now: () => now });
    allow("a");
    now = 500;
    allow("a");
    expect(allow("a")).toBe(false);
    now = 1001; // the t=0 hit has expired, the t=500 one has not
    expect(allow("a")).toBe(true);
    expect(allow("a")).toBe(false);
  });

  it("refused attempts do not extend the block", () => {
    let now = 0;
    const allow = createThrottle({ max: 1, windowMs: 1000, now: () => now });
    allow("a");
    now = 900;
    expect(allow("a")).toBe(false);
    now = 1001;
    expect(allow("a")).toBe(true);
  });

  it("drops keys whose hits have all expired (bounded memory)", () => {
    let now = 0;
    const allow = createThrottle({ max: 1, windowMs: 1000, now: () => now });
    for (let i = 0; i < 100; i++) allow(`k${i}`);
    now = 5000;
    allow("fresh");
    expect(allow.size()).toBe(1);
  });
});
