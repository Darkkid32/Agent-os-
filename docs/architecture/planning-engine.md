# Planning Engine — Architecture

**Layer:** 2 (Platform) · **Package:** `@agent-os/llm` · **Status:** Phase 9.3

## Overview

The planning engine transforms a user's goal into a structured execution plan. The planner NEVER executes tools — it only reasons and produces plans.

```
User Goal
    │
    ▼
┌─────────────────────────────────┐
│         PlanningEngine          │
│                                 │
│  1. Validate inputs             │
│  2. Create PlanningContext      │
│  3. Select strategy             │
│  4. Generate plan               │
│  5. Validate plan               │
│  6. Emit events                 │
└────────────┬────────────────────┘
             │
             ▼
      Execution Plan (PlanResult)
             │
             ▼
   (Phase 9.5 Execution Loop)
             │
             ▼
   Tool Executor (Phase 9.2)
```

## Components

### PlanningEngine

The main orchestrator. Implements the `Planner` interface.

```typescript
const engine = new PlanningEngine();
const response = await engine.plan({
  goal: 'Search for information about cats',
  availableTools: tools,
  preferredStrategy: 'sequential',
});
```

**Responsibilities:**
- Validate inputs (goal, tools, strategy)
- Create `PlanningContext` with defaults
- Select and apply planning strategy
- Generate ordered steps with dependencies
- Validate the plan (cycles, missing tools, etc.)
- Emit observability events
- Return `PlanningResponse` (plan or error)

### PlanningContext

Immutable context holding all planner inputs:

| Field | Default | Description |
|---|---|---|
| `goal` | (required) | User's goal text |
| `availableTools` | `[]` | Tool definitions |
| `availablePlugins` | `[]` | Plugin IDs |
| `systemContext` | `''` | System prompt |
| `preferredStrategy` | `'sequential'` | Planning strategy |
| `maxSteps` | `50` | Maximum steps |
| `constraints` | `[]` | Execution constraints |
| `requestId` | `''` | Tracing ID |

### Planning Strategies

Three built-in strategies:

| Strategy | Dependencies | Use Case |
|---|---|---|
| `SequentialStrategy` | Each step depends on previous | Linear workflows |
| `ParallelStrategy` | No implicit dependencies | Independent tasks |
| `ConditionalStrategy` | Explicit only | Branching logic |

**Pluggable:** Register custom strategies via `registerStrategy()`.

### Plan Structure

```typescript
interface PlanResult {
  id: string;
  goal: PlanGoal;
  strategy: 'sequential' | 'parallel' | 'conditional';
  steps: PlanStep[];
  dependencies: PlanDependency[];
  requiredTools: string[];
  expectedOutputs: string[];
  complexity: 'trivial' | 'simple' | 'moderate' | 'complex' | 'very-complex';
  risk: 'none' | 'low' | 'medium' | 'high';
  constraints: PlanConstraint[];
  status: PlanStatus;
  planningDurationMs: number;
  reasoningSummary: string;
}
```

Each `PlanStep` contains:
- `id` — unique identifier
- `title` / `description` — human-readable
- `tool` — optional tool ID to execute
- `arguments` — tool arguments
- `dependsOn` — step IDs that must complete first
- `expectedResult` — what this step produces
- `status` — current state

### PlanValidator

Chain validation ensures plans are structurally sound:

1. **NotEmpty** — plan has at least one step
2. **StepFields** — all steps have required fields
3. **NoDuplicateIds** — no two steps share an ID
4. **DependenciesExist** — all `dependsOn` refs point to real steps
5. **NoCycles** — dependency graph is a DAG (DFS cycle detection)
6. **ToolsExist** — all referenced tools are in the available set

### PlanSerializer

Converts plans to/from JSON-safe format:
- `serializePlan()` / `deserializePlan()` — structured conversion
- `planToJSON()` / `planFromJSON()` — JSON string round-trip

### PlanningPrompt

Generates prompts for LLM-based planners:
- `buildSystemPrompt()` — planner instructions
- `buildUserPrompt()` — goal + tools + constraints
- `buildReplanPrompt()` — recovery after failure

### PlanningErrors

12 error classes:

| Error | Code | When |
|---|---|---|
| `PlanningFailedError` | `PLANNING_FAILED` | General failure |
| `InvalidGoalError` | `INVALID_GOAL` | Empty/invalid goal |
| `NoToolsAvailableError` | `NO_TOOLS_AVAILABLE` | No tools provided |
| `StrategyNotSupportedError` | `STRATEGY_NOT_SUPPORTED` | Unknown strategy |
| `MaxStepsExceededError` | `MAX_STEPS_EXCEEDED` | Too many steps |
| `PlanValidationError` | `VALIDATION_FAILED` | Plan has errors |
| `CycleDetectedError` | `CYCLE_DETECTED` | Dependency cycle |
| `MissingDependencyError` | `MISSING_DEPENDENCY` | Unknown step ref |
| `DuplicateStepIdError` | `DUPLICATE_STEP_ID` | Repeated step ID |
| `EmptyPlanError` | `EMPTY_PLAN` | No steps |
| `ToolNotFoundError` | `TOOL_NOT_FOUND` | Unknown tool ref |
| `InvalidDependencyError` | `INVALID_DEPENDENCY` | Bad dependency |

### Observability

Events emitted during planning:

| Event | When |
|---|---|
| `PlanningStarted` | Plan generation begins |
| `PlanCreated` | Plan structure generated |
| `PlanValidated` | Validation completed |
| `PlanRejected` | Validation failed |
| `PlanningCompleted` | Plan ready |
| `PlanningFailed` | Error occurred |

## Files

| File | Purpose |
|---|---|
| `planning/types.ts` | All type definitions |
| `planning/PlanningErrors.ts` | Error hierarchy |
| `planning/PlanningContext.ts` | Context creation + helpers |
| `planning/PlanningStrategy.ts` | Strategy implementations + registry |
| `planning/PlanningValidator.ts` | Plan validation chain |
| `planning/PlanSerializer.ts` | JSON serialization |
| `planning/PlanningPrompt.ts` | Prompt generation |
| `planning/Planner.ts` | Core planner interface |
| `planning/PlanningEngine.ts` | Main engine implementation |
| `planning/index.ts` | Barrel export |

## What's NOT in Scope (Phase 9.3)

- LLM-based planning (uses rule-based for now)
- Execution loop (Phase 9.5)
- Memory retrieval (Phase 9.6)
- Dashboard visualization
