/**
 * @agent-os/config — Centralized configuration and secrets management for Agent OS.
 * @packageDocumentation
 */

// Types
export type {
  FieldType,
  FieldSchema,
  StringFieldSchema,
  NumberFieldSchema,
  BooleanFieldSchema,
  ArrayFieldSchema,
  ObjectFieldSchema,
  EnumFieldSchema,
  ConfigSchema,
  ValidationError,
  ValidationResult,
  ConfigSource,
  ConfigEntry,
  ConfigProvider,
  ConfigLoader,
  ConfigValidator,
  ConfigRegistry,
} from './types.js';

// SecretValue — opaque wrapper for sensitive values
export { SecretValue } from './types.js';

// ConfigValidator
export { validator } from './ConfigValidator.js';

// ConfigLoader
export { loader } from './ConfigLoader.js';

// ConfigRegistry
export { createConfigRegistry } from './ConfigRegistry.js';

// ConfigProvider
export { createConfigProvider } from './ConfigProvider.js';
