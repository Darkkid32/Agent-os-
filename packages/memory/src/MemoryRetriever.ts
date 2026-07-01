/**
 * Memory retrieval service.
 *
 * Handles query execution, filtering, ranking, and result assembly.
 *
 * Layer: 2 (Platform)
 */

import type { MemoryProvider, MemoryQuery, MemoryResult, MemoryRecord } from './MemoryTypes.js';
import { rankMemories } from './MemoryRanking.js';
import { MemoryRetrievalFailedError } from './MemoryErrors.js';

// ---------------------------------------------------------------------------
// Retriever options
// ---------------------------------------------------------------------------

export interface MemoryRetrieverOptions {
  /** Default maximum results per query — default 10 */
  readonly defaultMaxResults?: number;

  /** Enable result caching — default false */
  readonly enableCaching?: boolean;

  /** Cache TTL in ms — default 60000 (1 minute) */
  readonly cacheTtlMs?: number;
}

// ---------------------------------------------------------------------------
// Cache entry
// ---------------------------------------------------------------------------

interface CacheEntry {
  readonly result: MemoryResult;
  readonly timestamp: number;
}

// ---------------------------------------------------------------------------
// MemoryRetriever
// ---------------------------------------------------------------------------

/**
 * Retrieval service that queries providers and ranks results.
 */
export class MemoryRetriever {
  private readonly provider: MemoryProvider;
  private readonly options: Required<MemoryRetrieverOptions>;
  private readonly cache = new Map<string, CacheEntry>();

  constructor(provider: MemoryProvider, options?: MemoryRetrieverOptions) {
    this.provider = provider;
    this.options = {
      defaultMaxResults: options?.defaultMaxResults ?? 10,
      enableCaching: options?.enableCaching ?? false,
      cacheTtlMs: options?.cacheTtlMs ?? 60000,
    };
  }

  /**
   * Execute a memory query.
   */
  public async query(q: MemoryQuery): Promise<MemoryResult> {
    const startTime = Date.now();

    // Check cache
    if (this.options.enableCaching) {
      const cached = this.getFromCache(q);
      if (cached !== undefined) {
        return cached;
      }
    }

    try {
      // Query provider
      const records = await this.provider.search(q);

      // Apply additional filters
      const filtered = this.applyQueryFilters(records, q);

      // Rank results
      const scores = rankMemories(filtered, {
        maxResults: q.maxResults ?? this.options.defaultMaxResults,
        ...(q.minScore !== undefined ? { minScore: q.minScore } : {}),
      });

      const result: MemoryResult = {
        scores,
        totalBeforeRanking: filtered.length,
        durationMs: Date.now() - startTime,
        cached: false,
      };

      // Cache result
      if (this.options.enableCaching) {
        this.setCache(q, result);
      }

      return result;
    } catch (error) {
      throw new MemoryRetrievalFailedError(
        `Query failed: ${error instanceof Error ? error.message : String(error)}`,
        { cause: error },
      );
    }
  }

  /**
   * Get a single memory by ID.
   */
  public async getById(id: string): Promise<MemoryRecord | undefined> {
    return this.provider.retrieve(id);
  }

  /**
   * Clear the cache.
   */
  public clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache size.
   */
  public getCacheSize(): number {
    return this.cache.size;
  }

  private applyQueryFilters(
    records: readonly MemoryRecord[],
    q: MemoryQuery,
  ): readonly MemoryRecord[] {
    let result = records;

    // Text search (simple substring match)
    if (q.text.length > 0) {
      const lower = q.text.toLowerCase();
      result = result.filter((r) => r.content.toLowerCase().includes(lower));
    }

    return result;
  }

  private getCacheKey(q: MemoryQuery): string {
    return JSON.stringify({
      text: q.text,
      scopes: q.scopes,
      pluginIds: q.pluginIds,
      userId: q.userId,
      projectId: q.projectId,
      tags: q.tags,
      maxResults: q.maxResults,
    });
  }

  private getFromCache(q: MemoryQuery): MemoryResult | undefined {
    const key = this.getCacheKey(q);
    const entry = this.cache.get(key);
    if (entry === undefined) return undefined;
    if (Date.now() - entry.timestamp > this.options.cacheTtlMs) {
      this.cache.delete(key);
      return undefined;
    }
    return { ...entry.result, cached: true };
  }

  private setCache(q: MemoryQuery, result: MemoryResult): void {
    const key = this.getCacheKey(q);
    this.cache.set(key, { result, timestamp: Date.now() });
  }
}
