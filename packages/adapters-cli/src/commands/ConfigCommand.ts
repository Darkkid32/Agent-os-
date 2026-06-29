/**
 * config command — reads `hermes.config` and redacts secrets.
 *
 * The CLI never logs secrets. This command reads the frozen HermesConfig
 * snapshot from the port and emits a JSON shape with secret fields replaced
 * by the literal string `****`. The raw config is never serialised.
 */
import type { HermesConfig } from '@agent-os/hermes';
import type { Command } from '../interfaces/Command.js';

export interface RedactedConfig {
  readonly nodeEnv: HermesConfig['nodeEnv'];
  readonly logLevel: HermesConfig['logLevel'];
  readonly openrouterApiKey: '****';
  readonly databaseUrl: '****';
  readonly redisUrl: '****';
  readonly otelEnabled: HermesConfig['otelEnabled'];
  readonly otelExporterEndpoint: HermesConfig['otelExporterEndpoint'];
  readonly hermesModulesDir: HermesConfig['hermesModulesDir'];
  readonly hermesShutdownTimeoutMs: HermesConfig['hermesShutdownTimeoutMs'];
}

const REDACTED = '****' as const;

const redact = (cfg: HermesConfig): RedactedConfig => ({
  nodeEnv: cfg.nodeEnv,
  logLevel: cfg.logLevel,
  openrouterApiKey: REDACTED,
  databaseUrl: REDACTED,
  redisUrl: REDACTED,
  otelEnabled: cfg.otelEnabled,
  otelExporterEndpoint: cfg.otelExporterEndpoint,
  hermesModulesDir: cfg.hermesModulesDir,
  hermesShutdownTimeoutMs: cfg.hermesShutdownTimeoutMs,
});

export const configCommand: Command<RedactedConfig> = {
  name: 'config',
  summary: 'Show active configuration (secrets redacted).',
  usage: 'agent-os config',
  requires: 'config',
  handler: async (ctx) => ({ ok: true, value: redact(ctx.hermes.config) }),
};
