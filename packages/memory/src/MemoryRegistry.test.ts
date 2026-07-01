import { describe, it, expect } from 'vitest';
import { MemoryProviderRegistry } from './MemoryRegistry.js';
import { InMemoryProvider } from './MemoryProvider.js';

describe('MemoryProviderRegistry', () => {
  it('register and get', () => {
    const reg = new MemoryProviderRegistry();
    const p = new InMemoryProvider();
    reg.register(p);
    expect(reg.get('in-memory')).toBe(p);
  });

  it('register throws on duplicate', () => {
    const reg = new MemoryProviderRegistry();
    reg.register(new InMemoryProvider());
    expect(() => reg.register(new InMemoryProvider())).toThrow('already registered');
  });

  it('unregister', () => {
    const reg = new MemoryProviderRegistry();
    reg.register(new InMemoryProvider());
    expect(reg.unregister('in-memory')).toBe(true);
    expect(reg.get('in-memory')).toBeUndefined();
  });

  it('unregister returns false for missing', () => {
    const reg = new MemoryProviderRegistry();
    expect(reg.unregister('missing')).toBe(false);
  });

  it('first registered is default', () => {
    const reg = new MemoryProviderRegistry();
    reg.register(new InMemoryProvider());
    expect(reg.getDefault()?.id).toBe('in-memory');
  });

  it('setDefault', () => {
    const reg = new MemoryProviderRegistry();
    const p = new InMemoryProvider();
    reg.register(p);
    reg.setDefault('in-memory');
    expect(reg.getDefault()).toBe(p);
  });

  it('setDefault throws for unregistered', () => {
    const reg = new MemoryProviderRegistry();
    expect(() => reg.setDefault('missing')).toThrow('not registered');
  });

  it('list returns all', () => {
    const reg = new MemoryProviderRegistry();
    reg.register(new InMemoryProvider());
    expect(reg.list()).toHaveLength(1);
  });

  it('has', () => {
    const reg = new MemoryProviderRegistry();
    reg.register(new InMemoryProvider());
    expect(reg.has('in-memory')).toBe(true);
    expect(reg.has('missing')).toBe(false);
  });

  it('clear', () => {
    const reg = new MemoryProviderRegistry();
    reg.register(new InMemoryProvider());
    reg.clear();
    expect(reg.list()).toHaveLength(0);
    expect(reg.getDefault()).toBeUndefined();
  });

  it('unregister updates default', () => {
    const reg = new MemoryProviderRegistry();
    const p1 = new InMemoryProvider();
    Object.defineProperty(p1, 'id', { value: 'a', writable: false });
    reg.register(p1);
    const p2 = new InMemoryProvider();
    Object.defineProperty(p2, 'id', { value: 'b', writable: false });
    reg.register(p2);
    reg.unregister('a');
    expect(reg.getDefault()?.id).toBe('b');
  });
});
