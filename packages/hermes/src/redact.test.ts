import { describe, expect, it } from 'vitest';
import type { HermesConfig } from './HermesConfig.js';
import { redactHermesConfig } from './redact.js';

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

describe('redactHermesConfig', () => {
  it('redacts known secret keys', () => {
    const r = redactHermesConfig(baseConfig);
    expect(r.openrouterApiKey).toBe('****');
    expect(r.databaseUrl).toBe('****');
    expect(r.redisUrl).toBe('****');
  });

  it('preserves non-secret keys verbatim', () => {
    const r = redactHermesConfig(baseConfig);
    expect(r.nodeEnv).toBe('production');
    expect(r.logLevel).toBe('info');
    expect(r.otelEnabled).toBe(true);
    expect(r.otelExporterEndpoint).toBeUndefined();
    expect(r.hermesModulesDir).toBe('./modules');
    expect(r.hermesShutdownTimeoutMs).toBe(30_000);
  });

  it('returns a frozen object', () => {
    const r = redactHermesConfig(baseConfig);
    expect(Object.isFrozen(r)).toBe(true);
  });

  it('does not mutate the input', () => {
    const input: HermesConfig = Object.freeze({ ...baseConfig });
    const snapshot = { ...input };
    redactHermesConfig(input);
    expect(input).toEqual(snapshot);
  });
});
