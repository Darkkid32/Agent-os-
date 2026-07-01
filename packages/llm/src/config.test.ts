/**
 * Tests for LLMConfigProvider schema and readLLMConfig.
 */
import { describe, it, expect } from 'vitest';
import { createLLMConfigProvider, readLLMConfig } from './config.js';
import type { ConfigSource } from '@agent-os/config';

const runtime = (values: Readonly<Record<string, unknown>>): ConfigSource => ({
  kind: 'runtime',
  values,
});

describe('createLLMConfigProvider', () => {
  it('returns a config provider with the name "llm"', () => {
    const cp = createLLMConfigProvider([runtime({})]);
    expect(cp.name).toBe('llm');
  });

  it('applies schema defaults when keys are missing', () => {
    const cp = createLLMConfigProvider([runtime({})]);
    expect(cp.get('provider')).toBe('mock');
    expect(cp.get('model')).toBe('mock-model');
    expect(cp.get('temperature')).toBe(0.2);
    expect(cp.get('timeoutMs')).toBe(30000);
    expect(cp.get('defaultProvider')).toBe('mock');
  });

  it('throws when required fields are invalid', () => {
    expect(() => createLLMConfigProvider([runtime({ temperature: 99 })])).toThrow(/config/i);
  });
});

describe('readLLMConfig', () => {
  it('returns the full LLMConfigShape with defaults applied', () => {
    const cp = createLLMConfigProvider([runtime({})]);
    const cfg = readLLMConfig(cp);
    expect(cfg.provider).toBe('mock');
    expect(cfg.model).toBe('mock-model');
    expect(cfg.temperature).toBe(0.2);
    expect(cfg.timeoutMs).toBe(30000);
    expect(cfg.defaultProvider).toBe('mock');
    expect(cfg.registrations).toEqual([]);
  });

  it('parses optional apiKey / baseUrl / organization / maxTokens / topP', () => {
    const cp = createLLMConfigProvider([
      runtime({
        apiKey: 'sk-test',
        baseUrl: 'https://api.example.com',
        organization: 'org-1',
        maxTokens: 1024,
        topP: 0.7,
      }),
    ]);
    const cfg = readLLMConfig(cp);
    expect(cfg.apiKey).toBe('sk-test');
    expect(cfg.baseUrl).toBe('https://api.example.com');
    expect(cfg.organization).toBe('org-1');
    expect(cfg.maxTokens).toBe(1024);
    expect(cfg.topP).toBe(0.7);
  });

  it('omits unset optional fields entirely', () => {
    const cp = createLLMConfigProvider([runtime({})]);
    const cfg = readLLMConfig(cp);
    expect('apiKey' in cfg).toBe(false);
    expect('baseUrl' in cfg).toBe(false);
    expect('organization' in cfg).toBe(false);
    expect('maxTokens' in cfg).toBe(false);
    expect('topP' in cfg).toBe(false);
  });

  it('parses registrations array into ProviderConfigEntry objects', () => {
    const cp = createLLMConfigProvider([
      runtime({
        registrations: [
          { provider: 'openai', model: 'gpt-4o-mini', apiKey: 'sk-1' },
          { provider: 'mock', model: 'm-2', baseUrl: 'https://example.com', organization: 'org' },
        ],
      }),
    ]);
    const cfg = readLLMConfig(cp);
    expect(cfg.registrations).toHaveLength(2);
    expect(cfg.registrations[0]).toEqual({
      provider: 'openai',
      model: 'gpt-4o-mini',
      apiKey: 'sk-1',
    });
    expect(cfg.registrations[1]).toEqual({
      provider: 'mock',
      model: 'm-2',
      baseUrl: 'https://example.com',
      organization: 'org',
    });
  });

  it('throws on non-array registrations', () => {
    expect(() => createLLMConfigProvider([runtime({ registrations: 'not-an-array' })])).toThrow(
      /config/i,
    );
  });

  it('throws on registration entries with missing provider', () => {
    const cp = createLLMConfigProvider([runtime({ registrations: [{ model: 'x' }] })]);
    expect(() => readLLMConfig(cp)).toThrow(/provider is required/);
  });

  it('throws on registration entries with missing model', () => {
    const cp = createLLMConfigProvider([runtime({ registrations: [{ provider: 'mock' }] })]);
    expect(() => readLLMConfig(cp)).toThrow(/model is required/);
  });

  it('throws on non-object registration entries', () => {
    const cp = createLLMConfigProvider([runtime({ registrations: [42] })]);
    expect(() => readLLMConfig(cp)).toThrow(/must be an object/);
  });
});
