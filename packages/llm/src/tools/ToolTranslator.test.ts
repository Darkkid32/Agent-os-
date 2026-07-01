/**
 * Tests for tool definition translators.
 */
import { describe, it, expect } from 'vitest';
import { toOpenAITool, toAnthropicTool, toGeminiTool, translateTools } from './ToolTranslator.js';
import type { ToolDefinition } from './types.js';

const simpleTool: ToolDefinition = {
  id: 'search',
  name: 'Search',
  description: 'Search the web',
  pluginId: 'web',
  enabled: true,
  parameters: {
    required: [{ name: 'query', type: 'string', required: true, description: 'The search query' }],
    optional: [{ name: 'limit', type: 'number', required: false, description: 'Max results' }],
  },
  permissions: [],
};

const enumTool: ToolDefinition = {
  id: 'sort',
  name: 'Sort',
  description: 'Sort items',
  pluginId: 'util',
  enabled: true,
  parameters: {
    required: [
      {
        name: 'order',
        type: 'string',
        required: true,
        enum: ['asc', 'desc'],
      },
    ],
    optional: [],
  },
  permissions: [],
};

const noParamsTool: ToolDefinition = {
  id: 'ping',
  name: 'Ping',
  description: 'Ping server',
  pluginId: 'net',
  enabled: true,
  parameters: { required: [], optional: [] },
  permissions: [],
};

describe('toOpenAITool', () => {
  it('converts a tool with params to OpenAI function format', () => {
    const result = toOpenAITool(simpleTool);
    expect(result).toEqual({
      type: 'function',
      function: {
        name: 'search',
        description: 'Search the web',
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'The search query' },
            limit: { type: 'number', description: 'Max results' },
          },
          required: ['query'],
        },
      },
    });
  });

  it('includes enum in OpenAI format', () => {
    const result = toOpenAITool(enumTool);
    expect(result.function.parameters).toEqual(
      expect.objectContaining({
        properties: expect.objectContaining({
          order: expect.objectContaining({ enum: ['asc', 'desc'] }),
        }),
        required: ['order'],
      }),
    );
  });

  it('omits required field when no required params', () => {
    const result = toOpenAITool(noParamsTool);
    expect(result.function.parameters).toEqual({
      type: 'object',
      properties: {},
    });
  });
});

describe('toAnthropicTool', () => {
  it('converts a tool with params to Anthropic format', () => {
    const result = toAnthropicTool(simpleTool);
    expect(result.type).toBe('function');
    expect(result.function.name).toBe('search');
    expect(result.function.description).toBe('Search the web');
    expect(result.function.parameters).toEqual(
      expect.objectContaining({
        type: 'object',
        properties: expect.objectContaining({
          query: { type: 'string', description: 'The search query' },
        }),
      }),
    );
  });
});

describe('toGeminiTool', () => {
  it('converts a tool with params to Gemini format', () => {
    const result = toGeminiTool(simpleTool);
    expect(result.type).toBe('function');
    expect(result.function.name).toBe('search');
    expect(result.function.parameters).toEqual(
      expect.objectContaining({
        type: 'OBJECT',
        properties: expect.arrayContaining([
          expect.objectContaining({ name: 'query', type: 'STRING' }),
          expect.objectContaining({ name: 'limit', type: 'NUMBER' }),
        ]),
      }),
    );
  });

  it('maps boolean type correctly', () => {
    const boolTool: ToolDefinition = {
      ...simpleTool,
      parameters: {
        required: [{ name: 'flag', type: 'boolean', required: true }],
        optional: [],
      },
    };
    const result = toGeminiTool(boolTool);
    const props = (result.function.parameters as Record<string, unknown>).properties as Array<
      Record<string, unknown>
    >;
    expect(props[0]?.type).toBe('BOOLEAN');
  });

  it('maps array type correctly', () => {
    const arrTool: ToolDefinition = {
      ...simpleTool,
      parameters: {
        required: [{ name: 'items', type: 'array', required: true }],
        optional: [],
      },
    };
    const result = toGeminiTool(arrTool);
    const props = (result.function.parameters as Record<string, unknown>).properties as Array<
      Record<string, unknown>
    >;
    expect(props[0]?.type).toBe('ARRAY');
  });

  it('maps object type correctly', () => {
    const objTool: ToolDefinition = {
      ...simpleTool,
      parameters: {
        required: [{ name: 'meta', type: 'object', required: true }],
        optional: [],
      },
    };
    const result = toGeminiTool(objTool);
    const props = (result.function.parameters as Record<string, unknown>).properties as Array<
      Record<string, unknown>
    >;
    expect(props[0]?.type).toBe('OBJECT');
  });
});

describe('translateTools', () => {
  it('translates multiple tools to openai format', () => {
    const results = translateTools([simpleTool, enumTool], 'openai');
    expect(results).toHaveLength(2);
    expect(results[0]?.function.name).toBe('search');
    expect(results[1]?.function.name).toBe('sort');
  });

  it('translates multiple tools to anthropic format', () => {
    const results = translateTools([simpleTool], 'anthropic');
    expect(results).toHaveLength(1);
    expect(results[0]?.function.name).toBe('search');
  });

  it('translates multiple tools to gemini format', () => {
    const results = translateTools([simpleTool], 'gemini');
    expect(results).toHaveLength(1);
    expect(results[0]?.function.name).toBe('search');
  });

  it('returns empty array for empty input', () => {
    expect(translateTools([], 'openai')).toEqual([]);
  });
});
