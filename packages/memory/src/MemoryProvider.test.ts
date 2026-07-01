import { describe, it, expect } from 'vitest';
import { InMemoryProvider } from './MemoryProvider.js';
import type { MemoryRecord } from './MemoryTypes.js';

const makeRecord = (
  id: string,
  scope: 'conversation' | 'project' = 'conversation',
): MemoryRecord => ({
  id,
  scope,
  content: `Content for ${id}`,
  source: { pluginId: 'test-plugin', label: 'Test' },
  tags: ['test'],
  importance: 0.5,
  metadata: {},
  createdAt: '2025-01-01T00:00:00Z',
  lastAccessedAt: '2025-01-01T00:00:00Z',
  accessCount: 0,
  readOnly: false,
  visibility: 'private',
});

describe('InMemoryProvider', () => {
  it('has correct id and name', () => {
    const p = new InMemoryProvider();
    expect(p.id).toBe('in-memory');
    expect(p.name).toBe('In-Memory Store');
  });

  it('throws if not initialized', async () => {
    const p = new InMemoryProvider();
    await expect(p.store(makeRecord('1'))).rejects.toThrow('not initialized');
  });

  it('store and retrieve', async () => {
    const p = new InMemoryProvider();
    await p.initialize();
    const r = makeRecord('1');
    await p.store(r);
    const got = await p.retrieve('1');
    expect(got).toEqual(r);
  });

  it('retrieve returns undefined for missing', async () => {
    const p = new InMemoryProvider();
    await p.initialize();
    expect(await p.retrieve('missing')).toBeUndefined();
  });

  it('remove deletes a record', async () => {
    const p = new InMemoryProvider();
    await p.initialize();
    await p.store(makeRecord('1'));
    expect(await p.remove('1')).toBe(true);
    expect(await p.retrieve('1')).toBeUndefined();
  });

  it('remove returns false for missing', async () => {
    const p = new InMemoryProvider();
    await p.initialize();
    expect(await p.remove('missing')).toBe(false);
  });

  it('count returns size', async () => {
    const p = new InMemoryProvider();
    await p.initialize();
    await p.store(makeRecord('1'));
    await p.store(makeRecord('2'));
    expect(await p.count()).toBe(2);
  });

  it('count with filter', async () => {
    const p = new InMemoryProvider();
    await p.initialize();
    await p.store(makeRecord('1', 'conversation'));
    await p.store(makeRecord('2', 'project'));
    expect(await p.count({ scopes: ['conversation'] })).toBe(1);
  });

  it('query filters by scope', async () => {
    const p = new InMemoryProvider();
    await p.initialize();
    await p.store(makeRecord('1', 'conversation'));
    await p.store(makeRecord('2', 'project'));
    const results = await p.query({ scopes: ['conversation'] });
    expect(results).toHaveLength(1);
    expect(results[0]?.id).toBe('1');
  });

  it('query filters by pluginIds', async () => {
    const p = new InMemoryProvider();
    await p.initialize();
    await p.store({ ...makeRecord('1'), source: { pluginId: 'a', label: 'A' } });
    await p.store({ ...makeRecord('2'), source: { pluginId: 'b', label: 'B' } });
    const results = await p.query({ pluginIds: ['a'] });
    expect(results).toHaveLength(1);
  });

  it('query filters by userId', async () => {
    const p = new InMemoryProvider();
    await p.initialize();
    await p.store({ ...makeRecord('1'), userId: 'u1' });
    await p.store({ ...makeRecord('2'), userId: 'u2' });
    const results = await p.query({ userId: 'u1' });
    expect(results).toHaveLength(1);
  });

  it('query filters by projectId', async () => {
    const p = new InMemoryProvider();
    await p.initialize();
    await p.store({ ...makeRecord('1'), projectId: 'p1' });
    await p.store({ ...makeRecord('2'), projectId: 'p2' });
    const results = await p.query({ projectId: 'p1' });
    expect(results).toHaveLength(1);
  });

  it('query filters by tags', async () => {
    const p = new InMemoryProvider();
    await p.initialize();
    await p.store({ ...makeRecord('1'), tags: ['important'] });
    await p.store({ ...makeRecord('2'), tags: ['minor'] });
    const results = await p.query({ tags: ['important'] });
    expect(results).toHaveLength(1);
  });

  it('query filters by minImportance', async () => {
    const p = new InMemoryProvider();
    await p.initialize();
    await p.store({ ...makeRecord('1'), importance: 0.3 });
    await p.store({ ...makeRecord('2'), importance: 0.8 });
    const results = await p.query({ minImportance: 0.5 });
    expect(results).toHaveLength(1);
    expect(results[0]?.id).toBe('2');
  });

  it('query excludes readOnly by default', async () => {
    const p = new InMemoryProvider();
    await p.initialize();
    await p.store({ ...makeRecord('1'), readOnly: true });
    await p.store(makeRecord('2'));
    const results = await p.query({});
    expect(results).toHaveLength(1);
    expect(results[0]?.id).toBe('2');
  });

  it('query includes readOnly when requested', async () => {
    const p = new InMemoryProvider();
    await p.initialize();
    await p.store({ ...makeRecord('1'), readOnly: true });
    const results = await p.query({ includeReadOnly: true });
    expect(results).toHaveLength(1);
  });

  it('search delegates to query', async () => {
    const p = new InMemoryProvider();
    await p.initialize();
    await p.store(makeRecord('1'));
    const results = await p.search({ text: 'Content' });
    expect(results).toHaveLength(1);
  });

  it('close clears state', async () => {
    const p = new InMemoryProvider();
    await p.initialize();
    await p.store(makeRecord('1'));
    await p.close();
    // After close, operations throw because provider is not initialized
    await expect(p.count()).rejects.toThrow('not initialized');
  });
});
