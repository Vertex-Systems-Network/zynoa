import { createAnthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";
import type { LanguageModel } from "ai";
import type { ProviderAdapter } from "../types.js";

export interface AnthropicAdapterOptions {
  apiKey: string;
  /** Used when a request names no model. */
  defaultModel?: string;
  /** Test seam: replaces the Anthropic SDK model factory (no network in tests). */
  createModel?: (modelId: string) => LanguageModel;
}

/** Anthropic behind the gateway via the Vercel AI SDK (approved stack, CONSENT-000001). */
export function anthropicAdapter(options: AnthropicAdapterOptions): ProviderAdapter {
  const sdk = createAnthropic({ apiKey: options.apiKey });
  const createModel = options.createModel ?? ((modelId: string) => sdk(modelId));
  const defaultModel = options.defaultModel ?? "claude-haiku-5-5";
  return {
    provider: "anthropic",
    defaultModel,
    async complete({ model, messages, maxOutputTokens, temperature }) {
      // ai v7 rejects system roles inside `messages` (AI_InvalidPromptError);
      // system content goes through the dedicated option instead.
      const system = messages
        .filter((message) => message.role === "system")
        .map((message) => message.content)
        .join("\n\n");
      const conversation = messages.filter((message) => message.role !== "system");
      const result = await generateText({
        model: createModel(model),
        ...(system === "" ? {} : { system }),
        messages: conversation,
        ...(maxOutputTokens === undefined ? {} : { maxOutputTokens }),
        ...(temperature === undefined ? {} : { temperature }),
      });
      const inputTokens = result.usage.inputTokens;
      const outputTokens = result.usage.outputTokens;
      return {
        text: result.text,
        // Account against the model the provider says it served, not the alias requested.
        model: result.response.modelId || model,
        usage: { inputTokens: inputTokens ?? 0, outputTokens: outputTokens ?? 0 },
        // Missing usage must surface as unknown cost, never as a $0 bill.
        usageIncomplete: inputTokens === undefined || outputTokens === undefined,
      };
    },
  };
}
