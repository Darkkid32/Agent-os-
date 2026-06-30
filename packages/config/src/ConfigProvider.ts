/**
 * ConfigProvider — typed, validated configuration access backed by merged sources.
 *
 * Construct with a name, schema, and config sources. The provider loads and
 * validates at construction time. Invalid required fields cause a descriptive
 * startup error.
 */

import type {
  ConfigProvider as IConfigProvider,
  ConfigSchema,
  ConfigSource,
  ValidationResult,
} from './types.js';
import { validator } from './ConfigValidator.js';
import { loader } from './ConfigLoader.js';

function createConfigProvider(
  name: string,
  schema: ConfigSchema,
  sources: readonly ConfigSource[],
): IConfigProvider {
  const merged = loader.load(sources);

  // Apply schema defaults for missing keys
  const withDefaults = applySchemaDefaults(merged, schema);

  // Validate
  const result = validator.validate(withDefaults, schema);
  if (!result.ok) {
    const details = result.errors.map((e) => `  ${e.path}: ${e.message}`).join('\n');
    throw new Error(`Configuration validation failed for "${name}":\n${details}`);
  }

  return {
    name,

    get(key: string): unknown {
      return withDefaults[key];
    },

    getTyped<T>(key: string): T {
      const value = withDefaults[key];
      if (value === undefined) {
        throw new Error(`Config key "${key}" not found in "${name}"`);
      }
      return value as T;
    },

    has(key: string): boolean {
      return key in withDefaults;
    },

    keys(): readonly string[] {
      return Object.keys(withDefaults);
    },

    all(): Readonly<Record<string, unknown>> {
      return withDefaults;
    },

    validate(altSchema: ConfigSchema): ValidationResult {
      return validator.validate(withDefaults, altSchema);
    },
  };
}

function applySchemaDefaults(
  data: Readonly<Record<string, unknown>>,
  schema: ConfigSchema,
): Record<string, unknown> {
  const result: Record<string, unknown> = { ...data };
  for (const [key, fieldSchema] of Object.entries(schema)) {
    if (result[key] === undefined && fieldSchema.default !== undefined) {
      result[key] = fieldSchema.default;
    }
  }
  return result;
}

export { createConfigProvider };
