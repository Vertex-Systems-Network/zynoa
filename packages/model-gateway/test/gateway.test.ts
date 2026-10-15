import { describe, expect, it } from "vitest";
import { mockAdapter } from "../src/adapters/mock.js";
import { ModelGateway, UnknownProviderError } from "../src/gateway.js";
import { PRICING, costUsd } from "../src/pricing.js";
import type { ProviderAdapter } from "../src/types.js";

function fixedAdapter(provider: string, model: string): ProviderAdapter {
  return {
    provider,
    defaultModel: model,
    complete: ({ model: requested }) =>
      Promise.resolve({
        text: "ok",
        model: requested,
        usage: { inputTokens: 1_000_000, outputTokens: 2_000_000 },
      }),
  };
}

describe("pricing", () => {
  it("computes USD from per-million-token prices", () => {
    expect(
      costUsd("anthropic", "claude-haiku-5-5", { inputTokens: 1_000_000, outputTokens: 0 }),
    ).toBe(PRICING.anthropic?.["claude-haiku-5-5"]?.inputPerMTok);
    expect(
      costUsd("anthropic", "claude-sonnet-5-5", { inputTokens: 500_000, outputTokens: 100_000 }),
    ).toBeCloseTo(0.5 * 2 + 0.1 * 10, 10);
  });

  it("returns null for a model without a pricing row", () => {
    expect(
      costUsd("anthropic", "claude-unknown-9", { inputTokens: 10, outputTokens: 10 }),
    ).toBeNull();
    expect(costUsd("nobody", "x", { inputTokens: 10, outputTokens: 10 })).toBeNull();
  });
});

describe("ModelGateway", () => {
  it("routes to the first adapter by default and accounts cost", async () => {
    const gateway = new ModelGateway([fixedAdapter("anthropic", "claude-haiku-5-5")]);
    const result = await gateway.complete({ messages: [{ role: "user", content: "hi" }] });
    expect(result.provider).toBe("anthropic");
    expect(result.model).toBe("claude-haiku-5-5");
    // 1M input @ $0.10 + 2M output @ $0.50 = $1.10
    expect(result.costUsd).toBeCloseTo(1.1, 10);
  });

  it("routes by provider name and honors an explicit model", async () => {
    const gateway = new ModelGateway([
      fixedAdapter("anthropic", "claude-haiku-5-5"),
      mockAdapter(),
    ]);
    const result = await gateway.complete({
      provider: "mock",
      model: "mock-echo-1",
      messages: [{ role: "user", content: "ping" }],
    });
    expect(result.provider).toBe("mock");
    expect(result.text).toBe("echo: ping");
    expect(result.costUsd).toBe(0);
  });

  it("throws UnknownProviderError for an unregistered provider", async () => {
    const gateway = new ModelGateway([mockAdapter()]);
    await expect(
      gateway.complete({ provider: "openai", messages: [{ role: "user", content: "hi" }] }),
    ).rejects.toBeInstanceOf(UnknownProviderError);
  });

  it("surfaces null cost for unpriced models instead of guessing", async () => {
    const gateway = new ModelGateway([fixedAdapter("anthropic", "claude-experimental-x")]);
    const result = await gateway.complete({ messages: [{ role: "user", content: "hi" }] });
    expect(result.costUsd).toBeNull();
  });

  it("mock adapter is deterministic and bills at least one token each way", async () => {
    const gateway = new ModelGateway([mockAdapter()]);
    const first = await gateway.complete({ messages: [{ role: "user", content: "same input" }] });
    const second = await gateway.complete({ messages: [{ role: "user", content: "same input" }] });
    expect(first).toEqual(second);
    expect(first.usage.inputTokens).toBeGreaterThan(0);
    expect(first.usage.outputTokens).toBeGreaterThan(0);
  });

  it("refuses to construct without adapters", () => {
    expect(() => new ModelGateway([])).toThrow();
  });
});
