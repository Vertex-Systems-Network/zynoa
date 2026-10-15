import type { TokenUsage } from "./types.js";

/**
 * USD per million tokens. Seed values from public price lists as of 2026-10-16
 * (aggregator-sourced); WU-P0-14 verifies every row against provider invoices
 * and fills docs/spec/11_BILLING_AND_USAGE.md §3.
 */
export interface ModelPrice {
  inputPerMTok: number;
  outputPerMTok: number;
}

export const PRICING: Record<string, Record<string, ModelPrice>> = {
  anthropic: {
    "claude-haiku-5-5": { inputPerMTok: 0.1, outputPerMTok: 0.5 },
    "claude-sonnet-5-5": { inputPerMTok: 2, outputPerMTok: 10 },
    "claude-opus-5-5": { inputPerMTok: 4, outputPerMTok: 20 },
  },
  mock: {
    "mock-echo-1": { inputPerMTok: 0, outputPerMTok: 0 },
  },
};

/** Cost in USD, or null when the model has no pricing entry (caller decides how to surface that). */
export function costUsd(provider: string, model: string, usage: TokenUsage): number | null {
  const price = PRICING[provider]?.[model];
  if (!price) return null;
  return (
    (usage.inputTokens / 1_000_000) * price.inputPerMTok +
    (usage.outputTokens / 1_000_000) * price.outputPerMTok
  );
}
