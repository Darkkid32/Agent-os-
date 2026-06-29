/**
 * Email adapter formatting utilities.
 *
 * All output is plain text — email replies follow the CLI adapter's
 * human-readable output conventions (platform.md §5.4). No Markdown
 * formatting; plain text only for maximum email client compatibility.
 */
import type { EmailMessage } from './types.js';

export const formatStatusMessage = (status: {
  readonly phase: string;
  readonly uptime: number;
  readonly modules: number;
}): EmailMessage => ({
  text: `Hermes Kernel\nPhase: ${status.phase}\nUptime: ${status.uptime}ms\nModules: ${status.modules}`,
  subject: 'Status',
});

export const formatHealthMessage = (report: {
  readonly status: string;
  readonly modules?: unknown;
}): EmailMessage => ({
  text: `Hermes Health\nStatus: ${report.status}`,
  subject: 'Health',
});

export const formatVersionMessage = (name: string, version: string): EmailMessage => ({
  text: `${name}/${version}`,
  subject: 'Version',
});

export const formatConfigMessage = (config: {
  readonly openrouterApiKey?: string;
  readonly databaseUrl?: string;
  readonly redisUrl?: string;
}): EmailMessage => ({
  text: [
    'Hermes Configuration',
    `OPENROUTER_API_KEY: ${config.openrouterApiKey ?? '(not set)'}`,
    `DATABASE_URL: ${config.databaseUrl ?? '(not set)'}`,
    `REDIS_URL: ${config.redisUrl ?? '(not set)'}`,
  ].join('\n'),
  subject: 'Config',
});

export const formatModulesMessage = (count: number): EmailMessage => ({
  text: `Registered Modules: ${count}`,
  subject: 'Plugins',
});

export const formatStartedMessage = (phase: string): EmailMessage => ({
  text: `Hermes Start\nPhase: ${phase}`,
  subject: 'Start',
});

export const formatStoppedMessage = (phase: string): EmailMessage => ({
  text: `Hermes Stop\nPhase: ${phase}`,
  subject: 'Stop',
});

export const formatErrorMessage = (message: string): EmailMessage => ({
  text: `ERROR: ${message}`,
  subject: 'Error',
});

export const formatPermissionMessage = (action: string): EmailMessage => ({
  text: `Permission Denied: insufficient role for "${action}".`,
  subject: 'Permission Denied',
});

export const formatHelpMessage = (): EmailMessage => ({
  text: [
    'Available Commands',
    '  start    — Start the Hermes kernel (admin)',
    '  stop     — Stop the Hermes kernel (admin)',
    '  status   — Show kernel phase, uptime, module count',
    '  health   — Show aggregate and per-module health',
    '  plugins  — List registered modules',
    '  config   — Show active configuration (secrets redacted)',
    '  version  — Show version',
    '  help     — Show this message',
  ].join('\n'),
  subject: 'Help',
});
