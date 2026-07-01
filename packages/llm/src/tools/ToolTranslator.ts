/**
 * Provider-specific tool translators.
 *
 * Translates Hermes tool definitions to provider-specific formats:
 * - OpenAI function calling
 * - Future: Anthropic tool use
 * - Future: Gemini function calling
 *
 * Hermes always works with its own internal model.
 *
 * Layer: 2 (Platform)
 */

import type { ToolDefinition, ProviderToolDefinition } from './types.js';

// ---------------------------------------------------------------------------
// OpenAI translator
// ---------------------------------------------------------------------------

/**
 * Convert a Hermes ToolDefinition to OpenAI function calling format.
 */
export const toOpenAITool = (definition: ToolDefinition): ProviderToolDefinition => ({
  type: 'function',
  function: {
    name: definition.id,
    description: definition.description,
    parameters: buildOpenAISchema(definition),
  },
});

const buildOpenAISchema = (definition: ToolDefinition): Record<string, unknown> => {
  const properties: Record<string, unknown> = {};
  const required: string[] = [];

  const allParams = [
    ...(definition.parameters.required ?? []),
    ...(definition.parameters.optional ?? []),
  ];

  for (const param of allParams) {
    properties[param.name] = {
      type: param.type,
      ...(param.description ? { description: param.description } : {}),
      ...(param.enum ? { enum: [...param.enum] } : {}),
      ...(param.items ? { items: param.items } : {}),
      ...(param.properties ? { properties: param.properties } : {}),
    };

    if (param.required) {
      required.push(param.name);
    }
  }

  return {
    type: 'object',
    properties,
    ...(required.length > 0 ? { required } : {}),
  };
};

// ---------------------------------------------------------------------------
// Anthropic translator (future)
// ---------------------------------------------------------------------------

/**
 * Convert a Hermes ToolDefinition to Anthropic tool use format.
 */
export const toAnthropicTool = (definition: ToolDefinition): ProviderToolDefinition => ({
  type: 'function',
  function: {
    name: definition.id,
    description: definition.description,
    parameters: buildAnthropicSchema(definition),
  },
});

const buildAnthropicSchema = (definition: ToolDefinition): Record<string, unknown> => {
  // Anthropic uses JSON Schema similar to OpenAI but with some differences
  const properties: Record<string, unknown> = {};
  const required: string[] = [];

  const allParams = [
    ...(definition.parameters.required ?? []),
    ...(definition.parameters.optional ?? []),
  ];

  for (const param of allParams) {
    properties[param.name] = {
      type: param.type,
      ...(param.description ? { description: param.description } : {}),
      ...(param.enum ? { enum: [...param.enum] } : {}),
    };

    if (param.required) {
      required.push(param.name);
    }
  }

  return {
    type: 'object',
    properties,
    ...(required.length > 0 ? { required } : {}),
  };
};

// ---------------------------------------------------------------------------
// Gemini translator (future)
// ---------------------------------------------------------------------------

/**
 * Convert a Hermes ToolDefinition to Gemini function calling format.
 */
export const toGeminiTool = (definition: ToolDefinition): ProviderToolDefinition => ({
  type: 'function',
  function: {
    name: definition.id,
    description: definition.description,
    parameters: buildGeminiSchema(definition),
  },
});

const buildGeminiSchema = (definition: ToolDefinition): Record<string, unknown> => {
  const properties: Array<Record<string, unknown>> = [];
  const required: string[] = [];

  const allParams = [
    ...(definition.parameters.required ?? []),
    ...(definition.parameters.optional ?? []),
  ];

  for (const param of allParams) {
    properties.push({
      name: param.name,
      type: mapGeminiType(param.type),
      ...(param.description ? { description: param.description } : {}),
      ...(param.enum ? { enum: [...param.enum] } : {}),
    });

    if (param.required) {
      required.push(param.name);
    }
  }

  return {
    type: 'OBJECT',
    properties,
    ...(required.length > 0 ? { required } : {}),
  };
};

const mapGeminiType = (type: string): string => {
  switch (type) {
    case 'string':
      return 'STRING';
    case 'number':
      return 'NUMBER';
    case 'boolean':
      return 'BOOLEAN';
    case 'array':
      return 'ARRAY';
    case 'object':
      return 'OBJECT';
    default:
      return 'STRING';
  }
};

// ---------------------------------------------------------------------------
// Batch translation
// ---------------------------------------------------------------------------

export type ProviderType = 'openai' | 'anthropic' | 'gemini';

/**
 * Translate multiple tool definitions to provider format.
 */
export const translateTools = (
  definitions: readonly ToolDefinition[],
  provider: ProviderType,
): ProviderToolDefinition[] => {
  const translator = getTranslator(provider);
  return definitions.map(translator);
};

const getTranslator = (provider: ProviderType) => {
  switch (provider) {
    case 'openai':
      return toOpenAITool;
    case 'anthropic':
      return toAnthropicTool;
    case 'gemini':
      return toGeminiTool;
    default:
      return toOpenAITool;
  }
};
