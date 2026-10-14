import { describe, expect, it } from "vitest";
import {
  ERROR_CODES,
  ERROR_STATUS,
  apiError,
  errorEnvelope,
  isErrorCode,
  successEnvelope,
} from "../src/index.js";
import { z } from "zod";

describe("error contract", () => {
  it("maps every error code to one HTTP status", () => {
    for (const code of ERROR_CODES) {
      expect(ERROR_STATUS[code], code).toBeGreaterThanOrEqual(400);
      expect(ERROR_STATUS[code], code).toBeLessThanOrEqual(599);
    }
    expect(ERROR_STATUS.VALIDATION_FAILED).toBe(400);
    expect(ERROR_STATUS.NOT_FOUND).toBe(404);
    expect(ERROR_STATUS.RATE_LIMITED).toBe(429);
    expect(ERROR_STATUS.SERVICE_UNAVAILABLE).toBe(503);
    expect(ERROR_STATUS.INTERNAL).toBe(500);
  });

  it("builds a spec §3 envelope", () => {
    const body = apiError("BUDGET_EXCEEDED", "Project budget reached (5,000 credits).", {
      requestId: "req_1",
      details: { limit: 5000, spent: 5000 },
    });
    expect(errorEnvelope.parse(body)).toEqual(body);
    expect(body.error.code).toBe("BUDGET_EXCEEDED");
    expect(body.error.requestId).toBe("req_1");
  });

  it("rejects unknown codes and malformed envelopes", () => {
    expect(isErrorCode("BUDGET_EXCEEDED")).toBe(true);
    expect(isErrorCode("NOPE")).toBe(false);
    expect(() =>
      errorEnvelope.parse({ error: { code: "NOPE", message: "x", requestId: "r" } }),
    ).toThrow();
    expect(() => errorEnvelope.parse({ error: { code: "NOT_FOUND" } })).toThrow();
  });

  it("wraps data in the success envelope with meta.requestId", () => {
    const schema = successEnvelope(z.object({ ok: z.boolean() }));
    const parsed = schema.parse({ data: { ok: true }, meta: { requestId: "req_2" } });
    expect(parsed.data.ok).toBe(true);
    expect(() => schema.parse({ data: { ok: true } })).toThrow();
  });
});
