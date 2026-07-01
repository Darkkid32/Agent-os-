/**
 * Memory observability — events and logging.
 *
 * Layer: 2 (Platform)
 */

import type { MemoryRecord, MemoryScore, MemoryQuery } from './MemoryTypes.js';

// ---------------------------------------------------------------------------
// Event types
// ---------------------------------------------------------------------------

export type MemoryEventType =
  | 'memory.stored'
  | 'memory.retrieved'
  | 'memory.deleted'
  | 'memory.queried'
  | 'memory.ranked'
  | 'memory.indexed'
  | 'memory.expired'
  | 'memory.evicted';

export interface MemoryEvent {
  readonly type: MemoryEventType;
  readonly timestamp: string;
  readonly data: Readonly<Record<string, unknown>>;
}

// ---------------------------------------------------------------------------
// Event handler
// ---------------------------------------------------------------------------

export type MemoryEventHandler = (event: MemoryEvent) => void;

// ---------------------------------------------------------------------------
// MemoryObservability
// ---------------------------------------------------------------------------

/**
 * Observability service for memory operations.
 * Emits events for monitoring and debugging.
 */
export class MemoryObservability {
  private readonly handlers: MemoryEventHandler[] = [];
  private readonly events: MemoryEvent[] = [];

  /**
   * Subscribe to memory events.
   */
  public on(handler: MemoryEventHandler): () => void {
    this.handlers.push(handler);
    return () => {
      const idx = this.handlers.indexOf(handler);
      if (idx >= 0) this.handlers.splice(idx, 1);
    };
  }

  /**
   * Emit a memory event.
   */
  public emit(type: MemoryEventType, data: Readonly<Record<string, unknown>>): void {
    const event: MemoryEvent = {
      type,
      timestamp: new Date().toISOString(),
      data,
    };
    this.events.push(event);
    for (const handler of this.handlers) {
      try {
        handler(event);
      } catch {
        // Swallow handler errors to avoid breaking the flow
      }
    }
  }

  /**
   * Emit memory.stored event.
   */
  public emitStored(record: MemoryRecord): void {
    this.emit('memory.stored', {
      memoryId: record.id,
      scope: record.scope,
      pluginId: record.source.pluginId,
    });
  }

  /**
   * Emit memory.retrieved event.
   */
  public emitRetrieved(id: string): void {
    this.emit('memory.retrieved', { memoryId: id });
  }

  /**
   * Emit memory.deleted event.
   */
  public emitDeleted(id: string): void {
    this.emit('memory.deleted', { memoryId: id });
  }

  /**
   * Emit memory.queried event.
   */
  public emitQueried(query: MemoryQuery, resultCount: number, durationMs: number): void {
    this.emit('memory.queried', {
      text: query.text,
      scopes: query.scopes,
      resultCount,
      durationMs,
    });
  }

  /**
   * Emit memory.ranked event.
   */
  public emitRanked(scores: readonly MemoryScore[]): void {
    this.emit('memory.ranked', {
      count: scores.length,
      topScore: scores[0]?.score,
    });
  }

  /**
   * Emit memory.indexed event.
   */
  public emitIndexed(memoryId: string, chunkCount: number): void {
    this.emit('memory.indexed', { memoryId, chunkCount });
  }

  /**
   * Emit memory.expired event.
   */
  public emitExpired(memoryId: string): void {
    this.emit('memory.expired', { memoryId });
  }

  /**
   * Emit memory.evicted event.
   */
  public emitEvicted(memoryId: string, reason: string): void {
    this.emit('memory.evicted', { memoryId, reason });
  }

  /**
   * Get all recorded events.
   */
  public getEvents(): readonly MemoryEvent[] {
    return this.events;
  }

  /**
   * Get events of a specific type.
   */
  public getEventsByType(type: MemoryEventType): readonly MemoryEvent[] {
    return this.events.filter((e) => e.type === type);
  }

  /**
   * Clear recorded events.
   */
  public clearEvents(): void {
    this.events.length = 0;
  }
}
