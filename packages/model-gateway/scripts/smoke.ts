/**
 * WU-P0-11 smoke test (Gate A exit item): call a real model through the gateway
 * and print tokens + cost. Requires ANTHROPIC_API_KEY (GitHub secret / local env).
 *
 *   pnpm --filter @zynoa/model-gateway smoke
 */
import { loadEnv } from "@zynoa/config/env";
import { anthropicAdapter } from "../src/adapters/anthropic.js";
import { ModelGateway } from "../src/gateway.js";

const env = loadEnv(["models"]);
if (!env.ANTHROPIC_API_KEY) {
  console.error(
    "smoke: ANTHROPIC_API_KEY is not set. Add it to GitHub secrets (or .env locally) and re-run.",
  );
  process.exit(2);
}

const gateway = new ModelGateway([anthropicAdapter({ apiKey: env.ANTHROPIC_API_KEY })]);
const result = await gateway.complete({
  messages: [
    { role: "system", content: "Answer in one short sentence." },
    { role: "user", content: "Say hello to the Zynoa Phase 0 smoke test." },
  ],
  maxOutputTokens: 64,
});

// The smoke test's whole job is to print this evidence.
console.warn(
  [
    `provider=${result.provider}`,
    `model=${result.model}`,
    `inputTokens=${result.usage.inputTokens}`,
    `outputTokens=${result.usage.outputTokens}`,
    `costUsd=${result.costUsd === null ? "unknown (no pricing row)" : result.costUsd.toFixed(6)}`,
  ].join(" "),
);
console.warn(`text: ${result.text}`);
