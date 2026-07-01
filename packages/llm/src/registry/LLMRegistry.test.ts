/**
 * Tests for the LLMRegistry and its global accessor.
 */
import { describe, it, expect } from 'vitest';
import { DefaultLLMRegistry, getGlobalRegistry, resetGlobalRegistry } from './LLMRegistry.js';
import { UnknownProvider } from '../errors.js';
import { MockProvider } from '../providers/mock/MockProvider.js';

describe('DefaultLLMRegistry', () => {
  it('registers, lists, resolves by id', () => {
    const r = new DefaultLLMRegistry();
    const a = new MockProvider({ id: 'a' });
    const b = new MockProvider({ id: 'b' });
    r.register(a);
    r.register(b);

    expect(r.list()).toHaveLength(2);
    expect(r.list().map((p) => p.id)).toEqual(['a', 'b']);
    expect(r.get('a').id).toBe('a');
    expect(r.get('b').id).toBe('b');
  });

  it('throws UnknownProvider on missing id', () => {
    const r = new DefaultLLMRegistry();
    expect(() => r.get('ghost')).toThrow(UnknownProvider);
  });

  it('re-registering the same id replaces the previous entry', () => {
    const r = new DefaultLLMRegistry();
    const a = new MockProvider({ id: 'a', responses: [{ content: 'x' }] });
    const a2 = new MockProvider({ id: 'a', responses: [{ content: 'y' }] });
    r.register(a);
    r.register(a2);

    expect(r.list()).toHaveLength(1);
    expect(r.get('a')).toBe(a2);
  });

  it('the first registration becomes default', () => {
    const r = new DefaultLLMRegistry();
    const a = new MockProvider({ id: 'a' });
    const b = new MockProvider({ id: 'b' });
    r.register(a);
    r.register(b);
    expect(r.defaultProvider().id).toBe('a');
  });

  it('setDefault stores the override and defaultProvider returns it', () => {
    const r = new DefaultLLMRegistry();
    r.register(new MockProvider({ id: 'a' }));
    r.register(new MockProvider({ id: 'b' }));
    r.setDefault('b');
    expect(r.defaultProvider().id).toBe('b');
  });

  it('setDefault throws UnknownProvider for missing ids', () => {
    const r = new DefaultLLMRegistry();
    expect(() => r.setDefault('missing')).toThrow(UnknownProvider);
  });

  it('unregister removes an entry', () => {
    const r = new DefaultLLMRegistry();
    r.register(new MockProvider({ id: 'a' }));
    r.register(new MockProvider({ id: 'b' }));

    r.unregister('a');

    expect(r.list().map((p) => p.id)).toEqual(['b']);
    expect(() => r.get('a')).toThrow(UnknownProvider);
  });

  it('unregistering the default re-promotes another provider', () => {
    const r = new DefaultLLMRegistry();
    r.register(new MockProvider({ id: 'a' }));
    r.register(new MockProvider({ id: 'b' }));
    expect(r.defaultProvider().id).toBe('a');
    r.unregister('a');
    expect(r.defaultProvider().id).toBe('b');
  });

  it('unregistering the only provider clears the default', () => {
    const r = new DefaultLLMRegistry();
    r.register(new MockProvider({ id: 'a' }));
    r.unregister('a');
    expect(() => r.defaultProvider()).toThrow(UnknownProvider);
  });

  it('list() returns a copy that does not mutate the registry', () => {
    const r = new DefaultLLMRegistry();
    r.register(new MockProvider({ id: 'a' }));
    const snapshot = r.list();
    expect(snapshot).toHaveLength(1);
    r.register(new MockProvider({ id: 'b' }));
    expect(snapshot).toHaveLength(1);
  });
});

describe('global registry', () => {
  it('lazily creates a singleton on first call', () => {
    resetGlobalRegistry();
    const a = getGlobalRegistry();
    const b = getGlobalRegistry();
    expect(a).toBe(b);
    resetGlobalRegistry();
    expect(getGlobalRegistry()).not.toBe(a);
  });

  it('resetGlobalRegistry resets across accessors', () => {
    resetGlobalRegistry();
    const first = getGlobalRegistry();
    resetGlobalRegistry();
    const second = getGlobalRegistry();
    expect(first).not.toBe(second);
  });
});
