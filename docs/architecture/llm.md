# @agent-os/llm architecture

> Phase 9.1 — LLM provider abstraction layer. All LLM vendor SDK usage is
> confined to this package. Higher layers (`@agent-os/hermes`, agent loops,
> tools) talk only to `LLMProvider`, never to `openai`/`anthropic`/`google`
> directly.

## What this package owns

`@agent-os/llm` is the **single surface** where vendor-specific code lives.
Every other layer depends only on the abstraction defined here.

| Concern | Module | Export |
|---|---|---|
| Type vocabulary | `types.ts` | `Role`, `ChatMessage`, `TokenUsage`, `LLMToolCall`, `ProviderCapabilities`, … |
| Chat shapes | `chat.ts` | `ChatRequest`, `ChatResponse`, `ChatResponseMessage`, `ChatChunk` |
| Embedding shapes | `embeddings.ts` | `EmbeddingRequest`, `EmbeddingResponse`, `EmbeddingItem` |
| Streaming helpers | `streaming.ts` | `accumulateChatChunks`, `withAbortSignal` |
| Provider contract | `provider.ts` | `LLMProvider`, `LLMHealthReport`, `supportsCapability` |
| SDK→AgentOS mapping | `mapping.ts` | `mapSDKError`, `isRetryableStatusCode`, `parseRetryAfterMs` |
| Typed errors | `errors.ts` | 8 subclasses of `LLMError` + `toResult` + `isLLMError` |
| Observability wrapper | `observability.ts` | `instrument`, `recordUsage` |
| Config helpers | `config.ts` | `createLLMConfigProvider`, `readLLMConfig` |
| Registry | `registry/LLMRegistry.ts` | `DefaultLLMRegistry` + global accessors |
| Provider factory | `factory/LlmProviderFactory.ts` | `createProvider`, `createProviderFromEntry`, builder registry |
| Providers (built-in) | `providers/mock/`, `providers/openai/` | `MockProvider`, `OpenAIProvider` |

## Layer constraints

```
Layer 2 (Platform)
  ├── @agent-os/llm        ← THIS PACKAGE
  ├── @agent-os/core       (Result, Timestamp, Identifier, uuid)
  ├── @agent-os/config     (ConfigProvider)
  └── @agent-os/observability (Logger, Span, withSpan)
```

- **No dependency on Layer 3** (`hermes`, `agents`, `adapters-*`).
- **No `process.env`** — config comes from `@agent-os/config`.
- **Streaming via `AsyncIterable<ChatChunk>`** — not callbacks or EventEmitter.
- **Embeddings are optional** — capability-gated on `LLMProvider.capabilities.embeddings`.

## Provider interface

```typescript
interface LLMProvider {
  readonly id: string;
  readonly name: string;
  readonly capabilities: ProviderCapabilities;

  chat(request: ChatRequest): Promise<ChatResponse>;
  stream(request: ChatRequest): Promise<AsyncIterable<ChatChunk>>;
  embeddings(request: EmbeddingRequest): Promise<EmbeddingResponse>;
  models(): Promise<readonly ModelInfo[]>;
  health(): Promise<LLMHealthReport>;
}
```

Every public method is wrapped by `instrument()` which attaches a `withSpan`
and emits a structured log (`llm call succeeded` / `llm call failed`) with
duration, provider ID, operation, model, and error codes.

### Capabilities

`ProviderCapabilities` declares what a provider supports:

| Field | Meaning |
|---|---|
| `chat` | Non-streaming completions |
| `streaming` | `AsyncIterable` chunked responses |
| `embeddings` | Text vectorization |
| `toolCalling` | Tool/function-call round-trips |
| `vision` | Image+text input |
| `jsonMode` | `responseFormat: 'json'` enforcement |

Call `supportsCapability(provider, capability)` to check at runtime.

## Error taxonomy

All errors extend `LLMError` and carry a typed `code`, `providerId`,
`message`, and optional `cause`. The helper `toResult(promise)` wraps any
provider call into `Result<T, LLMError>` without manual try/catch.

| Error class | Code | Meaning |
|---|---|---|
| `ProviderUnavailable` | `PROVIDER_UNAVAILABLE` | Service down or unreachable |
| `RateLimited` | `RATE_LIMITED` | 429 with optional `retryAfterMs` |
| `InvalidModel` | `INVALID_MODEL` | Model not found / not supported |
| `AuthenticationFailed` | `AUTHENTICATION_FAILED` | Bad or missing API key |
| `Timeout` | `TIMEOUT` | Request exceeded deadline |
| `ContextLengthExceeded` | `CONTEXT_LENGTH_EXCEEDED` | Input too long for model |
| `ProviderError` | `PROVIDER_ERROR` | Unclassified SDK error |
| `InvalidRequest` | `INVALID_REQUEST` | Bad parameters / SDK rejected request |

### SDK error mapping

`mapSDKError(providerId, raw)` inspects the provider's thrown object and
returns the best-matching `LLMError`. It checks:

