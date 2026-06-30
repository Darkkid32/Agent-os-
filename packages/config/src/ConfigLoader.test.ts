import { describe, it, expect } from 'vitest';
import { loader } from './ConfigLoader.js';
import type { ConfigSource } from './types.js';

describe('ConfigLoader', () => {
  it('loads defaults', () => {
    const sources: ConfigSource[] = [
      { kind: 'defaults', values: { host: 'localhost', port: 3000 } },
    ];
    const result = loader.load(sources);
    expect(result).toEqual({ host: 'localhost', port: 3000 });
  });

  it('loads file source', () => {
    const sources: ConfigSource[] = [
      { kind: 'defaults', values: { host: 'localhost' } },
      { kind: 'file', path: 'config.json', values: { host: '0.0.0.0', port: 8080 } },
    ];
    const result = loader.load(sources);
    expect(result).toEqual({ host: '0.0.0.0', port: 8080 });
  });

  it('loads env source with prefix', () => {
    const sources: ConfigSource[] = [
      {
        kind: 'env',
        prefix: 'TEST_CFG_',
        values: { TEST_CFG_PORT: '9090', TEST_CFG_HOST: 'example.com' },
      },
    ];
    const result = loader.load(sources);
    expect(result).toEqual({ port: 9090, host: 'example.com' });
  });

  it('coerces boolean env values', () => {
    const sources: ConfigSource[] = [
      {
        kind: 'env',
        prefix: 'TEST_CFG_',
        values: { TEST_CFG_DEBUG: 'true', TEST_CFG_VERBOSE: 'false' },
      },
    ];
    const result = loader.load(sources);
    expect(result).toEqual({ debug: true, verbose: false });
  });

  it('coerces numeric env values', () => {
    const sources: ConfigSource[] = [
      { kind: 'env', prefix: 'TEST_CFG_', values: { TEST_CFG_PORT: '3000' } },
    ];
    const result = loader.load(sources);
    expect(result).toEqual({ port: 3000 });
  });

  it('loads runtime overrides', () => {
    const sources: ConfigSource[] = [
      { kind: 'defaults', values: { host: 'localhost', port: 3000 } },
      { kind: 'runtime', values: { port: 9000 } },
    ];
    const result = loader.load(sources);
    expect(result).toEqual({ host: 'localhost', port: 9000 });
  });

  it('applies priority: defaults < file < env < runtime', () => {
    const sources: ConfigSource[] = [
      { kind: 'defaults', values: { a: 1, b: 1, c: 1, d: 1 } },
      { kind: 'file', path: 'c.json', values: { b: 2, c: 2 } },
      { kind: 'env', prefix: 'T_', values: { T_C: '3' } },
      { kind: 'runtime', values: { d: 4 } },
    ];
    const result = loader.load(sources);
    expect(result).toEqual({ a: 1, b: 2, c: 3, d: 4 });
  });

  it('deep merges nested objects', () => {
    const sources: ConfigSource[] = [
      { kind: 'defaults', values: { db: { host: 'localhost', port: 5432 } } },
      { kind: 'runtime', values: { db: { host: 'remotehost' } } },
    ];
    const result = loader.load(sources);
    expect(result).toEqual({ db: { host: 'remotehost', port: 5432 } });
  });

  it('handles empty sources', () => {
    const result = loader.load([]);
    expect(result).toEqual({});
  });

  it('env maps nested keys from underscored paths', () => {
    const sources: ConfigSource[] = [
      { kind: 'env', prefix: 'APP_', values: { APP_DB_HOST: 'localhost', APP_DB_PORT: '5432' } },
    ];
    const result = loader.load(sources);
    expect(result).toEqual({ db: { host: 'localhost', port: 5432 } });
  });

  it('array values from env are kept as strings', () => {
    const sources: ConfigSource[] = [
      { kind: 'env', prefix: 'APP_', values: { APP_NAME: 'test-app' } },
    ];
    const result = loader.load(sources);
    expect(result).toEqual({ name: 'test-app' });
  });
});
