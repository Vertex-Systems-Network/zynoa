/** US-103 AC1 / AUTH-006: per-account failure window → CAPTCHA + progressive delay. */
import { afterEach, describe, expect, it, vi } from "vitest";
import { createMockCaptcha, createTurnstileCaptcha, MOCK_CAPTCHA_PASS } from "../src/captcha.js";
import { createSignInGuard, SIGN_IN_POLICY } from "../src/sign-in-guard.js";

afterEach(() => vi.unstubAllGlobals());

function guardWithClock() {
  const clock = { now: 0 };
  const sleeps: number[] = [];
  const guard = createSignInGuard({
    captcha: createMockCaptcha(),
    now: () => clock.now,
    sleep: async (ms) => {
      sleeps.push(ms);
    },
  });
  return { guard, clock, sleeps };
}

describe("createSignInGuard", () => {
  it("allows freely below 5 failures, no delay", async () => {
    const { guard, sleeps } = guardWithClock();
    for (let i = 0; i < 4; i++) guard.record("a@example.com", "failure");
    expect(await guard.check("a@example.com", undefined)).toEqual({ allowed: true });
    expect(sleeps).toEqual([]);
  });

  it("requires a valid CAPTCHA from the 5th failure on", async () => {
    const { guard } = guardWithClock();
    for (let i = 0; i < 5; i++) guard.record("a@example.com", "failure");
    expect(await guard.check("a@example.com", undefined)).toEqual({ allowed: false });
    expect(await guard.check("a@example.com", "wrong")).toEqual({ allowed: false });
    expect(await guard.check("a@example.com", MOCK_CAPTCHA_PASS)).toEqual({ allowed: true });
  });

  it("applies a progressive, capped delay once over the threshold", async () => {
    const { guard, sleeps } = guardWithClock();
    for (let i = 0; i < 5; i++) guard.record("a@example.com", "failure");
    await guard.check("a@example.com", MOCK_CAPTCHA_PASS);
    guard.record("a@example.com", "failure");
    await guard.check("a@example.com", MOCK_CAPTCHA_PASS);
    for (let i = 0; i < 10; i++) guard.record("a@example.com", "failure");
    await guard.check("a@example.com", MOCK_CAPTCHA_PASS);
    expect(sleeps[0]).toBe(SIGN_IN_POLICY.baseDelayMs);
    expect(sleeps[1]).toBe(SIGN_IN_POLICY.baseDelayMs * 2);
    expect(sleeps[2]).toBe(SIGN_IN_POLICY.maxDelayMs);
  });

  it("counts per account (case-insensitive) and independent of other accounts", async () => {
    const { guard } = guardWithClock();
    for (let i = 0; i < 5; i++) guard.record("Victim@Example.com", "failure");
    expect(await guard.check("victim@example.com", undefined)).toEqual({ allowed: false });
    expect(await guard.check("other@example.com", undefined)).toEqual({ allowed: true });
  });

  it("forgets failures older than 15 minutes", async () => {
    const { guard, clock } = guardWithClock();
    for (let i = 0; i < 5; i++) guard.record("a@example.com", "failure");
    clock.now = SIGN_IN_POLICY.windowMs + 1;
    expect(await guard.check("a@example.com", undefined)).toEqual({ allowed: true });
  });

  it("a successful sign-in clears the account's failures", async () => {
    const { guard } = guardWithClock();
    for (let i = 0; i < 5; i++) guard.record("a@example.com", "failure");
    guard.record("a@example.com", "success");
    expect(await guard.check("a@example.com", undefined)).toEqual({ allowed: true });
  });
});

