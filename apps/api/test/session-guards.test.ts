/** US-102 AC2: session guards — UNAUTHENTICATED 401 and EMAIL_NOT_VERIFIED 403. */
import fastify from "fastify";
import { describe, expect, it } from "vitest";
import { errorEnvelope } from "@zynoa/contracts";
import { createSessionGuards, type GetSession } from "../src/session-guards.js";

function appWith(getSession: GetSession, options: { asyncOnSend?: boolean } = {}) {
  const app = fastify();
  const guards = createSessionGuards(getSession);
  const ran = { handler: 0 };
  app.decorateRequest("authSession", null);
  if (options.asyncOnSend) {
    // Mirrors a future security-headers hook: the regression guard for the
    // "handler runs after reply.send" Fastify trap.
    app.addHook("onSend", async (_request, reply, payload) => {
      await new Promise((resolve) => setTimeout(resolve, 5));
      reply.header("x-test-onsend", "1");
      return payload;
    });
  }
  app.get("/signed-in", { preHandler: guards.requireSession }, async (request) => {
    ran.handler++;
    return { userId: request.authSession?.user.id };
  });
  app.post("/gated", { preHandler: guards.requireVerifiedEmail }, async (request) => {
    ran.handler++;
    return { userId: request.authSession?.user.id };
  });
  return { app, ran };
}

const verified: GetSession = async () => ({ user: { id: "u1", emailVerified: true } });
const unverified: GetSession = async () => ({ user: { id: "u2", emailVerified: false } });
const anonymous: GetSession = async () => null;

describe("requireSession", () => {
  it("401s without a session and never runs the handler", async () => {
    const { app, ran } = appWith(anonymous);
    const res = await app.inject({ method: "GET", url: "/signed-in" });
    expect(res.statusCode).toBe(401);
    expect(errorEnvelope.parse(res.json()).error.code).toBe("UNAUTHENTICATED");
    expect(ran.handler).toBe(0);
  });

  it("lets unverified users through (they may sign in and look around)", async () => {
    const { app, ran } = appWith(unverified);
    const res = await app.inject({ method: "GET", url: "/signed-in" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ userId: "u2" });
    expect(ran.handler).toBe(1);
  });

  it("passes the request's cookies to the session lookup", async () => {
    let seenCookie: string | null = null;
    const { app } = appWith(async (headers) => {
      seenCookie = headers.get("cookie");
      return null;
    });
    await app.inject({ method: "GET", url: "/signed-in", headers: { cookie: "vsn_session=abc" } });
    expect(seenCookie).toBe("vsn_session=abc");
  });
});

describe("requireVerifiedEmail", () => {
  it("403s EMAIL_NOT_VERIFIED for an unverified user and never runs the handler", async () => {
    const { app, ran } = appWith(unverified);
    const res = await app.inject({ method: "POST", url: "/gated" });
    expect(res.statusCode).toBe(403);
    const body = errorEnvelope.parse(res.json());
    expect(body.error.code).toBe("EMAIL_NOT_VERIFIED");
    expect(body.error.message).toMatch(/verify your email/i);
    expect(ran.handler).toBe(0);
  });

  it("401s (not 403) when there is no session at all", async () => {
    const { app, ran } = appWith(anonymous);
    const res = await app.inject({ method: "POST", url: "/gated" });
    expect(res.statusCode).toBe(401);
    expect(ran.handler).toBe(0);
  });

  it("allows a verified user", async () => {
    const { app, ran } = appWith(verified);
    const res = await app.inject({ method: "POST", url: "/gated" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ userId: "u1" });
    expect(ran.handler).toBe(1);
  });

  it("still blocks the handler when an async onSend hook is registered", async () => {
    for (const getSession of [anonymous, unverified]) {
      const { app, ran } = appWith(getSession, { asyncOnSend: true });
      const res = await app.inject({ method: "POST", url: "/gated" });
      expect([401, 403]).toContain(res.statusCode);
      expect(res.headers["x-test-onsend"]).toBe("1");
      expect(ran.handler).toBe(0);
    }
  });
});
