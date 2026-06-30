import { describe, it, expect } from 'vitest';
import { validatePluginConfig, applyDefaults } from './PluginConfigValidator.js';
import type { PluginConfigSchema } from './types.js';

describe('PluginConfigValidator', () => {
  describe('validatePluginConfig', () => {
    it('validates a valid config', () => {
      const schema: PluginConfigSchema = {
        name: { type: 'string', required: true },
        port: { type: 'number', required: true },
      };
      const config = { name: 'test', port: 8080 };

      const result = validatePluginConfig(config, schema);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('reports missing required fields', () => {
      const schema: PluginConfigSchema = {
        name: { type: 'string', required: true },
        port: { type: 'number', required: true },
      };
      const config = {};

      const result = validatePluginConfig(config, schema);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(2);
      expect(result.errors[0]?.message).toContain('Required field');
    });

    it('validates string type', () => {
      const schema: PluginConfigSchema = {
        name: { type: 'string', required: true },
      };

      expect(validatePluginConfig({ name: 'test' }, schema).valid).toBe(true);
      expect(validatePluginConfig({ name: 123 }, schema).valid).toBe(false);
    });

    it('validates number type', () => {
      const schema: PluginConfigSchema = {
        port: { type: 'number', required: true },
      };

      expect(validatePluginConfig({ port: 8080 }, schema).valid).toBe(true);
      expect(validatePluginConfig({ port: '8080' }, schema).valid).toBe(false);
      expect(validatePluginConfig({ port: NaN }, schema).valid).toBe(false);
    });

    it('validates boolean type', () => {
      const schema: PluginConfigSchema = {
        enabled: { type: 'boolean', required: true },
      };

      expect(validatePluginConfig({ enabled: true }, schema).valid).toBe(true);
      expect(validatePluginConfig({ enabled: 'true' }, schema).valid).toBe(false);
    });

    it('validates enum values', () => {
      const schema: PluginConfigSchema = {
        mode: { type: 'string', required: true, enum: ['debug', 'release', 'test'] },
      };

      expect(validatePluginConfig({ mode: 'debug' }, schema).valid).toBe(true);
      expect(validatePluginConfig({ mode: 'production' }, schema).valid).toBe(false);
    });

    it('validates nested object properties', () => {
      const schema: PluginConfigSchema = {
        server: {
          type: 'object',
          required: true,
          properties: {
            host: { type: 'string', required: true },
            port: { type: 'number', required: true },
          },
        },
      };

      expect(
        validatePluginConfig({ server: { host: 'localhost', port: 3000 } }, schema).valid,
      ).toBe(true);
      expect(validatePluginConfig({ server: { host: 'localhost' } }, schema).valid).toBe(false);
    });

    it('detects unknown properties', () => {
      const schema: PluginConfigSchema = {
        name: { type: 'string' },
      };
      const config = { name: 'test', unknown: 'value' };

      const result = validatePluginConfig(config, schema);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]?.message).toContain('Unknown configuration property');
    });

    it('validates array items', () => {
      const schema: PluginConfigSchema = {
        tags: { type: 'array', items: { type: 'string' } },
      };

      expect(validatePluginConfig({ tags: ['a', 'b'] }, schema).valid).toBe(true);
      expect(validatePluginConfig({ tags: ['a', 123] }, schema).valid).toBe(false);
    });

    it('skips validation for optional undefined fields', () => {
      const schema: PluginConfigSchema = {
        optional: { type: 'string' },
      };

      expect(validatePluginConfig({}, schema).valid).toBe(true);
    });
  });

  describe('applyDefaults', () => {
    it('applies default values', () => {
      const schema: PluginConfigSchema = {
        name: { type: 'string', default: 'default-name' },
        port: { type: 'number', default: 3000 },
      };
      const config = {};

      const result = applyDefaults(config, schema);

      expect(result.name).toBe('default-name');
      expect(result.port).toBe(3000);
    });

    it('does not override existing values', () => {
      const schema: PluginConfigSchema = {
        name: { type: 'string', default: 'default-name' },
      };
      const config = { name: 'custom-name' };

      const result = applyDefaults(config, schema);

      expect(result.name).toBe('custom-name');
    });

    it('handles empty schema', () => {
      const result = applyDefaults({}, {});
      expect(result).toEqual({});
    });
  });
});
