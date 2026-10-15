import { costUsd } from "./pricing.js";
import type { CompletionRequest, CompletionResult, ProviderAdapter } from "./types.js";

export class UnknownProviderError extends Error {
  constructor(provider: string, available: string[]) {
    super(`No adapter for provider "${provider}". Available: ${available.join(", ") || "none"}.`);
    this.name = "UnknownProviderError";
  }
}

/**
 * Routes completion requests to provider adapters and accounts tokens + cost.
 * Phase 0: pick-by-name routing only; quality/cost routing arrives with AI-007.
 */
export class ModelGateway {
  readonly #adapters = new Map<string, ProviderAdapter>();

  constructor(adapters: readonly ProviderAdapter[]) {
    if (adapters.length === 0) throw new Error("ModelGateway needs at least one adapter");
    for (const adapter of adapters) {
      if (this.#adapters.has(adapter.provider))
        throw new Error(`Duplicate adapter for provider "${adapter.provider}"`);
      this.#adapters.set(adapter.provider, adapter);
    }
    this.#first = adapters[0] as ProviderAdapter;
  }

  readonly #first: ProviderAdapter;

  get providers(): string[] {
    return [...this.#adapters.keys()];
  }

  async complete(request: CompletionRequest): Promise<CompletionResult> {
    const adapter = request.provider ? this.#adapters.get(request.provider) : this.#first;
    if (!adapter) throw new UnknownProviderError(request.provider ?? "", this.providers);
    const model = request.model ?? adapter.defaultModel;
    const {
      text,
      usage,
      model: servedModel,
      usageIncomplete,
    } = await adapter.complete({ ...request, model });
    return {
      provider: adapter.provider,
      model: servedModel,
      text,
      usage,
      // A provider that didn't report usage gets an unknown cost, not a $0 bill.
      costUsd: usageIncomplete ? null : costUsd(adapter.provider, servedModel, usage),
    };
  }
}
