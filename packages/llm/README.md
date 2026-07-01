# @agent-os/llm

Vendor-agnostic LLM abstraction for Agent OS. This package is the **only** place in the monorepo permitted to import vendor SDKs (e.g. `openai`). Every other package — Hermes, plugins, adapters, applications — must talk to LLM providers through the surface exported here.

## Layer

- **Layer:** 2 (Platform)
- **Depends on:** `@agent-os/core`, `@agent-os/config`, `@agent-os/observability`, `openai` (vendor SDK)
- **Depended on by:** future consumers such as `@agent-os/hermes`, `@agent-os/agents`, adapters that need reasoning.

## Public API (summary)

- `LLMProvider`, `LLMProviderFactory`, `LLMRegistry`
- `ChatRequest`, `ChatResponse`, `ChatMessage`, `ChatChunk`
- `EmbeddingRequest`, `EmbeddingResponse`
- `ModelInfo`, `TokenUsage`, `FinishReason`, `Role`
- `ProviderCapabilities`
- Typed errors: `LLMError`, `ProviderUnavailable`, `RateLimited`, `InvalidModel`, `AuthenticationFailed`, `Timeout`, `ContextLengthExceeded`, `UnknownProvider`
- Built-in providers: `MockProvider`, `OpenAIProvider`
- Configuration helpers: `llmConfigSchema`, `createLLMConfigProvider`

Full architecture: [`docs/architecture/llm.md`](../../docs/architecture/llm.md).
