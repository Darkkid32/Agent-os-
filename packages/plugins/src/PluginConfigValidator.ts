/**
 * Plugin Configuration Validation.
 *
 * Validates plugin configuration against declared schemas. Supports
 * required fields, type validation, enum validation, and unknown
 * property detection.
 *
 * Layer: 2 (Platform)
 * Dependencies: types
 */

import type {
  PluginConfigSchema,
  PluginConfigFieldSchema,
  PluginConfigValidationResult,
  PluginConfigValidationError,
} from './types.js';

const validateField = (
  schema: PluginConfigFieldSchema,
  value: unknown,
  path: string,
): PluginConfigValidationError[] => {
  const errors: PluginConfigValidationError[] = [];

  if (value === undefined || value === null) {
    if (schema.required) {
      errors.push({ path, message: `Required field "${path}" is missing` });
    }
    return errors;
  }

  // Type validation
  switch (schema.type) {
    case 'string':
      if (typeof value !== 'string') {
        errors.push({ path, message: `Expected string, got ${typeof value}` });
      }
      break;
    case 'number':
      if (typeof value !== 'number' || Number.isNaN(value)) {
        errors.push({ path, message: `Expected number, got ${typeof value}` });
      }
      break;
    case 'boolean':
      if (typeof value !== 'boolean') {
        errors.push({ path, message: `Expected boolean, got ${typeof value}` });
      }
      break;
    case 'object':
      if (typeof value !== 'object' || Array.isArray(value)) {
        errors.push({
          path,
          message: `Expected object, got ${Array.isArray(value) ? 'array' : typeof value}`,
        });
      } else if (schema.properties != null) {
        const obj = value as Record<string, unknown>;
        for (const [key, propSchema] of Object.entries(schema.properties)) {
          errors.push(...validateField(propSchema, obj[key], path ? `${path}.${key}` : key));
        }
        // Unknown property detection
        for (const key of Object.keys(obj)) {
          if (!(key in schema.properties)) {
            errors.push({
              path: path ? `${path}.${key}` : key,
              message: `Unknown property "${key}"`,
            });
          }
        }
      }
      break;
    case 'array':
      if (!Array.isArray(value)) {
        errors.push({ path, message: `Expected array, got ${typeof value}` });
      } else if (schema.items != null) {
        for (let i = 0; i < value.length; i++) {
          errors.push(...validateField(schema.items, value[i], `${path}[${i}]`));
        }
      }
      break;
  }

  // Enum validation
  if (schema.enum != null && !schema.enum.includes(value)) {
    errors.push({
      path,
      message: `Value "${String(value)}" is not one of: ${schema.enum.map((v) => String(v)).join(', ')}`,
    });
  }

  return errors;
};

export const validatePluginConfig = (
  config: Record<string, unknown>,
  schema: PluginConfigSchema,
): PluginConfigValidationResult => {
  const errors: PluginConfigValidationError[] = [];

  for (const [key, fieldSchema] of Object.entries(schema)) {
    errors.push(...validateField(fieldSchema, config[key], key));
  }

  // Unknown top-level property detection
  for (const key of Object.keys(config)) {
    if (!(key in schema)) {
      errors.push({ path: key, message: `Unknown configuration property "${key}"` });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

export const applyDefaults = (
  config: Record<string, unknown>,
  schema: PluginConfigSchema,
): Record<string, unknown> => {
  const result = { ...config };

  for (const [key, fieldSchema] of Object.entries(schema)) {
    if (result[key] === undefined && fieldSchema.default !== undefined) {
      result[key] = fieldSchema.default;
    }
  }

  return result;
};
