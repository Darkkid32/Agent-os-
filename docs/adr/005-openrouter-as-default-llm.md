# ADR-005: OpenRouter as the default LLM provider

## Status

Accepted (Phase 1.1).

## Context

The Agent OS runtime must talk to at least one LLM provider in Phase 2. We
need a single credential surface (`OPENROUTER_API_KEY`) and an obvious
upgrade path to additional providers without rewriting the runtime.

## Decision

Adopt **OpenRouter** as the default LLM provider for Phase 2.

Reasons:

- **Single credential.** One API key covers every model behind it; we don't
  ship a per-vendor secret blob.
- **No vendor lock-in.** Switching providers is a configuration change
  (`model:` in a workflow spec), not a code change.
- **Streaming parity.** OpenRouter exposes SSE-shaped streaming identical to
  OpenAI, so the same `agents` port works for downstream clients built on the
  OpenAI streaming SDK.
- **Backwards-compatible.** Models are addressed by string (`"openrouter/anthropic/claude-3.5-sonnet"`), so changes are observable in OpenTelemetry spans.

## Consequences

- `OPENROUTER_API_KEY` is the only required secret for the platform to talk
  to an LLM. Empty in CI.
- All LLM calls flow through an `adapters/llm-openrouter` adapter that
  implements the `LLMPort` defined in `packages/agents`.
- Adding another provider (e.g. `adapters/llm-anthropic`) requires writing a
  new file; no changes to the runtime or `agents` package.
- Model availability, latency, and rate limits become operational
  attributes and are surfaced on the operator dashboard (Phase 2).

## Alternatives Considered

- **OpenAI directly.** Rejected as the default; it's a single vendor with
  weaker audit trajectories. Kept as an option for users who need a direct
  contract.
- **Self-hosted models.** Rejected for Phase 1 + 2. The platform must be
  operable without a GPU stack attached.

## References

- https://openrouter.ai/
- https://openrouter.ai/docs
