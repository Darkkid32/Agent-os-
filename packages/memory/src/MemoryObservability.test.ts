import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryObservability } from './MemoryObservability.js';
import type { MemoryRecord, MemoryQuery, MemoryScore } from './MemoryTypes.js';

const makeRecord = (id: string): MemoryRecord => ({
  id,
  scope: 'conversation',
  content: 'test',
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

describe('MemoryObservability', () => {
  let obs: MemoryObservability;

  beforeEach(() => {
    obs = new MemoryObservability();
  });

  it('emit and subscribe', () => {
    const events: unknown[] = [];
    obs.on((e) => events.push(e));
    obs.emit('memory.stored', { id: '1' });
    expect(events).toHaveLength(1);
  });

  it('unsubscribe', () => {
    const events: unknown[] = [];
    const unsub = obs.on((e) => events.push(e));
    unsub();
    obs.emit('memory.stored', { id: '1' });
    expect(events).toHaveLength(0);
  });

  it('handler error is swallowed', () => {
    obs.on(() => {
      throw new Error('handler error');
    });
    expect(() => obs.emit('memory.stored', {})).not.toThrow();
  });

  it('emitStored', () => {
    obs.emitStored(makeRecord('r1'));
    expect(obs.getEvents()).toHaveLength(1);
    expect(obs.getEventsByType('memory.stored')).toHaveLength(1);
  });

  it('emitRetrieved', () => {
    obs.emitRetrieved('r1');
    expect(obs.getEventsByType('memory.retrieved')).toHaveLength(1);
  });

  it('emitDeleted', () => {
    obs.emitDeleted('r1');
    expect(obs.getEventsByType('memory.deleted')).toHaveLength(1);
  });

  it('emitQueried', () => {
    const query: MemoryQuery = { text: 'hello' };
    obs.emitQueried(query, 5, 100);
    expect(obs.getEventsByType('memory.queried')).toHaveLength(1);
  });

  it('emitRanked', () => {
    const scores: MemoryScore[] = [
      {
        record: makeRecord('r1'),
        score: 0.9,
        components: { relevance: 0.9, importance: 0.5, recency: 0.5, sourcePriority: 0.5 },
      },
    ];
    obs.emitRanked(scores);
    expect(obs.getEventsByType('memory.ranked')).toHaveLength(1);
  });

  it('emitIndexed', () => {
    obs.emitIndexed('r1', 3);
    expect(obs.getEventsByType('memory.indexed')).toHaveLength(1);
  });

  it('emitExpired', () => {
    obs.emitExpired('r1');
    expect(obs.getEventsByType('memory.expired')).toHaveLength(1);
  });

  it('emitEvicted', () => {
    obs.emitEvicted('r1', 'quota');
    expect(obs.getEventsByType('memory.evicted')).toHaveLength(1);
  });

  it('clearEvents', () => {
    obs.emit('memory.stored', {});
    obs.clearEvents();
    expect(obs.getEvents()).toHaveLength(0);
  });
});
