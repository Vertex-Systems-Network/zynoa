/** /api/auth/* mount (spec 05 §2) with a fake Better Auth handler — no DB needed. */
import { describe, expect, it } from "vitest";
import { errorEnvelope } from "@zynoa/contracts";
import { buildApp, type Probes } from "../src/app.js";

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
