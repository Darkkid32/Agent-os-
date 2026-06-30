import { describe, it, expect } from 'vitest';
import { createConfigRegistry } from './ConfigRegistry.js';
import type { ConfigProvider } from './types.js';

function fakeProvider(name: string): ConfigProvider {
  return {
    name,
    get: () => undefined,
    getTyped: () => undefined as never,
    has: () => false,
    keys: () => [],
    all: () => ({}),
    validate: () => ({ ok: true, errors: [] }),
  };
}

describe('ConfigRegistry', () => {
  it('registers a provider', () => {
    const registry = createConfigRegistry();
    registry.register(fakeProvider('api'));
    expect(registry.getProvider('api')).toBeDefined();
  });

  it('returns undefined for unknown provider', () => {
    const registry = createConfigRegistry();
    expect(registry.getProvider('unknown')).toBeUndefined();
  });

  it('lists all registered providers', () => {
    const registry = createConfigRegistry();
    registry.register(fakeProvider('api'));
    registry.register(fakeProvider('hermes'));
    expect(registry.providers()).toHaveLength(2);
  });

  it('rejects duplicate provider names', () => {
    const registry = createConfigRegistry();
    registry.register(fakeProvider('api'));
    expect(() => registry.register(fakeProvider('api'))).toThrow('already registered');
  });

  it('returns empty array when no providers registered', () => {
    const registry = createConfigRegistry();
    expect(registry.providers()).toEqual([]);
  });
});
