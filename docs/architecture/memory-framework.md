# Memory Framework

Phase 9.4 — `@agent-os/memory` (Layer 2)

## Purpose

Provider-independent memory retrieval framework. Memory is a **retrieval service**, NOT a database. Hermes never knows which backend exists. The planner never queries storage directly — it communicates through the `MemoryManager` abstraction.

## Architecture

```
┌─────────────────────────────────────────────────┐
│  Planner (Layer 3)                              │
│  receives MemoryContext                          │
└─────────────────────────────────────────────────┘
           ▲
           │ getContext(query)
           │
┌─────────────────────────────────────────────────┐
│  MemoryManager                                  │
│  - store() / retrieve() / delete() / query()    │
│  - getContext() → MemoryContext                  │
│  - policy enforcement                            │
│  - observability events                          │
└─────────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────┐
│  MemoryRetriever     MemoryIndexer               │
│  - execute queries    - chunk content            │
│  - rank results       - index records            │
│  - caching                                     │
└─────────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────┐
│  MemoryProvider (interface)                      │
│  InMemoryProvider (default)                      │
│  Pluggable backends via MemoryProviderRegistry   │
└─────────────────────────────────────────────────┘
```

## Scopes

| Scope         | TTL         | Max Count | Pinned | Description                    |
|---------------|-------------|-----------|--------|--------------------------------|
| conversation  | 1 hour      | 1,000     | no     | Conversation context           |
| project       | 7 days      | 5,000     | no     | Project-specific knowledge     |
| execution     | 1 hour      | 500       | no     | Tool execution results         |
| plugin        | 30 days     | 2,000     | no     | Plugin-provided memories       |
| user          | 1 year      | 10,000    | no     | User preferences/history       |
| knowledge     | 1 year      | 50,000    | no     | Knowledge base entries         |
| system        | no expiry   | 1,000     | yes    | System configuration           |

## Ranking

Memories are scored on four dimensions:

- **Relevance** (40%) — semantic similarity via cosine distance
- **Importance** (30%) — explicit importance score (0.0–1.0)
- **Recency** (20%) — decays over 30 days since last access
- **Source Priority** (10%) — execution > conversation > project > knowledge > user > plugin > system

## Files

| File                    | Purpose                                      |
|-------------------------|----------------------------------------------|
| `MemoryTypes.ts`        | All core types (MemoryRecord, Query, etc.)   |
| `MemoryErrors.ts`       | Error hierarchy with type guard               |
| `MemoryProvider.ts`     | Provider interface + InMemoryProvider         |
| `MemoryRegistry.ts`     | Provider registry for dynamic backends        |
| `MemoryFilters.ts`      | Filter functions (scope, tags, importance)    |
| `MemoryRanking.ts`      | Scoring and ranking engine                    |
| `MemoryPolicies.ts`     | TTL, retention, eviction policies             |
| `MemoryIndexer.ts`      | Content chunking and indexing                  |
| `MemoryRetriever.ts`    | Query execution, ranking, caching             |
| `MemoryObservability.ts`| Events for monitoring and debugging           |
| `MemoryContext.ts`      | Context object for planner integration        |
| `MemoryManager.ts`      | Main abstraction — store, retrieve, rank      |

## Usage

```typescript
import { MemoryManager, InMemoryProvider } from '@agent-os/memory';

const provider = new InMemoryProvider();
const manager = new MemoryManager(provider);
await manager.initialize();

// Store a memory
await manager.store({
  scope: 'conversation',
  content: 'User prefers dark mode',
  source: { pluginId: 'ui', label: 'UI Plugin' },
  importance: 0.8,
});

// Query memories
const result = await manager.query({ text: 'dark mode' });

// Get context for planner
const context = await manager.getContext({ text: 'dark mode preferences' });
const topMemories = context.getTopMemories(3);
```
