import { describe, it, expect } from 'vitest';
import { MemoryIndexer } from './MemoryIndexer.js';
import type { MemoryRecord } from './MemoryTypes.js';

const makeRecord = (content: string): MemoryRecord => ({
  id: 'r1',
  scope: 'conversation',
  content,
  source: { pluginId: 'p1', label: 'Test' },
  tags: [],
  importance: 0.5,
  metadata: { key: 'val' },
  createdAt: '2025-01-01T00:00:00Z',
  lastAccessedAt: '2025-01-01T00:00:00Z',
  accessCount: 0,
  readOnly: false,
  visibility: 'private',
});

describe('MemoryIndexer', () => {
  it('indexes short content as single chunk', () => {
    const indexer = new MemoryIndexer();
    const chunks = indexer.index(makeRecord('hello'));
    expect(chunks).toHaveLength(1);
    expect(chunks[0]?.content).toBe('hello');
    expect(chunks[0]?.parentId).toBe('r1');
  });

  it('chunks long content', () => {
    const indexer = new MemoryIndexer({ chunkSize: 10, chunkOverlap: 2 });
    const content = 'a'.repeat(25);
    const chunks = indexer.index(makeRecord(content));
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[0]?.content).toHaveLength(10);
  });

  it('getChunks', () => {
    const indexer = new MemoryIndexer();
    indexer.index(makeRecord('hello'));
    expect(indexer.getChunks('r1')).toHaveLength(1);
  });

  it('getChunks returns empty for unknown', () => {
    const indexer = new MemoryIndexer();
    expect(indexer.getChunks('missing')).toHaveLength(0);
  });

  it('remove', () => {
    const indexer = new MemoryIndexer();
    indexer.index(makeRecord('hello'));
    expect(indexer.remove('r1')).toBe(true);
    expect(indexer.getChunks('r1')).toHaveLength(0);
  });

  it('remove returns false for missing', () => {
    const indexer = new MemoryIndexer();
    expect(indexer.remove('missing')).toBe(false);
  });

  it('getIndexedIds', () => {
    const indexer = new MemoryIndexer();
    indexer.index(makeRecord('hello'));
    expect(indexer.getIndexedIds()).toEqual(['r1']);
  });

  it('getChunkCount', () => {
    const indexer = new MemoryIndexer({ chunkSize: 5, chunkOverlap: 0 });
    indexer.index(makeRecord('a'.repeat(12)));
    expect(indexer.getChunkCount()).toBe(3);
  });

  it('clear', () => {
    const indexer = new MemoryIndexer();
    indexer.index(makeRecord('hello'));
    indexer.clear();
    expect(indexer.getIndexedIds()).toHaveLength(0);
  });

  it('searchChunks', () => {
    const indexer = new MemoryIndexer();
    indexer.index(makeRecord('hello world'));
    expect(indexer.searchChunks('world')).toHaveLength(1);
    expect(indexer.searchChunks('missing')).toHaveLength(0);
  });

  it('index with embedding', () => {
    const indexer = new MemoryIndexer();
    const r: MemoryRecord = { ...makeRecord('hello'), embedding: [1, 2, 3] };
    const chunks = indexer.index(r);
    expect(chunks[0]?.embedding).toEqual([1, 2, 3]);
  });
});
