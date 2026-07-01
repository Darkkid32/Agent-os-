# Execution Loop Architecture

**Layer**: 4 (Application)  
**Package**: `packages/hermes/src/execution/`  
**Phase**: 9.5

## Overview

The Execution Loop transforms Hermes from a planning system into an autonomous execution engine. It consumes plans from the Planning Engine, retrieves context from the Memory Manager, executes tools through the Tool Executor, observes results, retries when appropriate, requests replanning when necessary, and completes goals.

## Design Principles

1. **Single Orchestrator** — The Execution Loop is the ONLY component responsible for orchestrating execution.
2. **Abstraction Boundaries** — Never talks directly to LLM providers, plugins, storage, or performs planning/memory logic.
3. **Observable** — All state changes emit events for monitoring and debugging.
4. **Resilient** — Supports retry, replanning, checkpoints, and cooperative cancellation.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    ExecutionEngine                       │
│  High-level orchestrator tying planning + memory +      │
│  tool execution                                         │
├─────────────────────────────────────────────────────────┤
│                    ExecutionLoop                         │
│  Main execution loop — step-by-step execution with      │
│  retry, replanning, and checkpoints                     │
├─────────────────────────────────────────────────────────┤
│  ExecutionState │ ExecutionRetry │ ExecutionCheckpoint  │
│  (State Machine)│ (Retry Logic)  │ (Checkpoint Mgmt)   │
├─────────────────────────────────────────────────────────┤
│  ExecutionEvents │ ExecutionHistory │ ExecutionValidator │
│  (Event Emitter) │ (History Track)  │ (Validation)       │
├─────────────────────────────────────────────────────────┤
│  ExecutionContext │ ExecutionSerializer │ ExecutionPolicy │
│  (State Holder)   │ (Serialization)      │ (Policy Rules)  │
└─────────────────────────────────────────────────────────┘
```

## Core Components

### ExecutionLoop

The main execution loop. Orchestrates step execution, retry, replanning, and completion.

- **`execute(context, stepExecutor, replanCallback?)`** — Execute a plan step by step
- **`pause(context)`** — Pause execution
- **`resume(context)`** — Resume execution
- **`cancel(context, reason)`** — Cancel execution

### ExecutionEngine

High-level orchestrator tying together PlanningFunction, MemoryFunction, and StepExecutor.

- **`execute(request)`** — Full lifecycle: retrieve memory → create plan → execute
- **`getSummary(context)`** — Get execution summary

### ExecutionContext

Holds all state for a single execution: IDs, goal, plan, step results, checkpoints, history, retry manager, state machine.

### ExecutionStateMachine

Manages valid state transitions for both execution and steps.

**Execution states**: pending → running → [waiting | retrying | replanning | completed | cancelled | failed | paused]

**Step states**: pending → running → [completed | failed | retrying | waiting | skipped]

### RetryManager

Manages retry attempts with configurable strategies: none, fixed, exponential-backoff.

### ExecutionEventEmitter

Event emitter for execution lifecycle events. 14 event types covering the full execution lifecycle.

## Execution Flow

1. **Initialize** — Create ExecutionContext with IDs, goal, and options
2. **Set Plan** — Assign plan from Planning Engine
3. **Start** — Transition to 'running', emit ExecutionStarted
4. **For each step**:
   a. Check for cancellation
   b. Check if paused
   c. Execute step via StepExecutor
   d. Observe result
   e. If success: checkpoint, move to next step
   f. If failure: retry (if allowed) or replan (if callback provided) or fail
5. **Complete** — All steps done, transition to 'completed'

## Event Types

| Event | Description |
|-------|-------------|
| ExecutionStarted | Execution began |
| ExecutionProgress | Step completed (with counts) |
| ExecutionPaused | Execution paused |
| ExecutionResumed | Execution resumed |
| ExecutionCompleted | All steps finished |
| ExecutionFailed | Execution failed |
| ExecutionCancelled | Execution cancelled |
| StepStarted | Step execution began |
| StepCompleted | Step finished successfully |
| StepFailed | Step execution failed |
| RetryStarted | Retry attempt starting |
| RetryCompleted | Retry attempt finished |
| CheckpointCreated | Checkpoint saved |
| CurrentStepChanged | Current step index changed |

## Error Handling

- **ExecutionCancelledError** — Execution was cancelled (cooperative or signal)
- **StepFailedError** — Step failed without retry/replan
- **RetryExhaustedError** — All retry attempts used
- **InvalidStateTransitionError** — Invalid state machine transition

## Future Enhancements (Not Implemented)

- Persistent checkpoint storage
- Live dashboard monitoring
- Distributed execution
- Multi-agent coordination
- Human approval workflows
