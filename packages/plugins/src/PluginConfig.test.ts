import { describe, it, expect } from 'vitest';
import { createPluginConfig, validateConfig, createDefaultSources } from './PluginConfig.js';
import type { PluginConfigSchema, PluginConfigSource, PluginConfiguration } from './types.js';

describe('PluginConfig', () => {
  describe('createPluginConfig', () => {
    it('creates a config with values from sources', () => {
      const sources: PluginConfigSource[] = [
        {
          priority: 0,
          get: () => ({ host: 'localhost', port: 3000 }),
        },
      ];

      const config = createPluginConfig({
        sources,
        pluginId: 'test-plugin',
      });

      expect(config.get('host')).toBe('localhost');
      expect(config.get('port')).toBe(3000);
      expect(config.has('host')).toBe(true);
      expect(config.has('missing')).toBe(false);
    });

    it('applies defaults from schema', () => {
      const schema: PluginConfigSchema = {
        host: { type: 'string', default: '0.0.0.0' },
        port: { type: 'number', default: 8080 },
      };
      const sources: PluginConfigSource[] = [
        {
          priority: 0,
          get: () => ({ port: 3000 }),
        },
      ];

      const config = createPluginConfig({
        schema,
        sources,
        pluginId: 'test-plugin',
      });

      expect(config.get('host')).toBe('0.0.0.0'); // from default
      expect(config.get('port')).toBe(3000); // from source
    });

    it('require throws for missing keys', () => {
      const sources: PluginConfigSource[] = [];

      const config = createPluginConfig({
        sources,
        pluginId: 'test-plugin',
      });

      expect(() => config.require('missing')).toThrow('Required configuration key');
    });

    it('require returns value when present', () => {
      const sources: PluginConfigSource[] = [
        {
          priority: 0,
          get: () => ({ host: 'localhost' }),
        },
      ];

      const config = createPluginConfig({
        sources,
        pluginId: 'test-plugin',
      });

      expect(config.require('host')).toBe('localhost');
    });

    it('all returns merged config', () => {
      const sources: PluginConfigSource[] = [
        {
          priority: 0,
          get: () => ({ a: 1, b: 2 }),
        },
        {
          priority: 10,
          get: () => ({ b: 3, c: 4 }),
        },
      ];

      const config = createPluginConfig({
        sources,
        pluginId: 'test-plugin',
      });

      expect(config.all()).toEqual({ a: 1, b: 3, c: 4 }); // higher priority wins
    });

    it('schema returns the config schema', () => {
      const schema: PluginConfigSchema = {
        host: { type: 'string', default: 'localhost' },
      };

      const config = createPluginConfig({
        schema,
        sources: [],
        pluginId: 'test-plugin',
      });

      expect(config.schema()).toEqual(schema);
    });

    it('get returns typed value', () => {
      const sources: PluginConfigSource[] = [
        {
          priority: 0,
          get: () => ({ port: 3000 }),
        },
      ];

      const config = createPluginConfig({
        sources,
        pluginId: 'test-plugin',
      });

      const port = config.get<number>('port');
      expect(port).toBe(3000);
    });
  });

  describe('validateConfig', () => {
    it('validates config against schema', () => {
      const schema: PluginConfigSchema = {
        host: { type: 'string', required: true },
        port: { type: 'number', required: true },
      };
      const config: PluginConfiguration = { host: 'localhost', port: 3000 };

      const result = validateConfig(config, schema);

      expect(result.valid).toBe(true);
    });

    it('reports validation errors', () => {
      const schema: PluginConfigSchema = {
        host: { type: 'string', required: true },
        port: { type: 'number', required: true },
      };
      const config: PluginConfiguration = {};

      const result = validateConfig(config, schema);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('createDefaultSources', () => {
    it('creates sources from global config', () => {
      const globalConfig: PluginConfiguration = { host: '0.0.0.0' };
      const sources = createDefaultSources(globalConfig, undefined);

      expect(sources).toHaveLength(1);
      expect(sources[0]?.get('test-plugin')).toEqual({ host: '0.0.0.0' });
    });

    it('creates sources from env overrides', () => {
      const envOverrides = {
        'test-plugin': { port: 9090 },
      };
      const sources = createDefaultSources(undefined, envOverrides);

      expect(sources).toHaveLength(1);
      expect(sources[0]?.get('test-plugin')).toEqual({ port: 9090 });
    });

    it('creates sources from both', () => {
      const globalConfig: PluginConfiguration = { host: '0.0.0.0' };
      const envOverrides = {
        'test-plugin': { port: 9090 },
      };
      const sources = createDefaultSources(globalConfig, envOverrides);

      expect(sources).toHaveLength(2);
    });

    it('returns empty array when no sources', () => {
      const sources = createDefaultSources(undefined, undefined);
      expect(sources).toHaveLength(0);
    });
  });
});
