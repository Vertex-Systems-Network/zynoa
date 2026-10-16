/** /api/auth/* mount (spec 05 §2) with a fake Better Auth handler — no DB needed. */
import { describe, expect, it } from "vitest";
import { errorEnvelope } from "@zynoa/contracts";
import { buildApp, type Probes } from "../src/app.js";
import { CAPTCHA_HEADER } from "../src/auth-routes.js";
import { createMockCaptcha, MOCK_CAPTCHA_PASS } from "../src/captcha.js";
import { createSignInGuard } from "../src/sign-in-guard.js";

const ok = async () => {};
const allOk: Probes = { database: ok, redis: ok, temporal: ok };

function appWithAuth(handler: (request: Request) => Promise<Response>) {
  return buildApp({ probes: allOk, auth: { handler } });
}

describe("auth mount", () => {
  it("is absent when no auth instance is provided", async () => {
    const app = await buildApp({ probes: allOk });
    const res = await app.inject({ method: "GET", url: "/api/auth/get-session" });
    expect(res.statusCode).toBe(404);
  });

  it("forwards method, path, headers and body, and returns the handler's response", async () => {
    let seen: { method: string; path: string; cookie: string | null; body: unknown } | undefined;
    const app = await appWithAuth(async (request) => {
      seen = {
        method: request.method,
        path: new URL(request.url).pathname,
        cookie: request.headers.get("cookie"),
        body: await request.json(),
      };
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    });
    const res = await app.inject({
      method: "POST",
      url: "/api/auth/sign-in/email",
      headers: { "content-type": "application/json", cookie: "vsn_session=abc" },
      payload: { email: "a@example.com", password: "a long enough password" },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true });
    expect(seen).toMatchObject({
      method: "POST",
      path: "/api/auth/sign-in/email",
      cookie: "vsn_session=abc",
      body: { email: "a@example.com", password: "a long enough password" },
    });
  });

  it("replaces any client x-forwarded-for with the resolved client IP (rate-limit key)", async () => {
    const seen: (string | null)[] = [];
    const app = await appWithAuth(async (request) => {
      seen.push(request.headers.get("x-forwarded-for"));
      return new Response(null, { status: 200 });
    });
    // Spoofed single value, spoofed multi-hop chain, and no header at all.
    await app.inject({
      method: "GET",
      url: "/api/auth/get-session",
      headers: { "x-forwarded-for": "6.6.6.6" },
    });
    await app.inject({
      method: "GET",
      url: "/api/auth/get-session",
      headers: { "x-forwarded-for": "6.6.6.6, 7.7.7.7" },
    });
    await app.inject({ method: "GET", url: "/api/auth/get-session" });
    // app.inject's socket peer is 127.0.0.1; Fastify has no trustProxy set.
    expect(seen).toEqual(["127.0.0.1", "127.0.0.1", "127.0.0.1"]);
  });

  describe("US-103 sign-in guard", () => {
    async function signInApp(status: () => number) {
      const calls = { handler: 0 };
      const guard = createSignInGuard({ captcha: createMockCaptcha(), sleep: async () => {} });
      const app = await buildApp({
        probes: allOk,
        auth: {
          handler: async () => {
            calls.handler++;
            return new Response(JSON.stringify({}), { status: status() });
          },
        },
        signInGuard: guard,
      });
      const attempt = (email = "Victim@Example.com", captcha?: string) =>
        app.inject({
          method: "POST",
          url: "/api/auth/sign-in/email",
          headers: {
            "content-type": "application/json",
            ...(captcha ? { [CAPTCHA_HEADER]: captcha } : {}),
          },
          payload: { email, password: "wrong password here" },
        });
      return { app, attempt, calls };
    }
    const signInAppRaw = signInApp;

    it("after 5 wrong passwords the account needs a CAPTCHA; the handler is not called", async () => {
      const { attempt, calls } = await signInApp(() => 401);
      for (let i = 0; i < 5; i++) expect((await attempt()).statusCode).toBe(401);
      const blocked = await attempt("victim@example.com");
      expect(blocked.statusCode).toBe(429);
      const body = errorEnvelope.parse(blocked.json());
      expect(body.error.code).toBe("RATE_LIMITED");
      expect(body.error.details).toEqual({ captchaRequired: true });
      expect(calls.handler).toBe(5);
    });

    it("a valid CAPTCHA lets the attempt through again", async () => {
      const { attempt, calls } = await signInApp(() => 401);
      for (let i = 0; i < 5; i++) await attempt();
      expect((await attempt(undefined, "bogus")).statusCode).toBe(429);
      expect((await attempt(undefined, MOCK_CAPTCHA_PASS)).statusCode).toBe(401);
      expect(calls.handler).toBe(6);
    });

    it("does not count Better Auth's own per-IP 429s as password failures", async () => {
      const { attempt } = await signInApp(() => 429);
      for (let i = 0; i < 8; i++) await attempt();
      // Still no CAPTCHA demanded: none of those were credential checks.
      expect((await attempt()).statusCode).toBe(429);
      const body = (await attempt()).json() as { error?: unknown };
      expect(body.error).toBeUndefined(); // Better Auth's body, not our envelope
    });

    async function failFiveTimes(attempt: (email?: string) => Promise<{ statusCode: number }>) {
      for (let i = 0; i < 5; i++) await attempt();
    }

    it("regression: a BOM-prefixed JSON body is still guarded", async () => {
      const { app, attempt, calls } = await signInAppRaw(() => 401);
      await failFiveTimes(attempt);
      const bom = Buffer.concat([
        Buffer.from([0xef, 0xbb, 0xbf]),
        Buffer.from(JSON.stringify({ email: "victim@example.com", password: "x".repeat(12) })),
      ]);
      const res = await app.inject({
        method: "POST",
        url: "/api/auth/sign-in/email",
        headers: { "content-type": "application/json" },
        payload: bom,
      });
      expect(res.statusCode).toBe(429);
      expect(calls.handler).toBe(5);
    });

    it("regression: dot-segment and fragment paths are still guarded", async () => {
      const { app, attempt, calls } = await signInAppRaw(() => 401);
      await failFiveTimes(attempt);
      for (const url of [
        "/api/auth/./sign-in/email",
        "/api/auth/x/../sign-in/email",
        "/api/auth/%2e/sign-in/email",
      ]) {
        const res = await app.inject({
          method: "POST",
          url,
          headers: { "content-type": "application/json" },
          payload: { email: "victim@example.com", password: "x".repeat(12) },
        });
        expect(res.statusCode, url).toBe(429);
      }
      expect(calls.handler).toBe(5);
    });

    it("fails closed: a sign-in without a usable email never reaches Better Auth", async () => {
      const { app, calls } = await signInAppRaw(() => 401);
      for (const payload of [
        "not json",
        JSON.stringify({ password: "x" }),
        JSON.stringify({ email: "a".repeat(300) }),
      ]) {
        const res = await app.inject({
          method: "POST",
          url: "/api/auth/sign-in/email",
          headers: { "content-type": "application/json" },
          payload,
        });
        expect(res.statusCode).toBe(400);
      }
      expect(calls.handler).toBe(0);
    });

    it("a successful sign-in clears the count; 400s are not counted", async () => {
      let status = 401;
      const { attempt } = await signInAppRaw(() => status);
      for (let i = 0; i < 4; i++) await attempt();
      status = 200;
      await attempt();
      status = 401;
      for (let i = 0; i < 4; i++) await attempt();
      status = 400;
      for (let i = 0; i < 3; i++) await attempt();
      status = 401;
      // 4 failures since the success, 400s ignored → the 5th is still allowed.
      expect((await attempt()).statusCode).toBe(401);
      expect((await attempt()).statusCode).toBe(429);
    });

    it("guards unknown emails exactly like real ones (no enumeration)", async () => {
      const { attempt } = await signInApp(() => 401);
      for (let i = 0; i < 5; i++) await attempt("nobody@example.com");
      expect((await attempt("nobody@example.com")).statusCode).toBe(429);
    });
  });

  it("passes Set-Cookie headers through one per cookie", async () => {
    const app = await appWithAuth(async () => {
      const headers = new Headers();
      headers.append("set-cookie", "vsn_session=s1; Path=/; HttpOnly; SameSite=Lax");
      headers.append("set-cookie", "vsn_csrf=c1; Path=/");
      return new Response(null, { status: 200, headers });
    });
    const res = await app.inject({ method: "GET", url: "/api/auth/get-session" });
    const setCookie = res.headers["set-cookie"];
    expect(Array.isArray(setCookie) ? setCookie : [setCookie]).toEqual([
      "vsn_session=s1; Path=/; HttpOnly; SameSite=Lax",
      "vsn_csrf=c1; Path=/",
    ]);
  });

  it("US-101 AC2: flattens duplicate-email 422s into one generic envelope", async () => {
    const app = await appWithAuth(
      async () =>
        new Response(JSON.stringify({ code: "USER_ALREADY_EXISTS", message: "User exists" }), {
          status: 422,
          headers: { "content-type": "application/json" },
        }),
    );
    const res = await app.inject({
      method: "POST",
      url: "/api/auth/sign-up/email",
      headers: { "content-type": "application/json" },
      payload: { name: "X", email: "x@example.com", password: "a long enough password" },
    });
    expect(res.statusCode).toBe(400);
    const body = errorEnvelope.parse(res.json());
    expect(body.error.code).toBe("VALIDATION_FAILED");
    expect(JSON.stringify(body)).not.toMatch(/exist/i);
    expect(JSON.stringify(body)).not.toContain("x@example.com");
  });

  it("leaves non-sign-up 422s untouched", async () => {
    const app = await appWithAuth(
      async () =>
        new Response(JSON.stringify({ code: "INVALID_TOKEN" }), {
          status: 422,
          headers: { "content-type": "application/json" },
        }),
    );
    const res = await app.inject({
      method: "POST",
      url: "/api/auth/verify-email",
      headers: { "content-type": "application/json" },
      payload: {},
    });
    expect(res.statusCode).toBe(422);
    expect(res.json()).toEqual({ code: "INVALID_TOKEN" });
  });

  it("leaves field-validation 400s from sign-up untouched (inline errors)", async () => {
    const app = await appWithAuth(
      async () =>
        new Response(JSON.stringify({ code: "PASSWORD_TOO_SHORT", message: "too short" }), {
          status: 400,
          headers: { "content-type": "application/json" },
        }),
    );
    const res = await app.inject({
      method: "POST",
      url: "/api/auth/sign-up/email",
      headers: { "content-type": "application/json" },
      payload: { name: "X", email: "x@example.com", password: "short" },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json()).toEqual({ code: "PASSWORD_TOO_SHORT", message: "too short" });
  });
});
