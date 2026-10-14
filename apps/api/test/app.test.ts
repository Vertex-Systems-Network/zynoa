import { describe, expect, it } from "vitest";
import { z } from "zod";
import { errorEnvelope, healthResponse, readyResponse } from "@zynoa/contracts";
import { buildApp, type Probes } from "../src/app.js";

const ok = async () => {};
const boom = async () => {
  throw new Error("connect ECONNREFUSED 127.0.0.1:5432");
};
const allOk: Probes = { database: ok, redis: ok, temporal: ok };

describe("healthz", () => {
  it("answers 200 with the health envelope and a request id", async () => {
    const app = await buildApp({ probes: allOk });
    const res = await app.inject({ method: "GET", url: "/healthz" });
    expect(res.statusCode).toBe(200);
    const body = healthResponse.parse(res.json());
    expect(body.data.status).toBe("ok");
    expect(res.headers["x-request-id"]).toBe(body.meta.requestId);
  });
});

describe("readyz", () => {
  it("is ready when every dependency answers", async () => {
    const app = await buildApp({ probes: allOk });
    const res = await app.inject({ method: "GET", url: "/readyz" });
    expect(res.statusCode).toBe(200);
    const body = readyResponse.parse(res.json());
    expect(body.data.status).toBe("ready");
    expect(body.data.checks.database.status).toBe("ok");
  });

  it("is 503 with the failing dependency named when one is down", async () => {
    const app = await buildApp({ probes: { ...allOk, database: boom } });
    const res = await app.inject({ method: "GET", url: "/readyz" });
    expect(res.statusCode).toBe(503);
    const body = readyResponse.parse(res.json());
    expect(body.data.status).toBe("unready");
    expect(body.data.checks.database).toEqual({
      status: "failed",
      error: "connect ECONNREFUSED 127.0.0.1:5432",
    });
    expect(body.data.checks.redis.status).toBe("ok");
  });

  it("treats a hanging probe as failed after the timeout", async () => {
    const never = () => new Promise<void>(() => {});
    const app = await buildApp({ probes: { ...allOk, temporal: never }, probeTimeoutMs: 50 });
    const res = await app.inject({ method: "GET", url: "/readyz" });
    expect(res.statusCode).toBe(503);
    const body = readyResponse.parse(res.json());
    expect(body.data.checks.temporal).toEqual({ status: "failed", error: "timed out after 50ms" });
  });
});

describe("request id", () => {
  it("reuses a well-formed inbound X-Request-Id", async () => {
    const app = await buildApp({ probes: allOk });
    const res = await app.inject({
      method: "GET",
      url: "/healthz",
      headers: { "x-request-id": "req_gateway-123" },
    });
    expect(res.headers["x-request-id"]).toBe("req_gateway-123");
  });

  it("replaces a malformed inbound id", async () => {
    const app = await buildApp({ probes: allOk });
    const res = await app.inject({
      method: "GET",
      url: "/healthz",
      headers: { "x-request-id": "bad id\nwith newline" },
    });
    expect(res.headers["x-request-id"]).toMatch(/^req_[0-9a-f-]{36}$/);
  });
});

describe("error envelope", () => {
  it("returns NOT_FOUND for unknown routes", async () => {
    const app = await buildApp({ probes: allOk });
    const res = await app.inject({ method: "GET", url: "/nope" });
    expect(res.statusCode).toBe(404);
    const body = errorEnvelope.parse(res.json());
    expect(body.error.code).toBe("NOT_FOUND");
    expect(body.error.requestId).toBe(res.headers["x-request-id"]);
  });

  it("returns VALIDATION_FAILED with issue paths for bad input", async () => {
    const app = await buildApp({ probes: allOk });
    app.post(
      "/api/v1/echo",
      { schema: { body: z.object({ name: z.string().min(2) }) } },
      async (request) => ({ data: request.body, meta: { requestId: request.id } }),
    );
    const res = await app.inject({ method: "POST", url: "/api/v1/echo", payload: { name: "x" } });
    expect(res.statusCode).toBe(400);
    const body = errorEnvelope.parse(res.json());
    expect(body.error.code).toBe("VALIDATION_FAILED");
    expect(body.error.details?.issues).toEqual([
      { path: "/name", message: expect.stringContaining("2") },
    ]);
  });

  it("maps malformed JSON to a 400 VALIDATION_FAILED envelope, not INTERNAL", async () => {
    const app = await buildApp({ probes: allOk });
    app.post("/api/v1/echo2", async (request) => ({
      data: request.body,
      meta: { requestId: request.id },
    }));
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/echo2",
      headers: { "content-type": "application/json" },
      payload: "{bad json",
    });
    expect(res.statusCode).toBe(400);
    const body = errorEnvelope.parse(res.json());
    expect(body.error.code).toBe("VALIDATION_FAILED");
    expect(body.error.message).toBe("Request body could not be parsed.");
  });

  it("maps an unhandled route error to INTERNAL without leaking the message", async () => {
    const app = await buildApp({ probes: allOk });
    app.get("/explode", async () => {
      throw new Error("secret stack detail");
    });
    const res = await app.inject({ method: "GET", url: "/explode" });
    expect(res.statusCode).toBe(500);
    const body = errorEnvelope.parse(res.json());
    expect(body.error.code).toBe("INTERNAL");
    expect(JSON.stringify(body)).not.toContain("secret stack detail");
  });
});

describe("openapi", () => {
  it("serves OpenAPI 3.1 with the health routes", async () => {
    const app = await buildApp({ probes: allOk });
    await app.ready();
    const res = await app.inject({ method: "GET", url: "/api/v1/openapi.json" });
    expect(res.statusCode).toBe(200);
    const doc = res.json() as {
      openapi: string;
      info: { title: string };
      paths: Record<string, unknown>;
    };
    expect(doc.openapi).toMatch(/^3\.1/);
    expect(doc.info.title).toBe("Zynoa API");
    expect(Object.keys(doc.paths)).toEqual(expect.arrayContaining(["/healthz", "/readyz"]));
  });
});
