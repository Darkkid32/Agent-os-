/**
 * Configuration benchmarks.
 *
 * Measures: config loading, schema validation, secret lookup, runtime overrides.
 */

import { bench, describe } from 'vitest';
import {
  createConfigProvider,
  createConfigRegistry,
  validator,
  type ConfigSchema,
} from '@agent-os/config';

const simpleSchema: ConfigSchema = {
  port: { type: 'number', required: true, min: 1, max: 65535 },
  host: { type: 'string', required: true, minLength: 1, maxLength: 255 },
  debug: { type: 'boolean', default: false },
  logLevel: { type: 'enum', values: ['debug', 'info', 'warn', 'error'], default: 'info' },
};

const complexSchema: ConfigSchema = {
  ...simpleSchema,
  database: {
    type: 'object',
    properties: {
      host: { type: 'string', required: true },
      port: { type: 'number', required: true, min: 1, max: 65535 },
      name: { type: 'string', required: true },
    },
  },
  tags: { type: 'array', items: { type: 'string' }, minItems: 0, maxItems: 10 },
};

const defaultData = {
  port: 4000,
  host: 'localhost',
  database: { host: 'db.local', port: 5432, name: 'app' },
  tags: ['prod'],
};

describe('Configuration', () => {
  bench('createConfigProvider (simple)', () => {
    createConfigProvider('bench', simpleSchema, [
      { kind: 'defaults', values: { port: 3000, host: 'localhost' } },
    ]);
  });

  bench('createConfigProvider (complex)', () => {
    createConfigProvider('bench', complexSchema, [{ kind: 'defaults', values: defaultData }]);
  });

  bench('validator.validate (simple, valid)', () => {
    validator.validate({ port: 4000, host: 'localhost' }, simpleSchema);
  });

  bench('validator.validate (simple, invalid)', () => {
    validator.validate({ port: -1, host: '' }, simpleSchema);
  });

  bench('validator.validate (complex, valid)', () => {
    validator.validate(defaultData, complexSchema);
  });

  bench('validator.validate (complex, deeply nested invalid)', () => {
    validator.validate(
      { ...defaultData, database: { host: '', port: -1, name: '' } },
      complexSchema,
    );
  });

  bench('provider.get (simple)', () => {
    const p = createConfigProvider('bench', simpleSchema, [
      { kind: 'defaults', values: { port: 3000, host: 'localhost' } },
    ]);
    p.get('port');
    p.get('host');
    p.get('debug');
  });

  bench('provider.getTyped (simple)', () => {
    const p = createConfigProvider('bench', simpleSchema, [
      { kind: 'defaults', values: { port: 3000, host: 'localhost' } },
    ]);
    p.getTyped<number>('port');
    p.getTyped<string>('host');
  });

  bench('provider.has (simple)', () => {
    const p = createConfigProvider('bench', simpleSchema, [
      { kind: 'defaults', values: { port: 3000, host: 'localhost' } },
    ]);
    p.has('port');
    p.has('nonexistent');
  });

  bench('provider.all (simple)', () => {
    const p = createConfigProvider('bench', simpleSchema, [
      { kind: 'defaults', values: { port: 3000, host: 'localhost' } },
    ]);
    p.all();
  });

  bench('registry register + lookup', () => {
    const registry = createConfigRegistry();
    const p = createConfigProvider('bench', simpleSchema, [
      { kind: 'defaults', values: { port: 3000, host: 'localhost' } },
    ]);
    registry.register(p);
    registry.getProvider('bench');
  });
});
