import { describe, it, expect } from 'vitest';
import { validator } from './ConfigValidator.js';
import type { ConfigSchema } from './types.js';

describe('ConfigValidator', () => {
  describe('string fields', () => {
    const schema: ConfigSchema = {
      tag: { type: 'string', minLength: 2, maxLength: 10 },
      email: { type: 'string', pattern: '^.+@.+\\..+$' },
    };

    it('accepts valid string', () => {
      const result = validator.validate({ tag: 'hello' }, schema);
      expect(result.ok).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('rejects missing required string', () => {
      const s: ConfigSchema = { name: { type: 'string', required: true } };
      const result = validator.validate({}, s);
      expect(result.ok).toBe(false);
      expect(result.errors[0]!.code).toBe('REQUIRED');
    });

    it('rejects wrong type', () => {
      const s: ConfigSchema = { name: { type: 'string', required: true } };
      const result = validator.validate({ name: 123 }, s);
      expect(result.ok).toBe(false);
      expect(result.errors[0]!.code).toBe('TYPE');
    });

    it('rejects string too short', () => {
      const result = validator.validate({ tag: 'a' }, schema);
      expect(result.ok).toBe(false);
      expect(result.errors[0]!.code).toBe('MIN_LENGTH');
    });

    it('rejects string too long', () => {
      const result = validator.validate({ tag: 'a'.repeat(11) }, schema);
      expect(result.ok).toBe(false);
      expect(result.errors[0]!.code).toBe('MAX_LENGTH');
    });

    it('rejects string not matching pattern', () => {
      const result = validator.validate({ email: 'not-an-email' }, schema);
      expect(result.ok).toBe(false);
      expect(result.errors[0]!.code).toBe('PATTERN');
    });

    it('accepts string matching pattern', () => {
      const result = validator.validate({ email: 'user@example.com' }, schema);
      expect(result.ok).toBe(true);
    });
  });

  describe('number fields', () => {
    const schema: ConfigSchema = {
      port: { type: 'number', required: true, min: 1, max: 65535 },
      count: { type: 'number', integer: true },
    };

    it('accepts valid number', () => {
      const result = validator.validate({ port: 3000 }, schema);
      expect(result.ok).toBe(true);
    });

    it('rejects missing required number', () => {
      const result = validator.validate({}, schema);
      expect(result.ok).toBe(false);
      expect(result.errors[0]!.code).toBe('REQUIRED');
    });

    it('rejects number below min', () => {
      const result = validator.validate({ port: 0 }, schema);
      expect(result.ok).toBe(false);
      expect(result.errors[0]!.code).toBe('MIN');
    });

    it('rejects number above max', () => {
      const result = validator.validate({ port: 70000 }, schema);
      expect(result.ok).toBe(false);
      expect(result.errors[0]!.code).toBe('MAX');
    });

    it('rejects non-integer when integer required', () => {
      const result = validator.validate({ port: 3000, count: 1.5 }, schema);
      expect(result.ok).toBe(false);
      expect(result.errors[0]!.code).toBe('INTEGER');
    });

    it('rejects NaN', () => {
      const result = validator.validate({ port: NaN }, schema);
      expect(result.ok).toBe(false);
      expect(result.errors[0]!.code).toBe('TYPE');
    });
  });

  describe('boolean fields', () => {
    const schema: ConfigSchema = {
      debug: { type: 'boolean' },
    };

    it('accepts boolean true', () => {
      const result = validator.validate({ debug: true }, schema);
      expect(result.ok).toBe(true);
    });

    it('accepts boolean false', () => {
      const result = validator.validate({ debug: false }, schema);
      expect(result.ok).toBe(true);
    });

    it('rejects non-boolean', () => {
      const result = validator.validate({ debug: 'yes' }, schema);
      expect(result.ok).toBe(false);
      expect(result.errors[0]!.code).toBe('TYPE');
    });
  });

  describe('array fields', () => {
    const schema: ConfigSchema = {
      tags: { type: 'array', items: { type: 'string' }, minItems: 1, maxItems: 3 },
    };

    it('accepts valid array', () => {
      const result = validator.validate({ tags: ['a', 'b'] }, schema);
      expect(result.ok).toBe(true);
    });

    it('rejects non-array', () => {
      const result = validator.validate({ tags: 'not-array' }, schema);
      expect(result.ok).toBe(false);
      expect(result.errors[0]!.code).toBe('TYPE');
    });

    it('rejects array too short', () => {
      const result = validator.validate({ tags: [] }, schema);
      expect(result.ok).toBe(false);
      expect(result.errors[0]!.code).toBe('MIN_ITEMS');
    });

    it('rejects array too long', () => {
      const result = validator.validate({ tags: ['a', 'b', 'c', 'd'] }, schema);
      expect(result.ok).toBe(false);
      expect(result.errors[0]!.code).toBe('MAX_ITEMS');
    });

    it('validates array items', () => {
      const result = validator.validate({ tags: [123] }, schema);
      expect(result.ok).toBe(false);
      expect(result.errors[0]!.code).toBe('TYPE');
    });
  });

  describe('object fields', () => {
    const schema: ConfigSchema = {
      nested: {
        type: 'object',
        properties: {
          key: { type: 'string', required: true },
        },
      },
    };

    it('accepts valid object', () => {
      const result = validator.validate({ nested: { key: 'value' } }, schema);
      expect(result.ok).toBe(true);
    });

    it('rejects non-object', () => {
      const result = validator.validate({ nested: 'string' }, schema);
      expect(result.ok).toBe(false);
      expect(result.errors[0]!.code).toBe('TYPE');
    });

    it('rejects missing required nested field', () => {
      const result = validator.validate({ nested: {} }, schema);
      expect(result.ok).toBe(false);
      expect(result.errors[0]!.code).toBe('REQUIRED');
    });
  });

  describe('enum fields', () => {
    const schema: ConfigSchema = {
      level: { type: 'enum', values: ['debug', 'info', 'warn', 'error'] },
    };

    it('accepts valid enum value', () => {
      const result = validator.validate({ level: 'info' }, schema);
      expect(result.ok).toBe(true);
    });

    it('rejects invalid enum value', () => {
      const result = validator.validate({ level: 'verbose' }, schema);
      expect(result.ok).toBe(false);
      expect(result.errors[0]!.code).toBe('ENUM');
    });

    it('accepts numeric enum values', () => {
      const schema2: ConfigSchema = {
        mode: { type: 'enum', values: [0, 1, 2] },
      };
      const result = validator.validate({ mode: 1 }, schema2);
      expect(result.ok).toBe(true);
    });
  });

  describe('empty data', () => {
    it('passes when no required fields', () => {
      const schema: ConfigSchema = { name: { type: 'string' } };
      const result = validator.validate({}, schema);
      expect(result.ok).toBe(true);
    });
  });
});
