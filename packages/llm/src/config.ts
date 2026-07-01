/**
 * `@agent-os/llm` ConfigProvider schema and factory.
 *
 * This file is the single place that knows about the `provider/model/apiKey`
 * configuration shape. Every other module reads from the same `ConfigProvider`,
 * so swapping providers (mock → openai → future) is purely a config change.
 *
 * NO `process.env` access happens here. Suppliers load keys from their own
 * source stack (env, file, in-memory); this module only renders them as a
 * typed config.
 */
import {
  createConfigProvider,
  type ConfigSchema,
  type ConfigProvider,
  type ConfigSource,
  type FieldSchema,
} from '@agent-os/config';

export interface ProviderConfigEntry {
  readonly provider: string;
  readonly model: string;
  readonly apiKey?: string;
  readonly baseUrl?: string;
  readonly organization?: string;
}

export interface LLMConfigShape {
  readonly provider: string;
  readonly model: string;
  readonly temperature: number;
  readonly maxTokens?: number;
  readonly topP?: number;
  readonly timeoutMs: number;
  readonly apiKey?: string;
  readonly baseUrl?: string;
  readonly organization?: string;
  readonly defaultProvider: string;
  readonly registrations: readonly ProviderConfigEntry[];
}

const stringField = (overrides: Partial<FieldSchema> = {}): FieldSchema =>
  ({
    type: 'string',
    ...overrides,
  }) as FieldSchema;

export const llmConfigSchema: ConfigSchema = {
  provider: { type: 'string', required: true, default: 'mock' },
  model: { type: 'string', required: true, default: 'mock-model' },
  temperature: { type: 'number', required: true, default: 0.2, min: 0, max: 2 } as FieldSchema,
  maxTokens: { type: 'number', max: 32768 } as FieldSchema,
  topP: { type: 'number', min: 0, max: 1 } as FieldSchema,
  timeoutMs: {
    type: 'number',
    required: true,
    default: 30000,
    min: 1,
    integer: true,
  } as FieldSchema,
  apiKey: stringField({ description: 'Vendor API key (plain string for SDK use)' }),
  baseUrl: stringField(),
  organization: stringField(),
  defaultProvider: { type: 'string', required: true, default: 'mock' },
  registrations: { type: 'array' } as FieldSchema,
};

const parseRegistrations = (raw: unknown): readonly ProviderConfigEntry[] => {
  if (!Array.isArray(raw)) return [];
  return raw.map((entry, index) => {
    if (entry === null || typeof entry !== 'object') {
      throw new TypeError(`registrations[${index}] must be an object.`);
    }
    const obj = entry as Record<string, unknown>;
    if (typeof obj['provider'] !== 'string' || (obj['provider'] as string).length === 0) {
      throw new TypeError(`registrations[${index}].provider is required.`);
    }
    if (typeof obj['model'] !== 'string' || (obj['model'] as string).length === 0) {
      throw new TypeError(`registrations[${index}].model is required.`);
    }
    const out: ProviderConfigEntry = {
      provider: obj['provider'] as string,
      model: obj['model'] as string,
      ...(typeof obj['apiKey'] === 'string' ? { apiKey: obj['apiKey'] as string } : {}),
      ...(typeof obj['baseUrl'] === 'string' ? { baseUrl: obj['baseUrl'] as string } : {}),
      ...(typeof obj['organization'] === 'string'
        ? { organization: obj['organization'] as string }
        : {}),
    };
    return out;
  });
};

export const createLLMConfigProvider = (sources: readonly ConfigSource[]): ConfigProvider => {
  return createConfigProvider('llm', llmConfigSchema, sources);
};

export const readLLMConfig = (provider: ConfigProvider): LLMConfigShape => {
  const registrationsRaw = provider.get('registrations');
  return {
    provider: provider.getTyped<string>('provider'),
    model: provider.getTyped<string>('model'),
    temperature: provider.getTyped<number>('temperature'),
    ...(provider.has('maxTokens') ? { maxTokens: provider.getTyped<number>('maxTokens') } : {}),
    ...(provider.has('topP') ? { topP: provider.getTyped<number>('topP') } : {}),
    timeoutMs: provider.getTyped<number>('timeoutMs'),
    ...(provider.has('apiKey') && typeof provider.get('apiKey') === 'string'
      ? { apiKey: provider.getTyped<string>('apiKey') }
      : {}),
    ...(provider.has('baseUrl') && typeof provider.get('baseUrl') === 'string'
      ? { baseUrl: provider.getTyped<string>('baseUrl') }
      : {}),
    ...(provider.has('organization') && typeof provider.get('organization') === 'string'
      ? { organization: provider.getTyped<string>('organization') }
      : {}),
    defaultProvider: provider.getTyped<string>('defaultProvider'),
    registrations: parseRegistrations(registrationsRaw),
  };
};
