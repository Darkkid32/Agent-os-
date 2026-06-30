import { describe, it, expect } from 'vitest';
import { definePluginConfig } from './definePluginConfig.js';

describe('definePluginConfig', () => {
  it('creates a config schema with fields', () => {
    const schema = definePluginConfig()
      .field('host', 'string')
      .required()
      .default('localhost')
      .description('Server host')
      .build()
      .field('port', 'number')
      .required()
      .default(3000)
      .description('Server port')
      .build()
      .build();

    expect(schema).toEqual({
      host: {
        type: 'string',
        required: true,
        default: 'localhost',
        description: 'Server host',
      },
      port: {
        type: 'number',
        required: true,
        default: 3000,
        description: 'Server port',
      },
    });
  });

  it('creates a config schema with enum field', () => {
    const schema = definePluginConfig()
      .field('mode', 'string')
      .enum(['development', 'production'])
      .default('development')
      .build()
      .build();

    expect(schema).toEqual({
      mode: {
        type: 'string',
        enum: ['development', 'production'],
        default: 'development',
      },
    });
  });

  it('creates a config schema with boolean field', () => {
    const schema = definePluginConfig().field('debug', 'boolean').default(false).build().build();

    expect(schema).toEqual({
      debug: {
        type: 'boolean',
        default: false,
      },
    });
  });

  it('creates a config schema with object field', () => {
    const schema = definePluginConfig()
      .field('database', 'object')
      .properties({
        host: { type: 'string', default: 'localhost' },
        port: { type: 'number', default: 5432 },
      })
      .build()
      .build();

    expect(schema).toEqual({
      database: {
        type: 'object',
        properties: {
          host: { type: 'string', default: 'localhost' },
          port: { type: 'number', default: 5432 },
        },
      },
    });
  });

  it('creates a config schema with array field', () => {
    const schema = definePluginConfig()
      .field('tags', 'array')
      .items({ type: 'string' })
      .build()
      .build();

    expect(schema).toEqual({
      tags: {
        type: 'array',
        items: { type: 'string' },
      },
    });
  });

  it('returns empty schema when no fields defined', () => {
    const schema = definePluginConfig().build();
    expect(schema).toEqual({});
  });
});