1. `status` field (HTTP-style status code)
2. `code` string field (`invalid_api_key`, `rate_limited`, `model_not_found`, …)
3. `headers['retry-after']` (converted to `retryAfterMs` on `RateLimited`)

## Observability

Every provider call goes through:

```
instrument({ providerId, operation, model? }, async (span) => {
  const response = await provider.chat(request);
  recordUsage(span, response.usage);
  return response;
});
```

- **`withSpan(spanName, fn)`** — synchronous span wrapper from
  `@agent-os/observability`; duration is wall-clock via `Date.now()`.
- **Structured logs** — JSON with `adapter`, `providerId`, `operation`,
  `model`, `durationMs`, and (on error) `errorCode` / `errorMessage`.
- **Error logging** — `isLLMError(e)` distinguishes typed LLM errors from
  generic thrown objects; non-LLM errors are mapped to `PROVIDER_ERROR`.

## Registry

`DefaultLLMRegistry` is an in-memory map of `providerId → LLMProvider`.

```typescript
const registry = getGlobalRegistry();
registry.register(mockProvider);
registry.register(openaiProvider);
registry.setDefault('openai');

const provider = registry.get('openai'); // LLMProvider
const fallback = registry.defaultProvider(); // LLMProvider | undefined
```

`unregister(providerId)` removes the provider and clears `defaultId` if it
matched. `get()` on a missing key throws `UnknownProvider`.

## Factory

The factory builds `LLMProvider` instances from configuration objects
(`LLMConfigShape` from `@agent-os/config`'s `llmConfigSchema`).

```typescript
import { createProviderFromEntry, registerBuilder } from '@agent-os/llm';

// From a config entry (id + ...fields)
const provider = createProviderFromEntry({
  id: 'openai',
  apiKey: process.env.OPENAI_API_KEY!,
  model: 'gpt-4o',
});

// Register a custom builder
registerBuilder('ollama', (config) => new OllamaProvider(config));
```

Built-in builders: `mock`, `openai`.

## Built-in providers

### MockProvider

Deterministic echo-reversed provider for unit tests and development.

- Reverses the last `user` message as content.
- Streams one chunk per character + a final stop chunk.
- Configurable: `responses`, `unhealthy`, `errorAfter*`, `chatDelayMs`.
- Capabilities: all enabled by default, togglable via options.

### OpenAIProvider

Full OpenAI SDK wrapper supporting chat, streaming, embeddings, and tools.

- Translates `ChatRequest` → `OpenAI.ChatCompletionCreateParamsBase`.
- `buildChatParams()` handles `tools`, `tool_choice`, `temperature`,
  `max_tokens`, `top_p`, `response_format`, `stop`, `user`.
- `toSDKMessage()` maps `system`/`user`/`assistant`/`tool` messages.
- Stream handler accumulates tool-call deltas by index.
- Errors mapped via `mapSDKError`.

## Configuration

`createLLMConfigProvider()` reads from an `AgentOSConfigRegistry` and
validates against `llmConfigSchema`:

```json
{
  "llm": {
    "registrations": [
      {
        "id": "openai",
        "apiKey": "sk-...",
        "model": "gpt-4o"
      }
    ]
  }
}
```

`readLLMConfig(provider)` extracts the `LLMConfigShape` for a specific
provider ID from the validated configuration.

## Type vocabulary (`types.ts`)

| Type | Purpose |
|---|---|
| `Role` | `'system' \| 'user' \| 'assistant' \| 'tool' \| 'developer'` |
| `FinishReason` | `'stop' \| 'length' \| 'tool_calls' \| 'content_filter' \| 'error' \| 'cancelled' \| 'unknown'` |
| `ChatMessage` | Normalized message shape (role + content + optional tool fields) |
| `LLMToolCall` | Complete tool call (id + function name + arguments) |
| `LLMToolCallDelta` | Streaming partial tool call (by index, fields optional) |
| `LLMToolDefinition` | Tool schema for `ChatRequest.tools` |
| `TokenUsage` | `{ promptTokens, completionTokens, totalTokens }` |
| `ModelInfo` | Model catalogue entry (id, providerId, contextWindow, etc.) |
| `ProviderCapabilities` | Feature flags for a provider |

## Streaming helpers

### `accumulateChatChunks`

Consumes an `AsyncIterable<ChatChunk>` stream and returns a single
`ChatResponse`. Handles:

- Content concatenation.
- Tool-call delta merging by index (id + name + arguments accumulated).
- Usage aggregation (prefers last non-zero totals).
- Error: throws `InvalidRequest` on empty stream or incomplete tool deltas.

### `withAbortSignal`

Wraps any `AsyncIterable<T>` with abort-signal checking:

- Pre-aborted signal → throws immediately.
- Mid-iteration abort → throws `InvalidRequest` after current yield.

## Coverage

```
Statements : 97.63%
Branches   : 88.22%
Functions  : 98.16%
Lines      : 98.58%
```

Type-only files (`types.ts`, `chat.ts`, `embeddings.ts`, barrel `index.ts`)
are excluded from v8 coverage since they have no executable statements.
