/** US-102 AC2: session guards — UNAUTHENTICATED 401 and EMAIL_NOT_VERIFIED 403. */
import fastify from "fastify";
import { describe, expect, it } from "vitest";
import { errorEnvelope } from "@zynoa/contracts";
import { createSessionGuards, type GetSession } from "../src/session-guards.js";

function appWith(getSession: GetSession) {
  const app = fastify();
  const guards = createSessionGuards(getSession);
  app.decorateRequest("authSession", null);
  app.get("/signed-in", { preHandler: guards.requireSession }, async (request) => ({
    userId: request.authSession?.user.id,
  }));
  app.post("/gated", { preHandler: guards.requireVerifiedEmail }, async (request) => ({
    userId: request.authSession?.user.id,
  }));
  return app;
}

const verified: GetSession = async () => ({ user: { id: "u1", emailVerified: true } });
const unverified: GetSession = async () => ({ user: { id: "u2", emailVerified: false } });
const anonymous: GetSession = async () => null;

describe("requireSession", () => {
  it("401s without a session, with the standard envelope", async () => {
    const res = await appWith(anonymous).inject({ method: "GET", url: "/signed-in" });
    expect(res.statusCode).toBe(401);
    expect(errorEnvelope.parse(res.json()).error.code).toBe("UNAUTHENTICATED");
  });

  it("lets unverified users through (they may sign in and look around)", async () => {
    const res = await appWith(unverified).inject({ method: "GET", url: "/signed-in" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ userId: "u2" });
  });

  it("passes the request's cookies to the session lookup", async () => {
    let seenCookie: string | null = null;
    const app = appWith(async (headers) => {
      seenCookie = headers.get("cookie");
      return null;
    });
    await app.inject({ method: "GET", url: "/signed-in", headers: { cookie: "vsn_session=abc" } });
    expect(seenCookie).toBe("vsn_session=abc");
  });
});

describe("requireVerifiedEmail", () => {
  it("403s EMAIL_NOT_VERIFIED for an unverified user", async () => {
    const res = await appWith(unverified).inject({ method: "POST", url: "/gated" });
    expect(res.statusCode).toBe(403);
    const body = errorEnvelope.parse(res.json());
    expect(body.error.code).toBe("EMAIL_NOT_VERIFIED");
    expect(body.error.message).toMatch(/verify your email/i);
  });

  it("401s (not 403) when there is no session at all", async () => {
    const res = await appWith(anonymous).inject({ method: "POST", url: "/gated" });
    expect(res.statusCode).toBe(401);
  });

  it("allows a verified user", async () => {
    const res = await appWith(verified).inject({ method: "POST", url: "/gated" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ userId: "u1" });
  });
});
