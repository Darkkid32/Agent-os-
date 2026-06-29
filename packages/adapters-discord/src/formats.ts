/**
 * Discord response formatting.
 *
 * Each command produces a DiscordEmbed-shaped payload. These helpers are
 * pure functions: Hermes data in, Discord-shaped data out. They never
 * touch the gateway or call discord.js — that's the adapter's job.
 */
import {
  type HermesConfig,
  type HermesHealthMonitorReport,
  type HermesLifecyclePhase,
  type HermesStatus,
  redactHermesConfig,
} from '@agent-os/hermes';
import type { DiscordEmbedField, DiscordMessage } from './types.js';

const PHASE_COLOR: Readonly<Record<HermesLifecyclePhase, number>> = {
  RUNNING: 0x10b981,
  STARTING: 0xf59e0b,
  STOPPING: 0xf59e0b,
  INITIALIZING: 0x64748b,
  STOPPED: 0x64748b,
  FAILED: 0xef4444,
};

const HEALTH_COLOR: Readonly<Record<string, number>> = {
  healthy: 0x10b981,
  degraded: 0xf59e0b,
  failed: 0xef4444,
  unknown: 0x64748b,
};

const phaseColor = (phase: HermesLifecyclePhase): number => PHASE_COLOR[phase] ?? 0x64748b;

const healthColor = (status: string): number => HEALTH_COLOR[status] ?? 0x64748b;

export const formatStatusMessage = (status: HermesStatus, at: number): DiscordMessage => ({
  embeds: [
    {
      title: 'Hermes Status',
      color: phaseColor(status.phase),
      fields: [
        { name: 'Phase', value: status.phase, inline: true },
        { name: 'Uptime (ms)', value: String(status.uptime), inline: true },
        { name: 'Modules', value: String(status.modules), inline: true },
      ],
      timestamp: new Date(at).toISOString(),
    },
  ],
});

export const formatHealthMessage = (
  report: HermesHealthMonitorReport,
  at: number,
): DiscordMessage => ({
  embeds: [
    {
      title: 'Hermes Health',
      color: healthColor(report.status),
      description: `Aggregate: **${report.status}**`,
      fields:
        report.modules.length === 0
          ? [{ name: '(no modules)', value: '—' }]
          : report.modules.map<DiscordEmbedField>((m) => ({
              name: m.name,
              value: m.detail ? `${m.status} — ${m.detail}` : m.status,
              inline: true,
            })),
      timestamp: new Date(at).toISOString(),
    },
  ],
});

export const formatVersionMessage = (name: string, version: string): DiscordMessage => ({
  embeds: [
    {
      title: 'Hermes Version',
      color: 0x3b82f6,
      fields: [
        { name: 'Kernel', value: name },
        { name: 'Version', value: version },
      ],
    },
  ],
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

export const formatConfigMessage = (cfg: HermesConfig): DiscordMessage => ({
  embeds: [
    {
      title: 'Hermes Configuration',
      color: 0x6366f1,
      description: 'Secrets are redacted.',
      fields: redactConfig(cfg).map<DiscordEmbedField>(([k, v]) => ({
        name: k,
        value: v,
        inline: true,
      })),
    },
  ],
});

export const formatModulesMessage = (count: number, at: number): DiscordMessage => ({
  embeds: [
    {
      title: 'Hermes Modules',
      color: 0x6366f1,
      fields: [{ name: 'Registered', value: String(count), inline: true }],
      footer: 'Per-module detail lands when the kernel exposes a module-readout port.',
      timestamp: new Date(at).toISOString(),
    },
  ],
});

export const formatStartedMessage = (phase: string, at: number): DiscordMessage => ({
  embeds: [
    {
      title: 'Hermes Start',
      color: 0x10b981,
      description: `Kernel phase: **${phase}**`,
      timestamp: new Date(at).toISOString(),
    },
  ],
});

export const formatStoppedMessage = (phase: string, at: number): DiscordMessage => ({
  embeds: [
    {
      title: 'Hermes Stop',
      color: 0x64748b,
      description: `Kernel phase: **${phase}**`,
      timestamp: new Date(at).toISOString(),
    },
  ],
});

export const formatErrorMessage = (message: string): DiscordMessage => ({
  embeds: [
    {
      title: 'Error',
      color: 0xef4444,
      description: message,
    },
  ],
  ephemeral: true,
});

export const formatPermissionMessage = (action: string): DiscordMessage => ({
  embeds: [
    {
      title: 'Permission Denied',
      color: 0xef4444,
      description: `You do not have permission to run \`${action}\`.`,
    },
  ],
  ephemeral: true,
});

export const formatUnknownMessage = (command: string): DiscordMessage => ({
  embeds: [
    {
      title: 'Unknown Command',
      color: 0x64748b,
      description: `\`${command}\` is not a registered command.`,
    },
  ],
  ephemeral: true,
});

export const phaseColorOf = phaseColor;
export const healthColorOf = healthColor;
