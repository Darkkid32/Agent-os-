/**
 * @agent-os/observability
 *
 * Platform observability foundation for Agent OS.
 * Structured logging, request/correlation IDs, tracing, and metrics.
 *
 * Layer: 2 (Platform)
 * Dependencies: @agent-os/core (Result, Timestamp), @opentelemetry/api (Tracer)
 */

export const PACKAGE_NAME = '@agent-os/observability' as const;
export const PACKAGE_VERSION = '0.1.0' as const;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type {
  LogLevel,
  LogEntry,
  LogSink,
  LoggerConfig,
  ObservabilityContext,
  MetricOptions,
  Counter,
  Histogram,
  Gauge,
  Tracer,
  Span,
  SpanStatusCode,
} from './types.js';

export { compareLogLevels, isLevelEnabled } from './types.js';

// ---------------------------------------------------------------------------
// Context — request / correlation ID propagation
// ---------------------------------------------------------------------------

export {
  runWithContext,
  currentContext,
  generateRequestId,
  generateCorrelationId,
  createContext,
} from './context.js';

// ---------------------------------------------------------------------------
// Logger — structured JSON logging with pluggable sinks
// ---------------------------------------------------------------------------

export { Logger, createLogger } from './logger.js';

// ---------------------------------------------------------------------------
// Sinks — built-in log destinations
// ---------------------------------------------------------------------------

export { createConsoleSink, createNullSink, createArraySink } from './sinks.js';

export type { ArraySink } from './sinks.js';

// ---------------------------------------------------------------------------
// Metrics — in-memory counter / histogram / gauge
// ---------------------------------------------------------------------------

export { createMetricRegistry } from './metrics.js';

export type { MetricRegistry, MetricEntry } from './metrics.js';

// ---------------------------------------------------------------------------
// Adapter metrics — standard metric bundles
// ---------------------------------------------------------------------------

export { createAdapterMetrics, createHermesMetrics } from './adapter-metrics.js';
export type { AdapterMetrics, HermesMetrics } from './adapter-metrics.js';

// ---------------------------------------------------------------------------
// Tracer — OpenTelemetry wrapper
// ---------------------------------------------------------------------------

export { getTracer, withSpan, setSpanAttributes, currentTraceId, currentSpanId } from './tracer.js';
