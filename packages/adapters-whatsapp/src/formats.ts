/**
 * WhatsApp response formatting.
 *
 * Pure functions: Hermes data in, text out. WhatsApp uses plain text
 * only — no MarkdownV2, no HTML. The dispatcher converts WhatsAppMessage
 * into a WhatsApp Business API reply payload.
 */
import {
  type HermesConfig,
  type HermesHealthMonitorReport,
  type HermesLifecyclePhase,
  type HermesStatus,
  redactHermesConfig,
} from '@agent-os/hermes';
import type { WhatsAppMessage } from './types.js';

const formatPhase = (phase: HermesLifecyclePhase): string => phase;

export const formatStatusMessage = (status: HermesStatus): WhatsAppMessage => ({
  text: [
    'Hermes Status',
    '',
    `Phase: ${formatPhase(status.phase)}`,
    `Uptime (ms): ${status.uptime}`,
    `Modules: ${status.modules}`,
  ].join('\n'),
});

const formatHealthModule = (m: HermesHealthMonitorReport['modules'][number]): string => {
  if (m.detail) {
    return `  - ${m.name}: ${m.status} — ${m.detail}`;
  }
  return `  - ${m.name}: ${m.status}`;
};

export const formatHealthMessage = (report: HermesHealthMonitorReport): WhatsAppMessage => {
  const header = `Hermes Health\n\nAggregate: ${report.status}`;
  if (report.modules.length === 0) {
    return { text: `${header}\n\n(no modules registered)` };
  }
  const body = report.modules.map(formatHealthModule).join('\n');
  return { text: `${header}\n\n${body}` };
};

export const formatVersionMessage = (name: string, version: string): WhatsAppMessage => ({
  text: `Hermes Version\n\n${name} @ ${version}`,
});

const redactConfig = (cfg: HermesConfig): ReadonlyArray<readonly [string, string]> => {
  const r = redactHermesConfig(cfg);
  return [
    ['NODE_ENV', r.nodeEnv],
    ['LOG_LEVEL', r.logLevel],
    ['OPENROUTER_API_KEY', r.openrouterApiKey],
    ['DATABASE_URL', r.databaseUrl],
    ['REDIS_URL', r.redisUrl],
    ['OTEL_ENABLED', String(r.otelEnabled)],
    ['OTEL_EXPORTER_ENDPOINT', r.otelExporterEndpoint ?? '—'],
    ['HERMES_MODULES_DIR', r.hermesModulesDir],
    ['HERMES_SHUTDOWN_TIMEOUT_MS', String(r.hermesShutdownTimeoutMs)],
  ];
};

export const formatConfigMessage = (cfg: HermesConfig): WhatsAppMessage => {
  const rows = redactConfig(cfg)
    .map(([k, v]) => `  - ${k}: ${v}`)
    .join('\n');
  return {
    text: `Hermes Configuration\n\nSecrets are redacted.\n\n${rows}`,
  };
};

export const formatModulesMessage = (count: number): WhatsAppMessage => ({
  text: `Hermes Modules\n\nRegistered: ${count}\n\n(per-module detail lands when the kernel exposes a module-readout port)`,
});

export const formatStartedMessage = (phase: string): WhatsAppMessage => ({
  text: `Hermes Start\n\nKernel phase: ${phase}`,
});

export const formatStoppedMessage = (phase: string): WhatsAppMessage => ({
  text: `Hermes Stop\n\nKernel phase: ${phase}`,
});

export const formatErrorMessage = (message: string): WhatsAppMessage => ({
  text: `Error\n\n${message}`,
});

export const formatPermissionMessage = (action: string): WhatsAppMessage => ({
  text: `Permission Denied\n\nYou do not have permission to run ${action}.`,
});
