/**
 * Shared LLM type vocabulary.
 *
 * Every layer of `@agent-os/llm` consumes the types declared here. The goal is
 * a tiny, vendor-neutral surface so callers (Hermes, future `@agent-os/agents`,
 * adapters) can swap providers without code changes.
 */

export type Role = 'system' | 'user' | 'assistant' | 'tool' | 'developer';

export interface LLMToolDefinition {
  readonly type: 'function';
  readonly function: {
    readonly name: string;
    readonly description?: string;
    readonly parameters?: Readonly<Record<string, unknown>>;
  };
}

export interface LLMToolCall {
  readonly id: string;
  readonly type: 'function';
  readonly function: {
    readonly name: string;
    readonly arguments: string;
  };
}

export interface LLMToolCallDelta {
  readonly index: number;
  readonly id?: string;
  readonly type?: 'function';
  readonly function?: {
    readonly name?: string;
    readonly arguments?: string;
  };
}

export interface ChatMessage {
  readonly role: Role;
  readonly content: string;
  readonly name?: string;
  readonly toolCallId?: string;
  readonly toolCalls?: readonly LLMToolCall[];
}

export type FinishReason =
  'stop' | 'length' | 'tool_calls' | 'content_filter' | 'error' | 'cancelled' | 'unknown';

export interface TokenUsage {
  readonly promptTokens: number;
  readonly completionTokens: number;
  readonly totalTokens: number;
}

export interface ModelInfo {
  readonly id: string;
  readonly providerId: string;
  readonly displayName?: string;
  readonly contextWindow?: number;
  readonly maxOutputTokens?: number;
  readonly supportsTools?: boolean;
  readonly supportsVision?: boolean;
  readonly supportsStreaming?: boolean;
}

export interface ProviderCapabilities {
  readonly chat: boolean;
  readonly streaming: boolean;
  readonly embeddings: boolean;
  readonly toolCalling: boolean;
  readonly vision: boolean;
  readonly jsonMode: boolean;
}
