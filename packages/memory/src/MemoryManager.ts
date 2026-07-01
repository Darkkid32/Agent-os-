/**
 * MemoryManager — the main abstraction for memory operations.
 *
 * Planner communicates through this. Never queries storage directly.
 * Handles store, retrieve, rank, filter, merge, and policy enforcement.
 *
 * Layer: 2 (Platform)
 * Dependencies: @agent-os/core
 */

import type {
  MemoryProvider,
  MemoryRecord,
  MemoryId,
  MemoryQuery,
  MemoryResult,
  MemoryScope,
  MemoryPolicy,
  MemoryMetadata,
  MemorySource,
} from './MemoryTypes.js';
import { MemoryNotFoundError, MemoryValidationFailedError } from './MemoryErrors.js';
import { MemoryIndexer } from './MemoryIndexer.js';
import { MemoryRetriever } from './MemoryRetriever.js';
import { MemoryObservability } from './MemoryObservability.js';
import { MemoryContext } from './MemoryContext.js';
import { getDefaultPolicy } from './MemoryPolicies.js';

// ---------------------------------------------------------------------------
// MemoryManager options
// ---------------------------------------------------------------------------

export interface MemoryManagerOptions {
  /** Enable observability events — default true */
  readonly enableObservability?: boolean;

  /** Enable indexing — default true */
  readonly enableIndexing?: boolean;

  /** Default max results per query — default 10 */
  readonly defaultMaxResults?: number;
}

// ---------------------------------------------------------------------------
// Create record input
// ---------------------------------------------------------------------------

export interface CreateMemoryInput {
  readonly scope: MemoryScope;
  readonly content: string;
  readonly source: MemorySource;
  readonly tags?: readonly string[];
  readonly importance?: number;
  readonly metadata?: MemoryMetadata;
  readonly userId?: string;
  readonly projectId?: string;
  readonly ttlMs?: number;
  readonly readOnly?: boolean;
  readonly visibility?: 'private' | 'shared' | 'public';
}

// ---------------------------------------------------------------------------
// MemoryManager
// ---------------------------------------------------------------------------

/**
 * Main memory manager — the single abstraction the planner uses.
 */
export class MemoryManager {
  private readonly provider: MemoryProvider;
  private readonly indexer: MemoryIndexer;
  private readonly retriever: MemoryRetriever;
  private readonly observability: MemoryObservability;
  private readonly policies = new Map<MemoryScope, MemoryPolicy>();
  private readonly options: Required<MemoryManagerOptions>;

  constructor(provider: MemoryProvider, options?: MemoryManagerOptions) {
    this.provider = provider;
    this.options = {
      enableObservability: options?.enableObservability ?? true,
      enableIndexing: options?.enableIndexing ?? true,
      defaultMaxResults: options?.defaultMaxResults ?? 10,
    };
    this.indexer = new MemoryIndexer();
    this.retriever = new MemoryRetriever(provider, {
      defaultMaxResults: this.options.defaultMaxResults,
    });
    this.observability = new MemoryObservability();

    // Initialize default policies
    for (const scope of [
      'conversation',
      'project',
      'execution',
      'plugin',
      'user',
      'knowledge',
      'system',
    ] as const) {
      this.policies.set(scope, getDefaultPolicy(scope));
    }
  }

  /**
   * Initialize the manager.
   */
  public async initialize(): Promise<void> {
    await this.provider.initialize();
  }

