import { describe, expect, it } from 'vitest';
import type { HermesConfig } from '@agent-os/hermes';
import { formatConfigMessage, formatHealthMessage, formatStatusMessage } from './formats.js';

const baseConfig = {
  nodeEnv: 'production',
  logLevel: 'info',
  openrouterApiKey: 'sk-shhh',
  databaseUrl: 'postgres://secret',
  redisUrl: 'redis://secret',
  otelEnabled: true,
  otelExporterEndpoint: undefined,
  hermesModulesDir: './modules',
  hermesShutdownTimeoutMs: 30_000,
} satisfies HermesConfig;

describe('Telegram formats', () => {
  it('redacts secrets in config message', () => {
    const msg = formatConfigMessage(baseConfig);
    // MarkdownV2 escapes asterisks, so the redactor's `****` becomes `\*\*\*\*`
    expect(msg.text).toContain('\\*\\*\\*\\*');
    expect(msg.text).not.toContain('sk-shhh');
    expect(msg.text).not.toContain('postgres://secret');
    expect(msg.text).not.toContain('redis://secret');
    expect(msg.parseMode).toBe('MarkdownV2');
  });

  it('status formatter includes phase + uptime + modules', () => {
    const msg = formatStatusMessage({ phase: 'RUNNING', uptime: 1234 as never, modules: 7 });
    expect(msg.text).toContain('RUNNING');
    expect(msg.text).toContain('1234');
    expect(msg.text).toContain('7');
    expect(msg.parseMode).toBe('MarkdownV2');
  });

  it('health formatter renders aggregate + per-module', () => {
    const msg = formatHealthMessage({
      status: 'degraded',
      modules: [
        { name: 'm1', status: 'healthy' },
        { name: 'm2', status: 'degraded', detail: 'recovering' },
      ],
      at: 0 as never,
    });
    expect(msg.text).toContain('degraded');
    expect(msg.text).toContain('m1');
    expect(msg.text).toContain('m2');
    expect(msg.text).toContain('recovering');
  });
});
