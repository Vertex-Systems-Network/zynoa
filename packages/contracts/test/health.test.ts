import { describe, expect, it } from "vitest";
import { healthResponse, readyResponse } from "../src/index.js";

describe("health contracts", () => {
  it("accepts a healthz payload", () => {
    const body = {
      data: { status: "ok" as const, uptimeSeconds: 12.5 },
      meta: { requestId: "req_h" },
    };
    expect(healthResponse.parse(body)).toEqual(body);
  });

  it("accepts a readyz payload with per-dependency checks", () => {
    const body = {
      data: {
        status: "ready" as const,
        checks: {
          database: { status: "ok" as const, latencyMs: 3 },
          redis: { status: "ok" as const, latencyMs: 1 },
          temporal: { status: "failed" as const, error: "connect ECONNREFUSED" },
        },
      },
      meta: { requestId: "req_r" },
    };
    expect(readyResponse.parse(body)).toEqual(body);
    expect(() =>
      readyResponse.parse({ data: { status: "nope", checks: {} }, meta: { requestId: "r" } }),
    ).toThrow();
  });
});
