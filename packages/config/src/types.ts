/**
 * Configuration schema types, field definitions, and the SecretValue abstraction.
 *
 * ConfigSchema defines the shape of valid configuration. Each field has a type,
 * optional default, and optional validation constraints. The schema drives both
 * validation and documentation generation.
 */

// ---------------------------------------------------------------------------
// Schema field types
// ---------------------------------------------------------------------------

export type FieldType = 'string' | 'number' | 'boolean' | 'array' | 'object' | 'enum';

export interface BaseFieldSchema {
  readonly required?: boolean;
  readonly default?: unknown;
  readonly description?: string;
}

export interface StringFieldSchema extends BaseFieldSchema {
  readonly type: 'string';
  readonly minLength?: number;
  readonly maxLength?: number;
  readonly pattern?: string;
}

export interface NumberFieldSchema extends BaseFieldSchema {
  readonly type: 'number';
  readonly min?: number;
  readonly max?: number;
  readonly integer?: boolean;
}

export interface BooleanFieldSchema extends BaseFieldSchema {
  readonly type: 'boolean';
}

export interface ArrayFieldSchema extends BaseFieldSchema {
  readonly type: 'array';
  readonly items?: FieldSchema;
  readonly minItems?: number;
  readonly maxItems?: number;
}

export interface ObjectFieldSchema extends BaseFieldSchema {
  readonly type: 'object';
  readonly properties?: Readonly<Record<string, FieldSchema>>;
  readonly additionalProperties?: boolean;
}

export interface EnumFieldSchema extends BaseFieldSchema {
  readonly type: 'enum';
  readonly values: readonly (string | number)[];
}

export type FieldSchema =
  | StringFieldSchema
  | NumberFieldSchema
  | BooleanFieldSchema
  | ArrayFieldSchema
  | ObjectFieldSchema
  | EnumFieldSchema;

export interface ConfigSchema {
  readonly [key: string]: FieldSchema;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export interface ValidationError {
  readonly path: string;
  readonly message: string;
  readonly code: string;
}

export interface ValidationResult {
  readonly ok: boolean;
  readonly errors: readonly ValidationError[];
}

// ---------------------------------------------------------------------------
// Config sources (priority low → high)
// ---------------------------------------------------------------------------

export type ConfigSource =
  | { readonly kind: 'defaults'; readonly values: Readonly<Record<string, unknown>> }
  | {
      readonly kind: 'file';
      readonly path: string;
      readonly values: Readonly<Record<string, unknown>>;
    }
  | {
      readonly kind: 'env';
      readonly prefix?: string;
      readonly values: Readonly<Record<string, string>>;
    }
  | { readonly kind: 'runtime'; readonly values: Readonly<Record<string, unknown>> };

// ---------------------------------------------------------------------------
// Config entry metadata
// ---------------------------------------------------------------------------

export interface ConfigEntry {
  readonly key: string;
  readonly value: unknown;
  readonly source: ConfigSource['kind'];
}

// ---------------------------------------------------------------------------
// SecretValue — opaque wrapper that prevents accidental leakage
// ---------------------------------------------------------------------------

const MASKED = '********';

export class SecretValue {
  private readonly _value: string;
  private readonly _hint: string;

  private constructor(value: string, hint: string) {
    this._value = value;
    this._hint = hint;
  }

  static of(value: string, hint?: string): SecretValue {
    const h = hint ?? (value.length > 4 ? `${value.slice(0, 2)}${MASKED}` : MASKED);
    return new SecretValue(value, h);
  }

  /** Return the raw secret value. Use sparingly. */
  unwrap(): string {
    return this._value;
  }

  /** Masked representation safe for logging. */
  masked(): string {
    return this._hint;
  }

  /** Override default toString for implicit coercion safety. */
  toString(): string {
    return this._hint;
  }

  /** JSON serialization produces the masked form. */
  toJSON(): string {
    return this._hint;
  }
}

// ---------------------------------------------------------------------------
// Provider interfaces
// ---------------------------------------------------------------------------

export interface ConfigProvider {
  readonly name: string;
  get(key: string): unknown;
  getTyped<T>(key: string): T;
  has(key: string): boolean;
  keys(): readonly string[];
  all(): Readonly<Record<string, unknown>>;
  validate(schema: ConfigSchema): ValidationResult;
}

export interface ConfigLoader {
  load(sources: readonly ConfigSource[]): Readonly<Record<string, unknown>>;
}

export interface ConfigValidator {
  validate(data: Readonly<Record<string, unknown>>, schema: ConfigSchema): ValidationResult;
}

export interface ConfigRegistry {
  register(provider: ConfigProvider): void;
  getProvider(name: string): ConfigProvider | undefined;
  providers(): readonly ConfigProvider[];
}
