import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryRetriever } from './MemoryRetriever.js';
import { InMemoryProvider } from './MemoryProvider.js';
import type { MemoryRecord } from './MemoryTypes.js';

const makeRecord = (id: string, content: string): MemoryRecord => ({
  id,
  scope: 'conversation',
  content,
  source: { pluginId: 'p1', label: 'Test' },
  tags: [],
  importance: 0.5,
  metadata: {},
  createdAt: '2025-01-01T00:00:00Z',
  lastAccessedAt: '2025-01-01T00:00:00Z',
  accessCount: 0,
  readOnly: false,
  visibility: 'private',
});

describe('MemoryRetriever', () => {
  let provider: InMemoryProvider;
  let retriever: MemoryRetriever;

  beforeEach(async () => {
    provider = new InMemoryProvider();
    await provider.initialize();
    await provider.store(makeRecord('r1', 'hello world'));
    await provider.store(makeRecord('r2', 'foo bar'));
    retriever = new MemoryRetriever(provider);
  });

  it('query returns results', async () => {
    const result = await retriever.query({ text: 'hello' });
    expect(result.scores).toHaveLength(1);
    expect(result.scores[0]?.record.id).toBe('r1');
    expect(result.cached).toBe(false);
  });

  it('query returns empty for no match', async () => {
    const result = await retriever.query({ text: 'xyz' });
    expect(result.scores).toHaveLength(0);
  });

  it('getById', async () => {
    const r = await retriever.getById('r1');
    expect(r?.id).toBe('r1');
  });

  it('getById returns undefined', async () => {
    expect(await retriever.getById('missing')).toBeUndefined();
  });

  it('caching works', async () => {
    const cachedRetriever = new MemoryRetriever(provider, {
      enableCaching: true,
      cacheTtlMs: 60000,
    });
    const r1 = await cachedRetriever.query({ text: 'hello' });
    expect(r1.cached).toBe(false);
    const r2 = await cachedRetriever.query({ text: 'hello' });
    expect(r2.cached).toBe(true);
  });

  it('clearCache', async () => {
    const cachedRetriever = new MemoryRetriever(provider, {
      enableCaching: true,
      cacheTtlMs: 60000,
    });
    await cachedRetriever.query({ text: 'hello' });
    cachedRetriever.clearCache();
    expect(cachedRetriever.getCacheSize()).toBe(0);
  });

  it('getCacheSize', async () => {
    const cachedRetriever = new MemoryRetriever(provider, {
      enableCaching: true,
      cacheTtlMs: 60000,
    });
    await cachedRetriever.query({ text: 'hello' });
    expect(cachedRetriever.getCacheSize()).toBe(1);
  });
});
