/**
 * Tracing abstraction.
 *
 * Wraps @opentelemetry/api to provide a thin, Agent OS-specific tracing
 * surface. Per platform.md §13.4:
 *   - Each adapter creates an OpenTelemetry span for the inbound request.
 *   - Span names follow `<adapter>.<operation>` convention.
 *   - Hermes-internal operations create child spans.
 *
 * The tracer delegates to OpenTelemetry's global TracerProvider. If no
 * provider is configured (default in dev), spans are no-ops — zero cost.
 */
import { trace, SpanStatusCode, type Tracer, type Span } from '@opentelemetry/api';
import { currentContext } from './context.js';

const DEFAULT_TRACER_NAME = '@agent-os/observability';

/**
 * Get the OpenTelemetry tracer. Delegates to the global TracerProvider.
 */
export const getTracer = (name?: string): Tracer => trace.getTracer(name ?? DEFAULT_TRACER_NAME);

/**
 * Start a span and run a function within it. The span is automatically
 * ended when the function returns (or throws).
 *
 * If an observability context is active, the span inherits its trace
 * context. Attributes from the context (requestId, correlationId) are
 * set on the span.
 */
export const withSpan = <T>(
  spanName: string,
  fn: (span: Span) => T,
  options?: { readonly attributes?: Readonly<Record<string, string>> },
): T => {
  const tracer = getTracer();
  return tracer.startActiveSpan(spanName, (span: Span) => {
    try {
      const ctx = currentContext();
      if (ctx?.requestId) span.setAttribute('request.id', ctx.requestId);
      if (ctx?.correlationId) span.setAttribute('correlation.id', ctx.correlationId);
      if (options?.attributes) {
        for (const [key, value] of Object.entries(options.attributes)) {
          span.setAttribute(key, value);
        }
      }
      const result = fn(span);
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (e) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: e instanceof Error ? e.message : String(e),
      });
      throw e;
    } finally {
      span.end();
    }
  });
};

/**
 * Add attributes to the current active span (if any).
 */
export const setSpanAttributes = (attributes: Readonly<Record<string, string>>): void => {
  const span = trace.getActiveSpan();
  if (span) {
    for (const [key, value] of Object.entries(attributes)) {
      span.setAttribute(key, value);
    }
  }
};

/**
 * Get the current trace ID from the active span, if available.
 */
export const currentTraceId = (): string | undefined => {
  const span = trace.getActiveSpan();
  if (!span) return undefined;
  const ctx = span.spanContext();
  return ctx.traceId !== '00000000000000000000000000000000' ? ctx.traceId : undefined;
};

/**
 * Get the current span ID from the active span, if available.
 */
export const currentSpanId = (): string | undefined => {
  const span = trace.getActiveSpan();
  if (!span) return undefined;
  const ctx = span.spanContext();
  return ctx.spanId !== '0000000000000000' ? ctx.spanId : undefined;
};
