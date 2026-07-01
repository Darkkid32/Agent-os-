/**
 * @agent-os/memory — Memory retrieval framework
 *
 * Provider-independent memory with ranking, filtering, and policies.
 * Memory is a retrieval service, NOT a database.
 *
 * Layer: 2 (Platform)
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type {
  MemoryId,
  MemoryScope,
  MemorySource,
  MemoryMetadata,
  MemoryRecord,
  MemoryChunk,
  MemoryQuery,
  MemoryScore,
  MemoryResult,
  MemoryPolicy,
  MemoryStore,
  MemoryFilter,
  MemoryProvider,
  MemoryRetrievalContext,
} from './MemoryTypes.js';

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export {
  MemoryError,
  MemoryNotFoundError,
  MemoryStoreFailedError,
  MemoryRetrievalFailedError,
  MemoryProviderUnavailableError,
  MemoryValidationFailedError,
  MemoryDuplicateError,
  MemoryQuotaExceededError,
  MemoryPolicyViolationError,
  MemoryIndexFailedError,
  isMemoryError,
} from './MemoryErrors.js';
export type { MemoryErrorCode } from './MemoryErrors.js';

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export { InMemoryProvider } from './MemoryProvider.js';

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

export { MemoryProviderRegistry } from './MemoryRegistry.js';

// ---------------------------------------------------------------------------
// Filters
// ---------------------------------------------------------------------------

export {
  filterByPredicate,
  filterByScope,
  filterByPluginId,
  filterByUserId,
  filterByProjectId,
  filterByTags,
  filterByImportance,
  excludeReadOnly,
  filterByMetadata,
  applyFilter,
  queryToFilter,
} from './MemoryFilters.js';

// ---------------------------------------------------------------------------
// Ranking
// ---------------------------------------------------------------------------

export {
  rankMemories,
  cosineSimilarity,
  deduplicateScores,
  calculateRelevance,
  calculateImportance,
  calculateRecency,
  calculateSourcePriority,
} from './MemoryRanking.js';
export type { RankingOptions } from './MemoryRanking.js';

// ---------------------------------------------------------------------------
// Policies
// ---------------------------------------------------------------------------

export {
  DEFAULT_POLICIES,
  getDefaultPolicy,
  isExpired,
  filterExpired,
  isPinned,
  calculateEvictionCount,
  selectEvictionCandidates,
  canCreate,
} from './MemoryPolicies.js';

// ---------------------------------------------------------------------------
// Indexer
// ---------------------------------------------------------------------------

export { MemoryIndexer } from './MemoryIndexer.js';
export type { MemoryIndexerOptions } from './MemoryIndexer.js';

// ---------------------------------------------------------------------------
// Retriever
// ---------------------------------------------------------------------------

export { MemoryRetriever } from './MemoryRetriever.js';
export type { MemoryRetrieverOptions } from './MemoryRetriever.js';

// ---------------------------------------------------------------------------
// Observability
// ---------------------------------------------------------------------------

export { MemoryObservability } from './MemoryObservability.js';
export type { MemoryEventType, MemoryEvent, MemoryEventHandler } from './MemoryObservability.js';

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

export { MemoryContext } from './MemoryContext.js';

// ---------------------------------------------------------------------------
// Manager
// ---------------------------------------------------------------------------

export { MemoryManager } from './MemoryManager.js';
export type { MemoryManagerOptions, CreateMemoryInput } from './MemoryManager.js';