describe("createSignInGuard: concurrency and memory", () => {
  it("reserves a slot per allowed attempt, so a parallel burst gets at most 5 guesses", async () => {
    const { guard } = guardWithClock();
    const decisions = await Promise.all(
      Array.from({ length: 12 }, () => guard.check("burst@example.com", undefined)),
    );
    expect(decisions.filter((d) => d.allowed)).toHaveLength(5);
  });

  it("neutral outcomes release the reservation without counting a failure", async () => {
    const { guard } = guardWithClock();
    for (let i = 0; i < 5; i++) {
      await guard.check("n@example.com", undefined);
      guard.record("n@example.com", "neutral");
    }
    expect(await guard.check("n@example.com", undefined)).toEqual({ allowed: true });
  });

  it("allows only one delayed attempt per account, even with slow CAPTCHA verification", async () => {
    const slowCaptcha = {
      verify: async (token: string) => {
        await new Promise((resolve) => setTimeout(resolve, 20));
        return token === MOCK_CAPTCHA_PASS;
      },
    };
    const guard = createSignInGuard({ captcha: slowCaptcha, sleep: async () => {} });
    for (let i = 0; i < 5; i++) guard.record("s@example.com", "failure");
    // Same tick: both calls race through verification.
    const results = await Promise.all([
      guard.check("s@example.com", MOCK_CAPTCHA_PASS),
      guard.check("s@example.com", MOCK_CAPTCHA_PASS),
      guard.check("s@example.com", MOCK_CAPTCHA_PASS),
    ]);
    expect(results.filter((r) => r.allowed)).toHaveLength(1);
  });

  it("evicts idle accounts before ones with recent failures", async () => {
    const clock = { now: 0 };
    const guard = createSignInGuard({
      captcha: createMockCaptcha(),
      now: () => clock.now,
      maxTrackedAccounts: 2,
    });
    guard.record("stale@example.com", "failure"); // oldest, but will expire
    clock.now = SIGN_IN_POLICY.windowMs + 1;
    for (let i = 0; i < 5; i++) guard.record("victim@example.com", "failure");
    guard.record("attacker-flood@example.com", "failure"); // at cap
    // The expired entry was evicted, not the victim (still CAPTCHA-gated).
    expect(await guard.check("victim@example.com", undefined)).toEqual({ allowed: false });
  });

  it("caps tracked accounts, evicting the oldest", async () => {
    const guard = createSignInGuard({ captcha: createMockCaptcha(), maxTrackedAccounts: 3 });
    for (const e of ["a", "b", "c", "d"]) guard.record(`${e}@example.com`, "failure");
    expect(guard.size()).toBe(3);
  });

  it("sweeps accounts whose failures have all expired", async () => {
    const { guard, clock } = guardWithClock();
    for (let i = 0; i < 50; i++) guard.record(`k${i}@example.com`, "failure");
    expect(guard.size()).toBe(50);
    clock.now = SIGN_IN_POLICY.windowMs + SIGN_IN_POLICY.sweepEveryMs + 1;
    await guard.check("fresh@example.com", undefined);
    expect(guard.size()).toBe(1);
  });
});

describe("captcha verifiers", () => {
  it("mock passes only the documented test token", async () => {
    const captcha = createMockCaptcha();
    expect(await captcha.verify(MOCK_CAPTCHA_PASS)).toBe(true);
    expect(await captcha.verify("anything-else")).toBe(false);
  });

  it("turnstile posts secret, token and IP to siteverify and trusts only success:true", async () => {
    const fetchSpy = vi.fn(async () => new Response(JSON.stringify({ success: true })));
    vi.stubGlobal("fetch", fetchSpy);
    const captcha = createTurnstileCaptcha("s3cret");
    expect(await captcha.verify("tok", "203.0.113.9")).toBe(true);
    const [url, init] = fetchSpy.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://challenges.cloudflare.com/turnstile/v0/siteverify");
    const form = new URLSearchParams(init.body as string);
    expect(Object.fromEntries(form)).toEqual({
      secret: "s3cret",
      response: "tok",
      remoteip: "203.0.113.9",
    });
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it("turnstile fails closed on a negative answer, HTTP error or network failure", async () => {
    const captcha = createTurnstileCaptcha("s3cret");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ success: false }))),
    );
    expect(await captcha.verify("tok")).toBe(false);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("err", { status: 500 })),
    );
    expect(await captcha.verify("tok")).toBe(false);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("network down");
      }),
    );
    expect(await captcha.verify("tok")).toBe(false);
  });

  it("turnstile rejects an empty token without calling out", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    expect(await createTurnstileCaptcha("s3cret").verify("")).toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
