/** ModelGateway contract (spec 07 AI-001): business code never imports a provider SDK. */

export type ChatRole = "system" | "user" | "assistant";

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export interface CompletionRequest {
  /** Provider to route to; defaults to the gateway's first adapter. */
  provider?: string;
  /** Provider model id; defaults to the adapter's default model. */
  model?: string;
  messages: ChatMessage[];
  maxOutputTokens?: number;
  temperature?: number;
}

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
}

export interface CompletionResult {
  provider: string;
  model: string;
  text: string;
  usage: TokenUsage;
  /** USD, from the pricing table; null when the model has no table entry. */
  costUsd: number | null;
}

/** One provider behind the gateway. Adapters own the SDK/API details. */
export interface ProviderAdapter {
  readonly provider: string;
  readonly defaultModel: string;
  complete(
    request: Required<Pick<CompletionRequest, "model" | "messages">> &
      Pick<CompletionRequest, "maxOutputTokens" | "temperature">,
  ): Promise<{
    text: string;
    usage: TokenUsage;
    model: string;
    /** True when the provider did not report full usage; cost is then unknown. */
    usageIncomplete?: boolean;
  }>;
}
