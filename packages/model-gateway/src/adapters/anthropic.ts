import { createAnthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";
import type { ProviderAdapter } from "../types.js";

export interface AnthropicAdapterOptions {
  apiKey: string;
  /** Used when a request names no model. */
  defaultModel?: string;
}

/** Anthropic behind the gateway via the Vercel AI SDK (approved stack, CONSENT-000001). */
export function anthropicAdapter(options: AnthropicAdapterOptions): ProviderAdapter {
  const provider = createAnthropic({ apiKey: options.apiKey });
  const defaultModel = options.defaultModel ?? "claude-haiku-5-5";
  return {
    provider: "anthropic",
    defaultModel,
    async complete({ model, messages, maxOutputTokens, temperature }) {
      const result = await generateText({
        model: provider(model),
        messages,
        ...(maxOutputTokens === undefined ? {} : { maxOutputTokens }),
        ...(temperature === undefined ? {} : { temperature }),
      });
      return {
        text: result.text,
        model,
        usage: {
          inputTokens: result.usage.inputTokens ?? 0,
          outputTokens: result.usage.outputTokens ?? 0,
        },
      };
    },
  };
}
