/**
 * Embedding request and response shapes.
 */

export interface EmbeddingRequest {
  readonly model: string;
  readonly input: string | readonly string[];
  readonly user?: string;
  readonly signal?: AbortSignal;
}

export interface EmbeddingItem {
  readonly index: number;
  readonly vector: readonly number[];
}

export interface EmbeddingResponse {
  readonly id: string;
  readonly providerId: string;
  readonly model: string;
  readonly items: readonly EmbeddingItem[];
  readonly usage: {
    readonly promptTokens: number;
    readonly totalTokens: number;
  };
  readonly raw?: unknown;
}
