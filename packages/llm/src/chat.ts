/**
 * Chat request and response shapes.
 *
 * The chat surface is intentionally minimal. Tools, JSON mode, vision, and
 * other capability-gated options are typed as optional fields so providers
 * can surface them based on their `ProviderCapabilities`.
 */
import type {
  ChatMessage,
  FinishReason,
  TokenUsage,
  LLMToolCall,
  LLMToolDefinition,
  LLMToolCallDelta,
} from './types.js';

export type { LLMToolCall, LLMToolDefinition, LLMToolCallDelta } from './types.js';

export interface ChatRequest {
  readonly model: string;
  readonly messages: readonly ChatMessage[];
  readonly temperature?: number;
  readonly maxTokens?: number;
  readonly topP?: number;
  readonly frequencyPenalty?: number;
  readonly presencePenalty?: number;
  readonly stop?: readonly string[];
  readonly user?: string;
  readonly tools?: readonly LLMToolDefinition[];
  readonly toolChoice?: 'auto' | 'none' | 'required' | { readonly name: string };
  readonly responseFormat?: 'text' | 'json';
  readonly signal?: AbortSignal;
}

export interface ChatResponse {
  readonly id: string;
  readonly providerId: string;
  readonly model: string;
  readonly message: ChatResponseMessage;
  readonly finishReason: FinishReason;
  readonly usage: TokenUsage;
  readonly toolCalls?: readonly LLMToolCall[];
  readonly raw?: unknown;
}

export interface ChatResponseMessage {
  readonly role: ChatMessage['role'];
  readonly content: string;
  readonly toolCalls?: readonly LLMToolCall[];
}

export interface ChatChunk {
  readonly id: string;
  readonly providerId: string;
  readonly model: string;
  readonly delta: {
    readonly role?: ChatMessage['role'] | undefined;
    readonly content?: string | undefined;
    readonly toolCalls?: readonly LLMToolCallDelta[] | undefined;
  };
  readonly finishReason?: FinishReason | undefined;
  readonly usage?: TokenUsage | undefined;
}
