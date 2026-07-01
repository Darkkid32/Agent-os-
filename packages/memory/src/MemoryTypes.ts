/**
 * Memory framework core types.
 *
 * Memory is a retrieval service — NOT a database.
 * The planner never queries storage directly.
 * Hermes communicates through a Memory Manager abstraction.
 *
 * Layer: 2 (Platform)
 * Dependencies: @agent-os/core
 */

// ---------------------------------------------------------------------------
// Memory ID
// ---------------------------------------------------------------------------

export type MemoryId = string;

// ---------------------------------------------------------------------------
// Memory scope
// ---------------------------------------------------------------------------

/**
 * Scopes partition memory into independently searchable domains.
 */
export type MemoryScope =
  'conversation' | 'project' | 'execution' | 'plugin' | 'user' | 'knowledge' | 'system';

// ---------------------------------------------------------------------------
// Memory source
// ---------------------------------------------------------------------------

/**
 * Where a memory originated.
 */
export interface MemorySource {
  /** Plugin that created this memory */
  readonly pluginId: string;

  /** Tool that generated the content (if any) */
  readonly toolId?: string;

  /** Human-readable source label */
  readonly label: string;
}

// ---------------------------------------------------------------------------
// Memory metadata
// ---------------------------------------------------------------------------

/**
 * Arbitrary metadata attached to a memory record.
 */
export type MemoryMetadata = Readonly<Record<string, unknown>>;

// ---------------------------------------------------------------------------
// Memory record
// ---------------------------------------------------------------------------

/**
 * A single stored memory.
 */
export interface MemoryRecord {
  /** Unique identifier */
  readonly id: MemoryId;

  /** Memory scope (conversation, project, etc.) */
  readonly scope: MemoryScope;

  /** Content of the memory */
  readonly content: string;

  /** Semantic embedding vector (if available) */
  readonly embedding?: readonly number[];

  /** Where this memory came from */
  readonly source: MemorySource;

  /** User ID this memory belongs to (if applicable) */
  readonly userId?: string;

  /** Project ID this memory belongs to (if applicable) */
  readonly projectId?: string;

  /** Tags for filtering */
  readonly tags: readonly string[];

  /** Importance score (0.0 to 1.0) */
  readonly importance: number;

  /** Arbitrary metadata */
  readonly metadata: MemoryMetadata;

  /** When the memory was created */
  readonly createdAt: string;

  /** When the memory was last accessed */
  readonly lastAccessedAt: string;

  /** Number of times accessed */
  readonly accessCount: number;

  /** TTL in ms (undefined = no expiration) */
  readonly ttlMs?: number | undefined;

  /** Whether this memory is read-only */
  readonly readOnly: boolean;

  /** Visibility level */
  readonly visibility: 'private' | 'shared' | 'public';
}

// ---------------------------------------------------------------------------
// Memory chunk
// ---------------------------------------------------------------------------

/**
 * A chunk of content extracted from a source.
 * Used for indexing large documents.
 */
export interface MemoryChunk {
  /** Unique chunk identifier */
  readonly id: string;

  /** Parent memory ID */
  readonly parentId: MemoryId;

  /** Chunk content */
  readonly content: string;

  /** Chunk index within parent */
  readonly index: number;

  /** Semantic embedding (if computed) */
  readonly embedding?: readonly number[];

  /** Metadata */
  readonly metadata: MemoryMetadata;
}

// ---------------------------------------------------------------------------
// Memory query
// ---------------------------------------------------------------------------

/**
 * A query against the memory store.
 */
export interface MemoryQuery {
  /** Search text */
  readonly text: string;

  /** Query embedding vector (if available) */
  readonly embedding?: readonly number[];

  /** Scopes to search (empty = all) */
  readonly scopes?: readonly MemoryScope[];

  /** Plugin IDs to filter by */
  readonly pluginIds?: readonly string[];

  /** User ID to filter by */
  readonly userId?: string;

  /** Project ID to filter by */
  readonly projectId?: string;

  /** Tags to filter by */
  readonly tags?: readonly string[];

  /** Minimum importance threshold */
  readonly minImportance?: number;

  /** Maximum number of results */
  readonly maxResults?: number;

  /** Minimum similarity score */
  readonly minScore?: number;

  /** Include read-only memories */
  readonly includeReadOnly?: boolean;

  /** Request ID for tracing */
  readonly requestId?: string;
}

