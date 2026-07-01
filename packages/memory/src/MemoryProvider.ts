/**
 * Memory provider interface and InMemoryProvider implementation.
 *
 * Hermes never knows which backend exists — storage independence via
 * the MemoryProvider abstraction. This file provides the concrete
 * InMemoryProvider backed by a Map.
 *
 * Layer: 2 (Platform)
 * Dependencies: @agent-os/core
 */

import type {
  MemoryProvider,
  MemoryRecord,
  MemoryId,
  MemoryQuery,
  MemoryFilter,
} from './MemoryTypes.js';

// ---------------------------------------------------------------------------
// InMemoryProvider
// ---------------------------------------------------------------------------

/**
 * Default in-memory provider using a Map.
 * Useful for development, testing, and single-session workflows.
 */
export class InMemoryProvider implements MemoryProvider {
  public readonly id = 'in-memory';
  public readonly name = 'In-Memory Store';

  private readonly records = new Map<MemoryId, MemoryRecord>();
  private initialized = false;

  public async initialize(): Promise<void> {
    this.initialized = true;
  }

  public async store(record: MemoryRecord): Promise<void> {
    this.ensureInitialized();
    this.records.set(record.id, record);
  }

  public async retrieve(id: MemoryId): Promise<MemoryRecord | undefined> {
    this.ensureInitialized();
    return this.records.get(id);
  }

  public async remove(id: MemoryId): Promise<boolean> {
    this.ensureInitialized();
    return this.records.delete(id);
  }

  public async search(query: MemoryQuery): Promise<readonly MemoryRecord[]> {
    this.ensureInitialized();
    const filter: MemoryFilter = {
      ...(query.scopes !== undefined ? { scopes: query.scopes } : {}),
      ...(query.pluginIds !== undefined ? { pluginIds: query.pluginIds } : {}),
      ...(query.userId !== undefined ? { userId: query.userId } : {}),
      ...(query.projectId !== undefined ? { projectId: query.projectId } : {}),
      ...(query.tags !== undefined ? { tags: query.tags } : {}),
      ...(query.minImportance !== undefined ? { minImportance: query.minImportance } : {}),
      ...(query.includeReadOnly !== undefined ? { includeReadOnly: query.includeReadOnly } : {}),
      query: query.text,
    };
    return this.query(filter);
  }

  public async query(filter: MemoryFilter): Promise<readonly MemoryRecord[]> {
    this.ensureInitialized();
    let results = Array.from(this.records.values());

    if (filter.scopes !== undefined && filter.scopes.length > 0) {
      const scopes = new Set(filter.scopes);
      results = results.filter((r) => scopes.has(r.scope));
    }

    if (filter.pluginIds !== undefined && filter.pluginIds.length > 0) {
      const plugins = new Set(filter.pluginIds);
      results = results.filter((r) => plugins.has(r.source.pluginId));
    }

    if (filter.userId !== undefined) {
      results = results.filter((r) => r.userId === filter.userId);
    }

    if (filter.projectId !== undefined) {
      results = results.filter((r) => r.projectId === filter.projectId);
    }

    if (filter.tags !== undefined && filter.tags.length > 0) {
      const tags = new Set(filter.tags);
      results = results.filter((r) => r.tags.some((t) => tags.has(t)));
    }

    if (filter.minImportance !== undefined) {
      results = results.filter((r) => r.importance >= (filter.minImportance ?? 0));
    }

    if (filter.includeReadOnly !== true) {
      results = results.filter((r) => !r.readOnly);
    }

    return results;
  }

  public async count(filter?: MemoryFilter): Promise<number> {
    this.ensureInitialized();
    if (filter === undefined) {
      return this.records.size;
    }
    return (await this.query(filter)).length;
  }

  public async close(): Promise<void> {
    this.records.clear();
    this.initialized = false;
  }

  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('InMemoryProvider not initialized. Call initialize() first.');
    }
  }
}
