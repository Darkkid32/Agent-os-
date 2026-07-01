/**
 * Shared observability helpers for every LLM provider.
 *
 * Every provider request is wrapped in:
 *   1. An OpenTelemetry span named `llm.<provider>.<operation>`
 *   2. A structured log entry recording provider, model, durationMs,
 *      token usage (when available), and error details on failure.
 */
import { createLogger, withSpan, type Logger, type Span } from '@agent-os/observability';
import { isLLMError } from './errors.js';

export interface InstrumentationOptions {
  readonly providerId: string;
  readonly operation: 'chat' | 'stream' | 'embeddings' | 'health' | 'tool';
  readonly model?: string;
  readonly logger?: Logger;
  readonly additionalAttributes?: Readonly<Record<string, string>>;
}

const defaultLogger = (): Logger => createLogger({ defaultAdapter: 'llm' });

const attributesWithModel = (
  options: InstrumentationOptions,
): Readonly<Record<string, string>> => ({
  ...(options.model !== undefined ? { 'llm.model': options.model } : {}),
  ...options.additionalAttributes,
});

/**
 * Wrap a provider operation in observability.
 *
 * `withSpan` is synchronous so async work inside it is fine — the span
 * ends only after the async body resolves (or throws). We measure wall-
 * clock `durationMs` ourselves for logging because OpenTelemetry span
 * timing is opaque from the JS side.
 */
export const instrument = async <T>(
  options: InstrumentationOptions,
  fn: (span: Span) => Promise<T>,
): Promise<T> => {
  const logger = options.logger ?? defaultLogger();
  const started = Date.now();
  const spanName = `llm.${options.providerId}.${options.operation}`;
  const attrs = attributesWithModel(options);

  try {
    const value = await withSpan(spanName, (span: Span): Promise<T> => {
      for (const [k, v] of Object.entries(attrs)) {
        span.setAttribute(k, v);
      }
      return fn(span);
    });
    const durationMs = Date.now() - started;
    logger.info('llm call succeeded', {
      providerId: options.providerId,
      operation: options.operation,
      ...(options.model !== undefined ? { model: options.model } : {}),
      durationMs,
    });
    return value;
  } catch (e) {
    const durationMs = Date.now() - started;
    const code = isLLMError(e) ? e.code : 'PROVIDER_ERROR';
    const message = e instanceof Error ? e.message : String(e);
    logger.error('llm call failed', {
      providerId: options.providerId,
      operation: options.operation,
      ...(options.model !== undefined ? { model: options.model } : {}),
      durationMs,
      errorCode: code,
      errorMessage: message,
    });
    throw e;
  }
};

/**
 * Stamp usage attributes on the active span if a usage payload is available.
 */
export const recordUsage = (
  span: Span,
  usage:
    | {
        readonly promptTokens: number;
        readonly completionTokens: number;
        readonly totalTokens: number;
      }
    | undefined,
): void => {
  if (!usage) return;
  span.setAttribute('llm.usage.prompt_tokens', String(usage.promptTokens));
  span.setAttribute('llm.usage.completion_tokens', String(usage.completionTokens));
  span.setAttribute('llm.usage.total_tokens', String(usage.totalTokens));
};
