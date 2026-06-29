/**
 * Telegram response formatting.
 *
 * Pure functions: Hermes data in, text out. MarkdownV2 escaping is
 * applied conservatively. The dispatcher converts TelegramMessage to a
 * grammY `ctx.reply(text, options)` call.
 */
import {
  type HermesConfig,
  type HermesHealthMonitorReport,
  type HermesLifecyclePhase,
  type HermesStatus,
  redactHermesConfig,
} from '@agent-os/hermes';
import type { TelegramMessage } from './types.js';

const escapeMarkdownV2 = (s: string): string =>
  s.replace(/[_*[\]()~`>#+\-=|{}.!\\]/g, (m) => `\\${m}`);

const formatPhase = (phase: HermesLifecyclePhase): string => `*${phase}*`;

export const formatStatusMessage = (status: HermesStatus): TelegramMessage => ({
  text: [
    '*Hermes Status*',
    '',
    `Phase: ${formatPhase(status.phase)}`,
    `Uptime (ms): ${status.uptime}`,
    `Modules: ${status.modules}`,
  ].join('\n'),
  parseMode: 'MarkdownV2',
});

const formatHealthModule = (m: HermesHealthMonitorReport['modules'][number]): string => {
  const safeStatus = escapeMarkdownV2(m.status);
  const safeName = escapeMarkdownV2(m.name);
  if (m.detail) {
    return `• \`${safeName}\`: ${safeStatus} — ${escapeMarkdownV2(m.detail)}`;
  }
  return `• \`${safeName}\`: ${safeStatus}`;
};

export const formatHealthMessage = (report: HermesHealthMonitorReport): TelegramMessage => {
  const header = `*Hermes Health*\n\nAggregate: *${escapeMarkdownV2(report.status)}*`;
  if (report.modules.length === 0) {
    return {
      text: `${header}\n\n_\\(no modules registered\\)_`,
      parseMode: 'MarkdownV2',
    };
  }
  const body = report.modules.map(formatHealthModule).join('\n');
  return { text: `${header}\n\n${body}`, parseMode: 'MarkdownV2' };
};

export const formatVersionMessage = (name: string, version: string): TelegramMessage => ({
  text: `*Hermes Version*\n\n${escapeMarkdownV2(name)} \\@ ${escapeMarkdownV2(version)}`,
  parseMode: 'MarkdownV2',
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

export const formatConfigMessage = (cfg: HermesConfig): TelegramMessage => {
  const rows = redactConfig(cfg)
    .map(([k, v]) => `• \`${escapeMarkdownV2(k)}\`: ${escapeMarkdownV2(v)}`)
    .join('\n');
  return {
    text: `*Hermes Configuration*\n\n_Secrets are redacted._\n\n${rows}`,
    parseMode: 'MarkdownV2',
  };
};

export const formatModulesMessage = (count: number): TelegramMessage => ({
  text: `*Hermes Modules*\n\nRegistered: *${count}*\n\n_Per\\-module detail lands when the kernel exposes a module\\-readout port._`,
  parseMode: 'MarkdownV2',
});

export const formatStartedMessage = (phase: string): TelegramMessage => ({
  text: `*Hermes Start*\n\nKernel phase: *${escapeMarkdownV2(phase)}*`,
  parseMode: 'MarkdownV2',
});

export const formatStoppedMessage = (phase: string): TelegramMessage => ({
  text: `*Hermes Stop*\n\nKernel phase: *${escapeMarkdownV2(phase)}*`,
  parseMode: 'MarkdownV2',
});

export const formatErrorMessage = (message: string): TelegramMessage => ({
  text: `*Error*\n\n${escapeMarkdownV2(message)}`,
  parseMode: 'MarkdownV2',
});

export const formatPermissionMessage = (action: string): TelegramMessage => ({
  text: `*Permission Denied*\n\nYou do not have permission to run \`${escapeMarkdownV2(action)}\`.`,
  parseMode: 'MarkdownV2',
});
