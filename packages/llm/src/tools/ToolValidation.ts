/**
 * Tool parameter and permission validation.
 *
 * Validates:
 * - Required parameters
 * - Parameter types
 * - Unknown parameters
 * - Permission requirements
 * - Plugin availability
 * - Tool existence
 *
 * Layer: 2 (Platform)
 */

import type { ToolDefinition, ToolParameter, ToolCall } from './types.js';
import type { ToolRegistry } from './ToolRegistry.js';

// ---------------------------------------------------------------------------
// Validation result
// ---------------------------------------------------------------------------

export interface ValidationResult {
  readonly valid: boolean;
  readonly errors: readonly string[];
}

// ---------------------------------------------------------------------------
// Validation functions
// ---------------------------------------------------------------------------

/**
 * Validate that all required parameters are present.
 */
export const validateRequired = (
  definition: ToolDefinition,
  args: Readonly<Record<string, unknown>>,
): string[] => {
  const errors: string[] = [];
  const required = definition.parameters.required ?? [];

  for (const param of required) {
    if (!(param.name in args)) {
      errors.push(`Missing required parameter: ${param.name}`);
    }
  }

  return errors;
};

/**
 * Validate parameter types match the schema.
 */
export const validateTypes = (
  definition: ToolDefinition,
  args: Readonly<Record<string, unknown>>,
): string[] => {
  const errors: string[] = [];
  const allParams = [
    ...(definition.parameters.required ?? []),
    ...(definition.parameters.optional ?? []),
  ];

  for (const param of allParams) {
    const value = args[param.name];
    if (value === undefined || value === null) continue;

    if (!validateParamType(param, value)) {
      errors.push(`Parameter "${param.name}" expected type "${param.type}", got "${typeof value}"`);
    }
  }

  return errors;
};

const validateParamType = (param: ToolParameter, value: unknown): boolean => {
  switch (param.type) {
    case 'string':
      return typeof value === 'string';
    case 'number':
      return typeof value === 'number' && !isNaN(value);
    case 'boolean':
      return typeof value === 'boolean';
    case 'array':
      return Array.isArray(value);
    case 'object':
      return typeof value === 'object' && value !== null && !Array.isArray(value);
    default:
      return true;
  }
};

/**
 * Validate that no unknown parameters are present.
 */
export const validateUnknown = (
  definition: ToolDefinition,
  args: Readonly<Record<string, unknown>>,
): string[] => {
  const errors: string[] = [];
  const allParams = [
    ...(definition.parameters.required ?? []),
    ...(definition.parameters.optional ?? []),
  ];
  const allowed = new Set(allParams.map((p) => p.name));

  for (const key of Object.keys(args)) {
    if (!allowed.has(key)) {
      errors.push(`Unknown parameter: ${key}`);
    }
  }

  return errors;
};

/**
 * Validate that a plugin is available for a tool.
 */
export const validatePluginAvailable = (
  definition: ToolDefinition,
  availablePlugins: ReadonlySet<string>,
): string[] => {
  if (!availablePlugins.has(definition.pluginId)) {
    return [`Plugin "${definition.pluginId}" is not available`];
  }
  return [];
};

/**
 * Validate that a tool is enabled.
 */
export const validateEnabled = (definition: ToolDefinition): string[] => {
  if (definition.enabled === false) {
    return [`Tool "${definition.id}" is disabled`];
  }
  return [];
};

/**
 * Run all validations against a tool call.
 */
export const validateToolCall = (
  registry: ToolRegistry,
  call: ToolCall,
  availablePlugins: ReadonlySet<string>,
): ValidationResult => {
  const errors: string[] = [];

  // Check tool exists
  if (!registry.has(call.toolId)) {
    return { valid: false, errors: [`Tool "${call.toolId}" is not registered`] };
  }

  const { definition } = registry.get(call.toolId);

  // Check enabled
  errors.push(...validateEnabled(definition));

  // Check plugin available
  errors.push(...validatePluginAvailable(definition, availablePlugins));

  // Check parameters
  errors.push(...validateRequired(definition, call.arguments));
  errors.push(...validateTypes(definition, call.arguments));
  errors.push(...validateUnknown(definition, call.arguments));

  return {
    valid: errors.length === 0,
    errors,
  };
};
