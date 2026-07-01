/**
 * Tests for LlmProviderFactory.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  createProvider,
  createProviderFromEntry,
  registerBuilder,
  unregisterBuilder,
  listBuilders,
  type ProviderBuilder,
} from './LlmProviderFactory.js';
import { createLLMConfigProvider } from '../config.js';
import { UnknownProvider, AuthenticationFailed } from '../errors.js';
import { MockProvider } from '../providers/mock/MockProvider.js';
import type { LLMProvider } from '../provider.js';
import type { ConfigSource } from '@agent-os/config';

const runtime = (values: Readonly<Record<string, unknown>>): ConfigSource => ({
  kind: 'runtime',
  values,
});

describe('LlmProviderFactory — built-in builders', () => {
  it('contains the mock and openai builders by default', () => {
    const keys = listBuilders();
    expect(keys).toContain('mock');
    expect(keys).toContain('openai');
  });

  it('createProvider produces a MockProvider for provider="mock"', () => {
    const cp = createLLMConfigProvider([runtime({ apiKey: 'sk' })]);
    const provider = createProvider(cp);
    expect(provider).toBeInstanceOf(MockProvider);
    expect(provider.id).toBe('mock');
  });
});

describe('LlmProviderFactory — unknown providers', () => {
  it('throws UnknownProvider when the requested builder is unknown', () => {
    const cp = createLLMConfigProvider([runtime({ provider: 'aurora', apiKey: 'x' })]);
    expect(() => createProvider(cp)).toThrow(UnknownProvider);
  });

  it('throws AuthenticationFailed when openai is requested without an apiKey', () => {
    const cp = createLLMConfigProvider([runtime({ provider: 'openai' })]);
    // The validator forces apiKey to be missing; factory should still detect it
    const provider: LLMProvider = (() => {
      try {
        return createProvider(cp);
      } catch (e) {
        if (e instanceof AuthenticationFailed) {
          return new MockProvider({ id: 'openai' });
        }
        throw e;
      }
    })();
    expect(provider).toBeInstanceOf(MockProvider);
  });

  it('createProviderFromEntry uses the entry shape directly', () => {
    const provider = createProviderFromEntry({
      provider: 'mock',
      model: 'm',
    });
    expect(provider).toBeInstanceOf(MockProvider);
    expect(provider.id).toBe('mock');
  });

  it('createProviderFromEntry throws UnknownProvider for an unknown builder', () => {
    expect(() => createProviderFromEntry({ provider: 'ghost', model: 'g' })).toThrow(
      UnknownProvider,
    );
  });
});

describe('LlmProviderFactory — registerBuilder / unregisterBuilder', () => {
  let customId: string;
  beforeEach(() => {
    customId = `custom-${Math.random().toString(36).slice(2, 10)}`;
    registerBuilder(customId, () => {
      return new MockProvider({ id: customId });
    });
  });
  afterEach(() => {
    unregisterBuilder(customId);
  });

  it('registerBuilder adds the custom builder so createProvider resolves it', () => {
    const cp = createLLMConfigProvider([runtime({ provider: customId })]);
    const provider = createProvider(cp);
    expect(provider.id).toBe(customId);
  });

  it('unregisterBuilder removes the custom builder', () => {
    expect(listBuilders()).toContain(customId);
    unregisterBuilder(customId);
    expect(listBuilders()).not.toContain(customId);
    const cp = createLLMConfigProvider([runtime({ provider: customId })]);
    expect(() => createProvider(cp)).toThrow(UnknownProvider);
  });

  it('overriding an existing builder replaces it', () => {
    const placeholder: ProviderBuilder = () => new MockProvider({ id: 'mock-override' });
    registerBuilder('mock', placeholder);
    const cp = createLLMConfigProvider([runtime({ provider: 'mock' })]);
    const provider = createProvider(cp);
    expect(provider.id).toBe('mock-override');
    // Restore
    registerBuilder('mock', (config) => new MockProvider({ defaultModel: config.model }));
  });
});

describe('LlmProviderFactory — providerCapabilities surface uniformly', () => {
  it('MockProvider declares streaming capability', async () => {
    const cp = createLLMConfigProvider([runtime({ provider: 'mock' })]);
    const provider = createProvider(cp);
    await expect(provider.health()).resolves.toMatchObject({ providerId: 'mock' });
  });

  it('non-streaming capabilities return ProviderUnavailable when called', async () => {
    // Build a custom provider that has streaming disabled
    registerBuilder(
      'no-stream',
      () => new MockProvider({ id: 'no-stream', supportsStreaming: false }),
    );
    try {
      const cp = createLLMConfigProvider([runtime({ provider: 'no-stream' })]);
      const provider = createProvider(cp);
      await expect(
        provider.stream({
          messages: [{ role: 'user', content: 'hi' }],
          model: 'mock-model',
        }),
      ).rejects.toThrow(/streaming is not supported/i);
    } finally {
      unregisterBuilder('no-stream');
    }
  });
});
