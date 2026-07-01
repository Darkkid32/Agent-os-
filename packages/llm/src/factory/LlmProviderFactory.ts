/**
 * `LlmProviderFactory` — instantiate a provider from a `ConfigProvider`.
 *
 * The factory reads the `provider` field and delegates to the matching
 * builder function. New providers are added by registering a builder
 * with `registerBuilder()`.
 *
 * The factory is pure configuration → object. It does NOT register the
 * provider with the global registry (the caller can do that if desired).
 */
import type { ConfigProvider } from '@agent-os/config';
import { readLLMConfig, type LLMConfigShape, type ProviderConfigEntry } from '../config.js';
import { UnknownProvider, AuthenticationFailed } from '../errors.js';
import { MockProvider } from '../providers/mock/index.js';
import { OpenAIProvider } from '../providers/openai/index.js';
import type { LLMProvider } from '../provider.js';

export type ProviderBuilder = (config: LLMConfigShape) => LLMProvider;

const builders: Map<string, ProviderBuilder> = new Map();

builders.set('mock', (config: LLMConfigShape): LLMProvider => {
  return new MockProvider({
    defaultModel: config.model,
    ...(config.apiKey ? { id: 'mock' } : {}),
  });
});

builders.set('openai', (config: LLMConfigShape): LLMProvider => {
  if (!config.apiKey) {
    throw new AuthenticationFailed(
      'openai',
      'OpenAI provider requires an apiKey in configuration.',
    );
  }
  return new OpenAIProvider({
    apiKey: config.apiKey,
    ...(config.baseUrl ? { baseUrl: config.baseUrl } : {}),
    ...(config.organization ? { organization: config.organization } : {}),
    defaultModel: config.model,
    timeoutMs: config.timeoutMs,
  });
});

export const registerBuilder = (name: string, builder: ProviderBuilder): void => {
  builders.set(name, builder);
};

export const unregisterBuilder = (name: string): void => {
  builders.delete(name);
};

export const listBuilders = (): readonly string[] => Array.from(builders.keys());

export const createProvider = (configProvider: ConfigProvider): LLMProvider => {
  const config = readLLMConfig(configProvider);
  const builder = builders.get(config.provider);
  if (!builder) {
    throw new UnknownProvider(
      config.provider,
      `No builder registered for provider "${config.provider}". Available: ${Array.from(builders.keys()).join(', ')}`,
    );
  }
  return builder(config);
};

export const createProviderFromEntry = (entry: ProviderConfigEntry): LLMProvider => {
  const config: LLMConfigShape = {
    provider: entry.provider,
    model: entry.model,
    temperature: 0.2,
    timeoutMs: 30000,
    defaultProvider: entry.provider,
    registrations: [],
    ...(entry.apiKey ? { apiKey: entry.apiKey } : {}),
    ...(entry.baseUrl ? { baseUrl: entry.baseUrl } : {}),
    ...(entry.organization ? { organization: entry.organization } : {}),
  };
  const builder = builders.get(entry.provider);
  if (!builder) {
    throw new UnknownProvider(
      entry.provider,
      `No builder registered for provider "${entry.provider}". Available: ${Array.from(builders.keys()).join(', ')}`,
    );
  }
  return builder(config);
};
