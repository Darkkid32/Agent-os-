/**
 * ConfigValidator — validates configuration data against a ConfigSchema.
 *
 * Produces structured ValidationError arrays with dot-notation paths.
 * Supports all field types: string, number, boolean, array, object, enum.
 */

import type {
  ConfigSchema,
  ConfigValidator as IConfigValidator,
  FieldSchema,
  ValidationError,
} from './types.js';

const validator: IConfigValidator = {
  validate(data, schema) {
    const errors: ValidationError[] = [];
    validateObject(data, schema, '', errors);
    return { ok: errors.length === 0, errors };
  },
};

function validateObject(
  data: Readonly<Record<string, unknown>>,
  schema: ConfigSchema,
  basePath: string,
  errors: ValidationError[],
): void {
  for (const [key, fieldSchema] of Object.entries(schema)) {
    const path = basePath ? `${basePath}.${key}` : key;
    const value = data[key];

    if (value === undefined || value === null) {
      if (fieldSchema.required) {
        errors.push({ path, message: `Missing required field "${key}"`, code: 'REQUIRED' });
      }
      continue;
    }

    validateField(value, fieldSchema, path, errors);
  }
}

function validateField(
  value: unknown,
  schema: FieldSchema,
  path: string,
  errors: ValidationError[],
): void {
  switch (schema.type) {
    case 'string':
      validateString(value, schema, path, errors);
      break;
    case 'number':
      validateNumber(value, schema, path, errors);
      break;
    case 'boolean':
      validateBoolean(value, path, errors);
      break;
    case 'array':
      validateArray(value, schema, path, errors);
      break;
    case 'object':
      validateObjectField(value, schema, path, errors);
      break;
    case 'enum':
      validateEnum(value, schema, path, errors);
      break;
  }
}

function validateString(
  value: unknown,
  schema: { readonly minLength?: number; readonly maxLength?: number; readonly pattern?: string },
  path: string,
  errors: ValidationError[],
): void {
  if (typeof value !== 'string') {
    errors.push({ path, message: `Expected string, got ${typeName(value)}`, code: 'TYPE' });
    return;
  }
  if (schema.minLength !== undefined && value.length < schema.minLength) {
    errors.push({
      path,
      message: `String too short (min ${schema.minLength}, got ${value.length})`,
      code: 'MIN_LENGTH',
    });
  }
  if (schema.maxLength !== undefined && value.length > schema.maxLength) {
    errors.push({
      path,
      message: `String too long (max ${schema.maxLength}, got ${value.length})`,
      code: 'MAX_LENGTH',
    });
  }
  if (schema.pattern !== undefined && !new RegExp(schema.pattern).test(value)) {
    errors.push({
      path,
      message: `String does not match pattern "${schema.pattern}"`,
      code: 'PATTERN',
    });
  }
}

function validateNumber(
  value: unknown,
  schema: { readonly min?: number; readonly max?: number; readonly integer?: boolean },
  path: string,
  errors: ValidationError[],
): void {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    errors.push({ path, message: `Expected number, got ${typeName(value)}`, code: 'TYPE' });
    return;
  }
  if (schema.integer !== undefined && schema.integer && !Number.isInteger(value)) {
    errors.push({ path, message: `Expected integer, got ${value}`, code: 'INTEGER' });
  }
  if (schema.min !== undefined && value < schema.min) {
    errors.push({
      path,
      message: `Value too small (min ${schema.min}, got ${value})`,
      code: 'MIN',
    });
  }
  if (schema.max !== undefined && value > schema.max) {
    errors.push({
      path,
      message: `Value too large (max ${schema.max}, got ${value})`,
      code: 'MAX',
    });
  }
}

function validateBoolean(value: unknown, path: string, errors: ValidationError[]): void {
  if (typeof value !== 'boolean') {
    errors.push({ path, message: `Expected boolean, got ${typeName(value)}`, code: 'TYPE' });
  }
}

function validateArray(
  value: unknown,
  schema: {
    readonly items?: FieldSchema;
    readonly minItems?: number;
    readonly maxItems?: number;
  },
  path: string,
  errors: ValidationError[],
): void {
  if (!Array.isArray(value)) {
    errors.push({ path, message: `Expected array, got ${typeName(value)}`, code: 'TYPE' });
    return;
  }
  if (schema.minItems !== undefined && value.length < schema.minItems) {
    errors.push({
      path,
      message: `Array too short (min ${schema.minItems}, got ${value.length})`,
      code: 'MIN_ITEMS',
    });
  }
  if (schema.maxItems !== undefined && value.length > schema.maxItems) {
    errors.push({
      path,
      message: `Array too long (max ${schema.maxItems}, got ${value.length})`,
      code: 'MAX_ITEMS',
    });
  }
  if (schema.items !== undefined) {
    for (let i = 0; i < value.length; i++) {
      const item: unknown = value[i];
      if (item !== undefined) {
        validateField(item, schema.items, `${path}[${i}]`, errors);
      }
    }
  }
}

function validateObjectField(
  value: unknown,
  schema: {
    readonly properties?: Readonly<Record<string, FieldSchema>>;
    readonly additionalProperties?: boolean;
  },
  path: string,
  errors: ValidationError[],
): void {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    errors.push({ path, message: `Expected object, got ${typeName(value)}`, code: 'TYPE' });
    return;
  }
  if (schema.properties !== undefined) {
    validateObject(value as Readonly<Record<string, unknown>>, schema.properties, path, errors);
  }
  if (schema.additionalProperties === false) {
    const allowed = new Set(Object.keys(schema.properties ?? {}));
    for (const key of Object.keys(value)) {
      if (!allowed.has(key)) {
        errors.push({
          path: `${path}.${key}`,
          message: `Unexpected property "${key}"`,
          code: 'ADDITIONAL_PROPERTIES',
        });
      }
    }
  }
}

function validateEnum(
  value: unknown,
  schema: { readonly values: readonly (string | number)[] },
  path: string,
  errors: ValidationError[],
): void {
  if (typeof value !== 'string' && typeof value !== 'number') {
    errors.push({ path, message: `Expected enum value, got ${typeName(value)}`, code: 'TYPE' });
    return;
  }
  if (!schema.values.includes(value)) {
    errors.push({
      path,
      message: `Invalid enum value "${String(value)}". Allowed: ${schema.values.map((v) => String(v)).join(', ')}`,
      code: 'ENUM',
    });
  }
}

function typeName(value: unknown): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (Array.isArray(value)) return 'array';
  return typeof value;
}

export { validator };