// ---------------------------------------------------------------------------
// Memory score
// ---------------------------------------------------------------------------

/**
 * A scored memory result.
 */
export interface MemoryScore {
  /** The memory record */
  readonly record: MemoryRecord;

  /** Combined relevance score (0.0 to 1.0) */
  readonly score: number;

  /** Component scores */
  readonly components: {
    readonly relevance: number;
    readonly importance: number;
    readonly recency: number;
    readonly sourcePriority: number;
  };
}

// ---------------------------------------------------------------------------
// Memory result
// ---------------------------------------------------------------------------

/**
 * Result of a memory query.
 */
export interface MemoryResult {
  /** Ranked results */
  readonly scores: readonly MemoryScore[];

  /** Total results before ranking */
  readonly totalBeforeRanking: number;

  /** Query duration in ms */
  readonly durationMs: number;

  /** Whether results were cached */
  readonly cached: boolean;
}

// ---------------------------------------------------------------------------
// Memory policy
// ---------------------------------------------------------------------------

/**
 * Policy controlling memory lifecycle and behavior.
 */
export interface MemoryPolicy {
  /** Policy identifier */
  readonly id: string;

  /** Human-readable description */
  readonly description: string;

  /** TTL in ms (undefined = no expiration) */
  readonly ttlMs?: number | undefined;

  /** Maximum number of memories in scope */
  readonly maxCount?: number | undefined;

  /** Maximum total size in bytes */
  readonly maxSizeBytes?: number | undefined;

  /** Whether memories are pinned (survive eviction) */
  readonly pinned: boolean;

  /** Default importance for new memories */
  readonly defaultImportance: number;

  /** Default visibility */
  readonly defaultVisibility: 'private' | 'shared' | 'public';
}

// ---------------------------------------------------------------------------
// Memory store (low-level)
// ---------------------------------------------------------------------------

/**
 * Low-level storage operations.
 * Higher-level services (Manager, Retriever) sit above this.
 */
export interface MemoryStore {
  /** Store a memory record */
  put(record: MemoryRecord): Promise<void>;

  /** Retrieve a memory by ID */
  get(id: MemoryId): Promise<MemoryRecord | undefined>;

  /** Delete a memory by ID */
  delete(id: MemoryId): Promise<boolean>;

  /** Query records matching a filter */
  query(filter: MemoryFilter): Promise<readonly MemoryRecord[]>;

  /** Count records matching a filter */
  count(filter: MemoryFilter): Promise<number>;

  /** List all records (with optional limit) */
  list(limit?: number): Promise<readonly MemoryRecord[]>;
}

// ---------------------------------------------------------------------------
// Memory filter (internal)
// ---------------------------------------------------------------------------

/**
 * Filter for querying the memory store.
 */
export interface MemoryFilter {
  readonly scopes?: readonly MemoryScope[];
  readonly pluginIds?: readonly string[];
  readonly userId?: string;
  readonly projectId?: string;
  readonly tags?: readonly string[];
  readonly minImportance?: number;
  readonly includeReadOnly?: boolean;
  readonly query?: string;
}

// ---------------------------------------------------------------------------
// Memory provider interface
// ---------------------------------------------------------------------------

/**
 * A memory provider is a storage backend.
 * Hermes never knows which backend exists.
 */
export interface MemoryProvider {
  /** Provider identifier */
  readonly id: string;

  /** Human-readable name */
  readonly name: string;

  /** Initialize the provider */
  initialize(): Promise<void>;

  /** Store a record */
  store(record: MemoryRecord): Promise<void>;

  /** Retrieve by ID */
  retrieve(id: MemoryId): Promise<MemoryRecord | undefined>;

  /** Delete by ID */
  remove(id: MemoryId): Promise<boolean>;

  /** Query records */
  search(query: MemoryQuery): Promise<readonly MemoryRecord[]>;

  /** Count records */
  count(filter?: MemoryFilter): Promise<number>;

  /** Close the provider */
  close(): Promise<void>;
}

// ---------------------------------------------------------------------------
// Memory retrieval context
// ---------------------------------------------------------------------------

/**
 * Context passed to the planner for memory-augmented planning.
 */
export interface MemoryRetrievalContext {
  /** Retrieved memories */
  readonly memories: readonly MemoryRecord[];

  /** Ranked results */
  readonly scores: readonly MemoryScore[];

  /** Query that produced these results */
  readonly query: string;

  /** Retrieval duration in ms */
  readonly durationMs: number;
}