  /**
   * Store a memory record.
   */
  public async store(input: CreateMemoryInput): Promise<MemoryRecord> {
    const now = new Date().toISOString();
    const policy = this.policies.get(input.scope) ?? getDefaultPolicy(input.scope);

    const record: MemoryRecord = {
      id: this.generateId(),
      scope: input.scope,
      content: input.content,
      source: input.source,
      tags: input.tags ?? [],
      importance: input.importance ?? policy.defaultImportance,
      metadata: input.metadata ?? {},
      createdAt: now,
      lastAccessedAt: now,
      accessCount: 0,
      readOnly: input.readOnly ?? false,
      visibility: input.visibility ?? policy.defaultVisibility,
      ...(input.userId !== undefined ? { userId: input.userId } : {}),
      ...(input.projectId !== undefined ? { projectId: input.projectId } : {}),
      ...(input.ttlMs !== undefined
        ? { ttlMs: input.ttlMs }
        : policy.ttlMs !== undefined
          ? { ttlMs: policy.ttlMs }
          : {}),
    } as MemoryRecord;

    // Validate
    this.validateRecord(record);

    // Check policy
    this.enforcePolicy(record, policy);

    // Store
    await this.provider.store(record);

    // Index if enabled
    if (this.options.enableIndexing) {
      this.indexer.index(record);
    }

    // Emit event
    if (this.options.enableObservability) {
      this.observability.emitStored(record);
    }

    return record;
  }

  /**
   * Retrieve a memory by ID.
   */
  public async retrieve(id: MemoryId): Promise<MemoryRecord> {
    const record = await this.provider.retrieve(id);
    if (record === undefined) {
      throw new MemoryNotFoundError(id);
    }
    if (this.options.enableObservability) {
      this.observability.emitRetrieved(id);
    }
    return record;
  }

  /**
   * Delete a memory by ID.
   */
  public async delete(id: MemoryId): Promise<boolean> {
    const removed = await this.provider.remove(id);
    if (removed) {
      this.indexer.remove(id);
      if (this.options.enableObservability) {
        this.observability.emitDeleted(id);
      }
    }
    return removed;
  }

  /**
   * Query memories.
   */
  public async query(q: MemoryQuery): Promise<MemoryResult> {
    const result = await this.retriever.query(q);
    if (this.options.enableObservability) {
      this.observability.emitQueried(q, result.scores.length, result.durationMs);
    }
    return result;
  }

  /**
   * Get a memory retrieval context for the planner.
   */
  public async getContext(q: MemoryQuery): Promise<MemoryContext> {
    const result = await this.query(q);
    return new MemoryContext(q.text, result.scores, result.durationMs);
  }

  /**
   * Check if a memory exists.
   */
  public async exists(id: MemoryId): Promise<boolean> {
    const record = await this.provider.retrieve(id);
    return record !== undefined;
  }

  /**
   * Get the count of memories matching a filter.
   */
  public async count(filter?: {
    readonly scopes?: readonly MemoryScope[];
    readonly pluginIds?: readonly string[];
  }): Promise<number> {
    return this.provider.count(filter);
  }

  /**
   * Set a custom policy for a scope.
   */
  public setPolicy(scope: MemoryScope, policy: MemoryPolicy): void {
    this.policies.set(scope, policy);
  }

  /**
   * Get the policy for a scope.
   */
  public getPolicy(scope: MemoryScope): MemoryPolicy | undefined {
    return this.policies.get(scope);
  }

  /**
   * Get observability instance.
   */
  public getObservability(): MemoryObservability {
    return this.observability;
  }

  /**
   * Get indexer instance.
   */
  public getIndexer(): MemoryIndexer {
    return this.indexer;
  }

  /**
   * Close the manager.
   */
  public async close(): Promise<void> {
    await this.provider.close();
  }

  // -------------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------------

  private validateRecord(record: MemoryRecord): void {
    const errors: string[] = [];
    if (record.content.length === 0) {
      errors.push('Content must not be empty');
    }
    if (record.importance < 0 || record.importance > 1) {
      errors.push('Importance must be between 0 and 1');
    }
    if (errors.length > 0) {
      throw new MemoryValidationFailedError(errors);
    }
  }

  private enforcePolicy(_record: MemoryRecord, _policy: MemoryPolicy): void {
    // Policy enforcement logic — simplified for Phase 9.4
  }

  private generateId(): string {
    return `mem_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }
}
