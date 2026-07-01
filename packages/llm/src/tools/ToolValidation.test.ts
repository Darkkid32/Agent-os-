/**
 * Tests for tool validation functions.
 */
import { describe, it, expect } from 'vitest';
import {
  validateRequired,
  validateTypes,
  validateUnknown,
  validatePluginAvailable,
  validateEnabled,
  validateToolCall,
} from './ToolValidation.js';
import type { ToolDefinition, ToolCall } from './types.js';
import { DefaultToolRegistry } from './ToolRegistry.js';

const baseTool: ToolDefinition = {
  id: 'test-tool',
  name: 'Test Tool',
  description: 'A test tool',
  pluginId: 'test-plugin',
  enabled: true,
  parameters: {
    required: [
      { name: 'query', type: 'string', required: true },
      { name: 'count', type: 'number', required: true },
    ],
    optional: [{ name: 'format', type: 'string', required: false }],
  },
  permissions: [],
};

const makeCall = (toolId: string, args: Record<string, unknown> = {}): ToolCall => ({
  id: `call-${Date.now()}`,
  toolId,
  arguments: args,
});

describe('validateRequired', () => {
  it('returns empty array when all required params present', () => {
    const errors = validateRequired(baseTool, { query: 'hello', count: 5 });
    expect(errors).toEqual([]);
  });

  it('returns errors for missing required params', () => {
    const errors = validateRequired(baseTool, { query: 'hello' });
    expect(errors).toEqual(['Missing required parameter: count']);
  });

  it('returns errors for multiple missing params', () => {
    const errors = validateRequired(baseTool, {});
    expect(errors).toHaveLength(2);
    expect(errors[0]).toContain('query');
    expect(errors[1]).toContain('count');
  });

  it('returns empty array when no required params', () => {
    const noReq: ToolDefinition = { ...baseTool, parameters: { required: [], optional: [] } };
    const errors = validateRequired(noReq, { anything: 'goes' });
    expect(errors).toEqual([]);
  });
});

describe('validateTypes', () => {
  it('returns empty array for correct types', () => {
    const errors = validateTypes(baseTool, { query: 'hello', count: 42 });
    expect(errors).toEqual([]);
  });

  it('returns error for wrong type', () => {
    const errors = validateTypes(baseTool, { query: 123, count: 42 });
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('query');
    expect(errors[0]).toContain('string');
  });

  it('skips undefined/null values', () => {
    const errors = validateTypes(baseTool, { query: 'hello', count: 42, format: undefined });
    expect(errors).toEqual([]);
  });

  it('validates boolean type', () => {
    const boolTool: ToolDefinition = {
      ...baseTool,
      parameters: { required: [{ name: 'flag', type: 'boolean', required: true }], optional: [] },
    };
    expect(validateTypes(boolTool, { flag: true })).toEqual([]);
    expect(validateTypes(boolTool, { flag: 'yes' })).toHaveLength(1);
  });

  it('validates array type', () => {
    const arrTool: ToolDefinition = {
      ...baseTool,
      parameters: { required: [{ name: 'items', type: 'array', required: true }], optional: [] },
    };
    expect(validateTypes(arrTool, { items: [1, 2] })).toEqual([]);
    expect(validateTypes(arrTool, { items: 'not-array' })).toHaveLength(1);
  });

  it('validates object type', () => {
    const objTool: ToolDefinition = {
      ...baseTool,
      parameters: {
        required: [{ name: 'meta', type: 'object', required: true }],
        optional: [],
      },
    };
    expect(validateTypes(objTool, { meta: { key: 'val' } })).toEqual([]);
    expect(validateTypes(objTool, { meta: 'not-obj' })).toHaveLength(1);
    expect(validateTypes(objTool, { meta: [1, 2] })).toHaveLength(1);
  });
});

describe('validateUnknown', () => {
  it('returns empty array for known params', () => {
    const errors = validateUnknown(baseTool, { query: 'hello', count: 5 });
    expect(errors).toEqual([]);
  });

  it('returns error for unknown param', () => {
    const errors = validateUnknown(baseTool, { query: 'hello', extra: true });
    expect(errors).toEqual(['Unknown parameter: extra']);
  });

  it('returns multiple errors for multiple unknowns', () => {
    const errors = validateUnknown(baseTool, { foo: 1, bar: 2 });
    expect(errors).toHaveLength(2);
  });
});

describe('validatePluginAvailable', () => {
  it('returns empty when plugin available', () => {
    const errors = validatePluginAvailable(baseTool, new Set(['test-plugin']));
    expect(errors).toEqual([]);
  });

  it('returns error when plugin missing', () => {
    const errors = validatePluginAvailable(baseTool, new Set(['other-plugin']));
    expect(errors).toEqual(['Plugin "test-plugin" is not available']);
  });
});

describe('validateEnabled', () => {
  it('returns empty when enabled', () => {
    const errors = validateEnabled(baseTool);
    expect(errors).toEqual([]);
  });

  it('returns error when disabled', () => {
    const disabled = { ...baseTool, enabled: false };
    const errors = validateEnabled(disabled);
    expect(errors).toEqual(['Tool "test-tool" is disabled']);
  });
});

describe('validateToolCall', () => {
  const setupRegistry = (): DefaultToolRegistry => {
    const r = new DefaultToolRegistry();
    r.register(baseTool, async () => 'ok');
    return r;
  };

  it('returns valid for correct call', () => {
    const r = setupRegistry();
    const call = makeCall('test-tool', { query: 'hi', count: 1 });
    const result = validateToolCall(r, call, new Set(['test-plugin']));
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('returns invalid for missing tool', () => {
    const r = setupRegistry();
    const call = makeCall('nonexistent');
    const result = validateToolCall(r, call, new Set(['test-plugin']));
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('nonexistent');
  });

  it('returns invalid for disabled tool', () => {
    const r = new DefaultToolRegistry();
    r.register({ ...baseTool, enabled: false }, async () => 'ok');
    const call = makeCall('test-tool', { query: 'hi', count: 1 });
    const result = validateToolCall(r, call, new Set(['test-plugin']));
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('disabled');
  });

  it('returns invalid for unavailable plugin', () => {
    const r = setupRegistry();
    const call = makeCall('test-tool', { query: 'hi', count: 1 });
    const result = validateToolCall(r, call, new Set(['other-plugin']));
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('not available');
  });

  it('returns invalid for missing required params', () => {
    const r = setupRegistry();
    const call = makeCall('test-tool', { query: 'hi' });
    const result = validateToolCall(r, call, new Set(['test-plugin']));
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('count'))).toBe(true);
  });

  it('returns invalid for unknown params', () => {
    const r = setupRegistry();
    const call = makeCall('test-tool', { query: 'hi', count: 1, extra: true });
    const result = validateToolCall(r, call, new Set(['test-plugin']));
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('Unknown parameter'))).toBe(true);
  });

  it('collects multiple errors', () => {
    const r = setupRegistry();
    const call = makeCall('test-tool', { extra: true });
    const result = validateToolCall(r, call, new Set(['test-plugin']));
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(2);
  });
});
