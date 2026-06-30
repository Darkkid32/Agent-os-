import { describe, it, expect } from 'vitest';
import { createConfigProvider, createConfigRegistry, SecretValue } from './index.js';
import type { ConfigSchema } from './types.js';

describe('Integration: full config workflow', () => {
  const apiSchema: ConfigSchema = {
    host: { type: 'string', required: true, default: '0.0.0.0' },
    port: { type: 'number', required: true, default: 3000, min: 1, max: 65535 },
    debug: { type: 'boolean', default: false },
    logLevel: { type: 'enum', values: ['debug', 'info', 'warn', 'error'], default: 'info' },
    corsOrigins: { type: 'array', items: { type: 'string' }, default: ['*'] },
    apiKey: { type: 'string', required: true },
  };

  it('creates, validates, and registers a config provider', () => {
    const provider = createConfigProvider('api', apiSchema, [
      { kind: 'defaults', values: {} },
      { kind: 'runtime', values: { apiKey: 'test-key-123', port: 4000 } },
    ]);

    expect(provider.get('host')).toBe('0.0.0.0');
    expect(provider.get('port')).toBe(4000);
    expect(provider.get('apiKey')).toBe('test-key-123');

    const registry = createConfigRegistry();
    registry.register(provider);

    expect(registry.getProvider('api')).toBe(provider);
    expect(registry.providers()).toHaveLength(1);
  });

  it('fails startup when required field missing', () => {
    expect(() =>
      createConfigProvider('api', apiSchema, [{ kind: 'defaults', values: {} }]),
    ).toThrow('Configuration validation failed');
  });

  it('fails startup on invalid enum', () => {
    expect(() =>
      createConfigProvider('api', apiSchema, [
        { kind: 'defaults', values: {} },
        { kind: 'runtime', values: { apiKey: 'key', logLevel: 'verbose' } },
      ]),
    ).toThrow('Configuration validation failed');
  });

  it('fails startup on value out of range', () => {
    expect(() =>
      createConfigProvider('api', apiSchema, [
        { kind: 'defaults', values: {} },
        { kind: 'runtime', values: { apiKey: 'key', port: 99999 } },
      ]),
    ).toThrow('Configuration validation failed');
  });

  it('secret value is safe for logging', () => {
    const secret = SecretValue.of('sk-1234567890abcdef');
    const logEntry = {
      message: 'config loaded',
      apiKey: secret.masked(),
    };
    expect(JSON.stringify(logEntry)).not.toContain('sk-1234567890abcdef');
    expect(logEntry.apiKey).toBe('sk********');
  });

  it('multiple providers in registry', () => {
    const apiProvider = createConfigProvider('api', apiSchema, [
      { kind: 'defaults', values: {} },
      { kind: 'runtime', values: { apiKey: 'key' } },
    ]);

    const hermesSchema: ConfigSchema = {
      concurrency: { type: 'number', default: 5 },
    };
    const hermesProvider = createConfigProvider('hermes', hermesSchema, [
      { kind: 'defaults', values: {} },
    ]);

    const registry = createConfigRegistry();
    registry.register(apiProvider);
    registry.register(hermesProvider);

    expect(registry.providers()).toHaveLength(2);
    expect(registry.getProvider('api')?.get('port')).toBe(3000);
    expect(registry.getProvider('hermes')?.get('concurrency')).toBe(5);
  });
});
