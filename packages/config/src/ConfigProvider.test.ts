import { describe, it, expect } from 'vitest';
import { createConfigProvider } from './ConfigProvider.js';
import type { ConfigSchema } from './types.js';

describe('ConfigProvider', () => {
  const schema: ConfigSchema = {
    host: { type: 'string', required: true, default: 'localhost' },
    port: { type: 'number', required: true, default: 3000, min: 1, max: 65535 },
    debug: { type: 'boolean', default: false },
    logLevel: { type: 'enum', values: ['debug', 'info', 'warn', 'error'], default: 'info' },
  };

  it('creates provider with defaults', () => {
    const provider = createConfigProvider('test', schema, [{ kind: 'defaults', values: {} }]);
    expect(provider.name).toBe('test');
    expect(provider.get('host')).toBe('localhost');
    expect(provider.get('port')).toBe(3000);
    expect(provider.get('debug')).toBe(false);
    expect(provider.get('logLevel')).toBe('info');
  });

  it('overrides defaults with runtime values', () => {
    const provider = createConfigProvider('test', schema, [
      { kind: 'defaults', values: {} },
      { kind: 'runtime', values: { port: 8080 } },
    ]);
    expect(provider.get('port')).toBe(8080);
  });

  it('getTyped returns typed value', () => {
    const provider = createConfigProvider('test', schema, [{ kind: 'defaults', values: {} }]);
    expect(provider.getTyped<string>('host')).toBe('localhost');
    expect(provider.getTyped<number>('port')).toBe(3000);
  });

  it('getTyped throws for missing key', () => {
    const provider = createConfigProvider('test', schema, [{ kind: 'defaults', values: {} }]);
    expect(() => provider.getTyped('nonexistent')).toThrow('not found');
  });

  it('has returns true for existing key', () => {
    const provider = createConfigProvider('test', schema, [{ kind: 'defaults', values: {} }]);
    expect(provider.has('host')).toBe(true);
    expect(provider.has('nonexistent')).toBe(false);
  });

  it('keys returns all config keys', () => {
    const provider = createConfigProvider('test', schema, [{ kind: 'defaults', values: {} }]);
    expect(provider.keys()).toEqual(expect.arrayContaining(['host', 'port', 'debug', 'logLevel']));
  });

  it('all returns all config values', () => {
    const provider = createConfigProvider('test', schema, [{ kind: 'defaults', values: {} }]);
    const all = provider.all();
    expect(all.host).toBe('localhost');
    expect(all.port).toBe(3000);
  });

  it('throws on validation failure for required fields', () => {
    const strictSchema: ConfigSchema = {
      apiKey: { type: 'string', required: true },
    };
    expect(() =>
      createConfigProvider('test', strictSchema, [{ kind: 'defaults', values: {} }]),
    ).toThrow('Configuration validation failed');
  });

  it('throws on type validation failure', () => {
    const strictSchema: ConfigSchema = {
      port: { type: 'number', required: true },
    };
    expect(() =>
      createConfigProvider('test', strictSchema, [
        { kind: 'defaults', values: {} },
        { kind: 'runtime', values: { port: 'not-a-number' } },
      ]),
    ).toThrow('Configuration validation failed');
  });

  it('validate returns validation result', () => {
    const provider = createConfigProvider('test', schema, [{ kind: 'defaults', values: {} }]);
    const result = provider.validate({
      host: { type: 'string' },
    });
    expect(result.ok).toBe(true);
  });
});
