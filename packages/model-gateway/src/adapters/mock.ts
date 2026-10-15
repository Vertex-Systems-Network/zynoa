import type { ProviderAdapter } from "../types.js";

/**
 * Deterministic adapter for tests and MODEL_PROVIDERS_ENABLED=mock: echoes the
 * last user message and "bills" ~4 characters per token.
 */
export function mockAdapter(): ProviderAdapter {
  return {
    provider: "mock",
    defaultModel: "mock-echo-1",
    complete({ model, messages }) {
      const lastUser = [...messages].reverse().find((message) => message.role === "user");
      const text = `echo: ${lastUser?.content ?? ""}`;
      const inputChars = messages.reduce((sum, message) => sum + message.content.length, 0);
      return Promise.resolve({
        text,
        model,
        usage: {
          inputTokens: Math.max(1, Math.ceil(inputChars / 4)),
          outputTokens: Math.max(1, Math.ceil(text.length / 4)),
        },
      });
    },
  };
}
