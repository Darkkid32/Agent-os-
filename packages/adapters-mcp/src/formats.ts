/**
 * Hermes → MCP tool-result formatters.
 *
 * Pure functions. Each formatter takes a Hermes value and returns a
 * `McpToolResult`. JSON pretty-print keeps the tool output readable
 * for LLM agents. Secrets in `HermesConfig` are redacted identically
 * to the Telegram formatter.
 */
import type { HermesConfig, HermesHealthMonitorReport, HermesStatus } from '@agent-os/hermes';
import type { McpToolResult } from './types.js';

const redactConfig = (cfg: HermesConfig): Record<string, unknown> => ({
  NODE_ENV: cfg.nodeEnv,
  LOG_LEVEL: cfg.logLevel,
  OPENROUTER_API_KEY: '****',
  DATABASE_URL: '****',
  REDIS_URL: '****',
  OTEL_ENABLED: cfg.otelEnabled,
  OTEL_EXPORTER_ENDPOINT: cfg.otelExporterEndpoint ?? null,
  HERMES_MODULES_DIR: cfg.hermesModulesDir,
  HERMES_SHUTDOWN_TIMEOUT_MS: cfg.hermesShutdownTimeoutMs,
});

const asJson = (payload: unknown): string => `${JSON.stringify(payload, null, 2)}\n`;

export const formatStarted = (phase: string): McpToolResult => ({
  text: asJson({ started: true, phase }),
  isError: false,
  data: { started: true, phase },
});

export const formatStopped = (phase: string): McpToolResult => ({
  text: asJson({ stopped: true, phase }),
  isError: false,
  data: { stopped: true, phase },
});

export const formatStatus = (status: HermesStatus): McpToolResult => ({
  text: asJson(status),
  isError: false,
  data: status,
});

export const formatHealth = (report: HermesHealthMonitorReport): McpToolResult => ({
  text: asJson(report),
  isError: false,
  data: report,
});

export const formatModules = (count: number): McpToolResult => ({
  text: asJson({ count }),
  isError: false,
  data: { count },
});

export const formatConfig = (cfg: HermesConfig): McpToolResult => ({
  text: asJson(redactConfig(cfg)),
  isError: false,
  data: redactConfig(cfg),
});

export const formatVersion = (name: string, version: string): McpToolResult => ({
  text: asJson({ name, version }),
  isError: false,
  data: { name, version },
});

export const formatHermesError = (message: string): McpToolResult => ({
  text: `Hermes rejected the call: ${message}`,
  isError: true,
});

export const formatPermissionDenied = (action: string): McpToolResult => ({
  text: `Permission denied for action: ${action}`,
  isError: true,
});

export const formatUnexpectedError = (message: string): McpToolResult => ({
  text: `Unexpected adapter error: ${message}`,
  isError: true,
});
