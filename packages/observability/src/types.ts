/**
 * Observability types.
 *
 * Per docs/architecture/platform.md §13, every log entry is a JSON object
 * with stable fields. This module defines the canonical shapes used across
 * the Agent OS observability layer.
 *
 * Layer: 2 (Platform)
 * Dependencies: @agent-os/core (Result, Timestamp), @opentelemetry/api (Tracer)
 */

// ---------------------------------------------------------------------------
// Log levels
// ---------------------------------------------------------------------------

export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

const LOG_LEVEL_NUMERIC: Readonly<Record<LogLevel, number>> = {
  trace: 0,
  debug: 1,
  info: 2,
  warn: 3,
  error: 4,
  fatal: 5,
};

export const compareLogLevels = (a: LogLevel, b: LogLevel): number =>
  LOG_LEVEL_NUMERIC[a] - LOG_LEVEL_NUMERIC[b];

export const isLevelEnabled = (current: LogLevel, target: LogLevel): boolean =>
  LOG_LEVEL_NUMERIC[current] <= LOG_LEVEL_NUMERIC[target];

// ---------------------------------------------------------------------------
// Structured log entry (platform.md §13.1)
// ---------------------------------------------------------------------------

export interface LogEntry {
  readonly timestamp: string;
  readonly level: LogLevel;
  readonly message: string;
  readonly adapter?: string;
  readonly requestId?: string;
  readonly correlationId?: string;
  readonly traceId?: string;
  readonly spanId?: string;
  readonly durationMs?: number;
  readonly phase?: string;
  readonly [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Log sink (pluggable destination)
// ---------------------------------------------------------------------------

export interface LogSink {
  readonly name: string;
  readonly write: (entry: LogEntry) => void;
  readonly flush?: () => void;
  readonly close?: () => void;
}

// ---------------------------------------------------------------------------
// Logger configuration
// ---------------------------------------------------------------------------

export interface LoggerConfig {
  readonly minLevel: LogLevel;
  readonly sinks: readonly LogSink[];
  readonly defaultAdapter?: string;
}

// ---------------------------------------------------------------------------
// Request / Correlation context (platform.md §13.2, §13.3)
// ---------------------------------------------------------------------------

export interface ObservabilityContext {
  readonly requestId: string;
  readonly correlationId: string;
  readonly traceId?: string;
  readonly spanId?: string;
}

// ---------------------------------------------------------------------------
// Metric types
// ---------------------------------------------------------------------------

export interface MetricOptions {
  readonly name: string;
  readonly help: string;
  readonly labels?: Readonly<Record<string, string>>;
}

export interface Counter {
  readonly inc: (value?: number) => void;
  readonly labels: (labels: Readonly<Record<string, string>>) => Counter;
}

export interface Histogram {
  readonly observe: (value: number) => void;
  readonly labels: (labels: Readonly<Record<string, string>>) => Histogram;
}

export interface Gauge {
  readonly set: (value: number) => void;
  readonly getValue: () => number;
  readonly labels: (labels: Readonly<Record<string, string>>) => Gauge;
}

// ---------------------------------------------------------------------------
// Tracer re-export (from OpenTelemetry)
// ---------------------------------------------------------------------------

export type { Tracer, Span, SpanStatusCode } from '@opentelemetry/api';
