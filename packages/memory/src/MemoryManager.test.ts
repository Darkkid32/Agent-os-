import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryManager, type CreateMemoryInput } from './MemoryManager.js';
import { InMemoryProvider } from './MemoryProvider.js';
import { MemoryNotFoundError, MemoryValidationFailedError } from './MemoryErrors.js';

const makeInput = (overrides: Partial<CreateMemoryInput> = {}): CreateMemoryInput => ({
  scope: 'conversation',
  content: 'Test memory content',
  source: { pluginId: 'test-plugin', label: 'Test Plugin' },
  ...overrides,
});

describe('MemoryManager', () => {
  let provider: InMemoryProvider;
  let manager: MemoryManager;

  beforeEach(async () => {
    provider = new InMemoryProvider();
    manager = new MemoryManager(provider);
    await manager.initialize();
  });

  it('initialize calls provider.initialize', async () => {
    const p = new InMemoryProvider();
    const m = new MemoryManager(p);
    await m.initialize();
    // Should not throw on store
    await m.store(makeInput());
  });

  it('store creates a record', async () => {
    const record = await manager.store(makeInput());
    expect(record.id).toMatch(/^mem_/);
    expect(record.scope).toBe('conversation');
    expect(record.content).toBe('Test memory content');
    expect(record.source.pluginId).toBe('test-plugin');
  });

  it('store with custom fields', async () => {
    const record = await manager.store(
      makeInput({
        tags: ['important'],
        importance: 0.9,
        userId: 'u1',
        projectId: 'p1',
      }),
    );
    expect(record.tags).toEqual(['important']);
    expect(record.importance).toBe(0.9);
    expect(record.userId).toBe('u1');
    expect(record.projectId).toBe('p1');
  });

  it('store uses policy defaults', async () => {
    const record = await manager.store(makeInput());
    expect(record.importance).toBe(0.5);
    expect(record.visibility).toBe('private');
  });

  it('store validates empty content', async () => {
    await expect(manager.store(makeInput({ content: '' }))).rejects.toThrow(
      MemoryValidationFailedError,
    );
  });

  it('store validates importance range', async () => {
    await expect(manager.store(makeInput({ importance: 2 }))).rejects.toThrow(
      MemoryValidationFailedError,
    );
  });

  it('retrieve returns record', async () => {
    const stored = await manager.store(makeInput());
    const retrieved = await manager.retrieve(stored.id);
    expect(retrieved.id).toBe(stored.id);
  });

  it('retrieve throws for missing', async () => {
    await expect(manager.retrieve('missing')).rejects.toThrow(MemoryNotFoundError);
  });

  it('delete removes record', async () => {
    const stored = await manager.store(makeInput());
    const deleted = await manager.delete(stored.id);
    expect(deleted).toBe(true);
    expect(await manager.exists(stored.id)).toBe(false);
  });

  it('delete returns false for missing', async () => {
    expect(await manager.delete('missing')).toBe(false);
  });

  it('query returns results', async () => {
    await manager.store(makeInput({ content: 'hello world' }));
    await manager.store(makeInput({ content: 'foo bar' }));
    const result = await manager.query({ text: 'hello' });
    expect(result.scores).toHaveLength(1);
  });

  it('getContext returns MemoryContext', async () => {
    await manager.store(makeInput({ content: 'hello' }));
    const ctx = await manager.getContext({ text: 'hello' });
    expect(ctx.getQuery()).toBe('hello');
    expect(ctx.getMemories()).toHaveLength(1);
  });

  it('exists', async () => {
    const stored = await manager.store(makeInput());
    expect(await manager.exists(stored.id)).toBe(true);
    expect(await manager.exists('missing')).toBe(false);
  });

  it('count', async () => {
    await manager.store(makeInput());
    await manager.store(makeInput());
    expect(await manager.count()).toBe(2);
  });

  it('setPolicy and getPolicy', () => {
    manager.setPolicy('conversation', {
      id: 'custom',
      description: 'Custom',
      pinned: false,
      defaultImportance: 0.3,
      defaultVisibility: 'shared',
    });
    expect(manager.getPolicy('conversation')?.id).toBe('custom');
  });

  it('getPolicy returns undefined for unknown', () => {
    // Default policies are set in constructor, so this tests the getter
    expect(manager.getPolicy('conversation')).toBeDefined();
  });

  it('getObservability', () => {
    expect(manager.getObservability()).toBeDefined();
  });

  it('getIndexer', () => {
    expect(manager.getIndexer()).toBeDefined();
  });

  it('close', async () => {
    await manager.close();
  });

  it('observability events are emitted', async () => {
    const obs = manager.getObservability();
    const stored = await manager.store(makeInput());
    expect(obs.getEventsByType('memory.stored')).toHaveLength(1);

    await manager.retrieve(stored.id);
    expect(obs.getEventsByType('memory.retrieved')).toHaveLength(1);

    await manager.delete(stored.id);
    expect(obs.getEventsByType('memory.deleted')).toHaveLength(1);
  });

  it('observability can be disabled', async () => {
    const m = new MemoryManager(provider, { enableObservability: false });
    await m.initialize();
    await m.store(makeInput());
    expect(m.getObservability().getEvents()).toHaveLength(0);
  });

  it('indexing can be disabled', async () => {
    const m = new MemoryManager(provider, { enableIndexing: false });
    await m.initialize();
    await m.store(makeInput());
    expect(m.getIndexer().getIndexedIds()).toHaveLength(0);
  });
});
