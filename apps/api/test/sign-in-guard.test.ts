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
