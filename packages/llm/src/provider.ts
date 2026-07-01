/**
 * `LLMProvider` — the application-facing vendor abstraction.
 *
 * Providers expose a synchronous `capabilities` declaration at construction
 * time, a `health()` probe for runtime liveness checks, and asynchronous
 * `chat()`, `stream()`, and (optional) `embeddings()` call paths.
 */
import type { ChatRequest, ChatResponse, ChatChunk } from './chat.js';
import type { EmbeddingRequest, EmbeddingResponse } from './embeddings.js';
import type { ModelInfo, ProviderCapabilities } from './types.js';

export interface LLMProvider {
  readonly id: string;
  readonly name: string;
  readonly capabilities: ProviderCapabilities;

  /** Return the static or dynamically-fetched model catalogue. */
  models(): Promise<readonly ModelInfo[]>;

  /** Send a chat completion request and resolve with the full response. */
  chat(request: ChatRequest): Promise<ChatResponse>;

  /** Send a streaming chat completion and return an AsyncIterable of chunks. */
  stream(request: ChatRequest): Promise<AsyncIterable<ChatChunk>>;

  /** Optional — throw `ProviderUnavailable` if not supported. */
  embeddings(request: EmbeddingRequest): Promise<EmbeddingResponse>;

  /** Probe the provider's runtime status (e.g. token validity, endpoint reachability). */
  health(): Promise<LLMHealthReport>;
}

export interface LLMHealthReport {
  readonly healthy: boolean;
  readonly providerId: string;
  readonly latencyMs: number;
  readonly checkedAt: string;
  readonly detail?: string;
}

export const supportsCapability = (
  provider: LLMProvider,
  capability: keyof ProviderCapabilities,
): boolean => provider.capabilities[capability];
