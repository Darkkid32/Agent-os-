/**
 * @agent-os/llm — Vendor-agnostic LLM abstraction for Agent OS.
 * @packageDocumentation
 *
 * Layer: 2 (Platform)
 * Dependencies: @agent-os/core, @agent-os/config, @agent-os/observability
 *
 * Provides:
 *   - `LLMProvider` interface — the contract every vendor adapter fulfills
 *   - `MockProvider` — deterministic provider for tests and offline dev
 *   - `OpenAIProvider` — OpenAI / OpenAI-compatible (OpenRouter) adapter
 *   - `LLMRegistry` — dynamic provider registration and default routing
 *   - `LlmProviderFactory` — instantiate providers from `ConfigProvider`
 *   - Structured error taxonomy (`LLMError` hierarchy)
 *   - Streaming helpers (`accumulateChatChunks`, `withAbortSignal`)
 *   - Token-usage arithmetic
 *   - Observability integration (every call is spanned + logged)
 */

export const PACKAGE_NAME = '@agent-os/llm' as const;
export const PACKAGE_VERSION = '1.0.0' as const;

// Types
export type {
  Role,
  ChatMessage,
  FinishReason,
  TokenUsage,
  ModelInfo,
  ProviderCapabilities,
} from './types.js';

// Errors
export {
  LLMError,
  ProviderUnavailable,
  RateLimited,
  InvalidModel,
  AuthenticationFailed,
  Timeout,
  ContextLengthExceeded,
  UnknownProvider,
  ProviderError,
  InvalidRequest,
  isLLMError,
  toResult,
} from './errors.js';

export type { LLMErrorCode } from './errors.js';

// Chat types
export type {
  ChatRequest,
  ChatResponse,
  ChatResponseMessage,
  ChatChunk,
  LLMToolDefinition,
  LLMToolCall,
  LLMToolCallDelta,
} from './chat.js';

// Embedding types
export type { EmbeddingRequest, EmbeddingResponse } from './embeddings.js';

// Streaming helpers
export { accumulateChatChunks, withAbortSignal } from './streaming.js';

// Token helpers
export { ZERO_USAGE, addTokenUsage, makeTokenUsage } from './tokens.js';

// Error mapping
export { mapSDKError, isRetryableStatusCode, parseRetryAfterMs } from './mapping.js';

// Observability
export { instrument, recordUsage } from './observability.js';
export type { InstrumentationOptions } from './observability.js';

// Provider interface
export { supportsCapability } from './provider.js';
export type { LLMProvider, LLMHealthReport } from './provider.js';

// Config
export { llmConfigSchema, createLLMConfigProvider, readLLMConfig } from './config.js';
export type { LLMConfigShape, ProviderConfigEntry } from './config.js';

// Mock provider
export { MockProvider } from './providers/mock/index.js';
export type { MockProviderOptions, MockResponse } from './providers/mock/index.js';

// OpenAI provider
export { OpenAIProvider } from './providers/openai/index.js';
export type { OpenAIProviderConfig } from './providers/openai/index.js';

// Registry
export { DefaultLLMRegistry, getGlobalRegistry, resetGlobalRegistry } from './registry/index.js';
export type { LLMRegistry } from './registry/index.js';

// Factory
export {
  createProvider,
  createProviderFromEntry,
  registerBuilder,
  unregisterBuilder,
  listBuilders,
} from './factory/index.js';
export type { ProviderBuilder } from './factory/index.js';

// Tool calling framework
export {
  // Registry
  DefaultToolRegistry,
  getGlobalToolRegistry,
  resetGlobalToolRegistry,

  // Executor
  DefaultToolExecutor,
  allowAllPermissions,

  // Validation
  validateRequired,
  validateTypes,
  validateUnknown,
  validatePluginAvailable,
  validateEnabled,
  validateToolCall,

  // Translation
  toOpenAITool,
  toAnthropicTool,
  toGeminiTool,
  translateTools,

  // Errors
  ToolError,
  ToolNotFoundError,
  ToolValidationError,
  ToolPermissionError,
  ToolTimeoutError,
  ToolPluginUnavailableError,
  ToolExecutionError,
  ToolDisabledError,
  isToolError,
} from './tools/index.js';

export type {
  // Types
  ToolParameterSchema,
  ToolParameterSet,
  ToolParameter,
  ToolPermission,
  ToolDefinition,
  ToolCall,
  ToolResult,
  ProviderToolDefinition,
  ToolTranslator,
  ToolExecutionContext,
  ToolExecutionHandler,
  ToolRegistryEntry,
  ToolEventBase,
  ToolRequestedEvent,
  ToolStartedEvent,
  ToolCompletedEvent,
  ToolFailedEvent,
  ToolEvent,
  ToolEventHandler,

  // Registry
  ToolRegistry,

  // Validation
  ValidationResult,

  // Translation
  ProviderType,

  // Executor
  PermissionChecker,

  // Errors
  ToolErrorCode,
} from './tools/index.js';
