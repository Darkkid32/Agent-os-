/**
 * Execution loop core types.
 *
 * The execution loop is the ONLY component responsible for orchestrating
 * execution. It consumes plans from the Planning Engine, retrieves context
 * from the Memory Manager, executes tools through the Tool Executor, and
 * observes results.
 *
 * Layer: 4 (Application)
 * Dependencies: @agent-os/core
 */

// ---------------------------------------------------------------------------
// Execution IDs
// ---------------------------------------------------------------------------

/**
 * Every execution contains these IDs for tracing and correlation.
 */
export interface ExecutionIds {
  /** Unique execution identifier */
  readonly executionId: string;

  /** Goal ID this execution is working toward */
  readonly goalId: string;

  /** Plan ID being executed */
  readonly planId: string;

  /** Session ID for grouping related executions */
  readonly sessionId: string;

  /** Parent execution ID (for nested executions) */
  readonly parentExecutionId?: string;

  /** Correlation ID for distributed tracing */
  readonly correlationId: string;
}

// ---------------------------------------------------------------------------
// Execution status
// ---------------------------------------------------------------------------

export type ExecutionStatus =
  | 'pending'
  | 'running'
  | 'waiting'
  | 'retrying'
  | 'replanning'
  | 'completed'
  | 'cancelled'
  | 'failed'
  | 'paused';

// ---------------------------------------------------------------------------
// Execution step state
// ---------------------------------------------------------------------------

export type ExecutionStepState =
  'pending' | 'running' | 'completed' | 'failed' | 'skipped' | 'retrying' | 'waiting';

// ---------------------------------------------------------------------------
// Execution step result
// ---------------------------------------------------------------------------

/**
 * Result of executing a single step.
 */
export interface ExecutionStepResult {
  /** Step ID */
  readonly stepId: string;

  /** Whether the step succeeded */
  readonly success: boolean;

  /** Step output data */
  readonly data?: unknown;

  /** Error message if failed */
  readonly error?: string;

  /** Error code if failed */
  readonly errorCode?: string;

  /** Step execution duration in ms */
  readonly durationMs: number;

  /** Number of retry attempts for this step */
  readonly retryAttempts: number;

  /** Timestamp when step completed */
  readonly completedAt: string;
}

// ---------------------------------------------------------------------------
// Execution result
// ---------------------------------------------------------------------------

/**
 * Final result of the entire execution.
 */
export interface ExecutionResult {
  /** Execution IDs */
  readonly ids: ExecutionIds;

  /** Final execution status */
  readonly status: ExecutionStatus;

  /** Whether the execution succeeded */
  readonly success: boolean;

  /** Step results in execution order */
  readonly stepResults: readonly ExecutionStepResult[];

  /** Total execution duration in ms */
  readonly durationMs: number;

  /** Error message if failed */
  readonly error?: string;

  /** Error code if failed */
  readonly errorCode?: string;

  /** Final output data */
  readonly output?: unknown;

  /** Number of steps completed */
  readonly stepsCompleted: number;

  /** Total number of steps */
  readonly totalSteps: number;

  /** Number of retry attempts across all steps */
  readonly totalRetries: number;
}

// ---------------------------------------------------------------------------
// Execution checkpoint
// ---------------------------------------------------------------------------

/**
 * Checkpoint after every completed step.
 * Persistent storage comes later.
 */
export interface ExecutionCheckpoint {
  /** Checkpoint ID */
  readonly id: string;

  /** Execution IDs */
  readonly ids: ExecutionIds;

  /** Current step being executed */
  readonly currentStepId: string;

  /** IDs of completed steps */
  readonly completedStepIds: readonly string[];

  /** IDs of remaining steps */
  readonly remainingStepIds: readonly string[];

  /** Current execution status */
  readonly status: ExecutionStatus;

  /** Step results so far */
  readonly stepResults: readonly ExecutionStepResult[];

  /** Execution statistics */
  readonly statistics: ExecutionStatistics;

  /** Timestamp when checkpoint was created */
  readonly timestamp: string;
}

// ---------------------------------------------------------------------------
// Execution statistics
// ---------------------------------------------------------------------------

export interface ExecutionStatistics {
  /** Total steps completed */
  readonly stepsCompleted: number;

  /** Total steps failed */
  readonly stepsFailed: number;

  /** Total steps skipped */
  readonly stepsSkipped: number;

  /** Total retry attempts */
  readonly retryAttempts: number;

  /** Total duration in ms */
  readonly durationMs: number;

  /** Step durations */
  readonly stepDurations: Readonly<Record<string, number>>;
}

// ---------------------------------------------------------------------------
// Execution policy
// ---------------------------------------------------------------------------

/**
 * Policies controlling execution behavior.
 */
export interface ExecutionPolicy {
  /** Maximum execution duration in ms (0 = no limit) */
  readonly maxDurationMs: number;

  /** Maximum retry attempts per step (0 = no retries) */
  readonly maxRetries: number;

  /** Maximum total steps allowed (0 = no limit) */
  readonly maxSteps: number;

  /** Default step timeout in ms (0 = no timeout) */
  readonly defaultStepTimeoutMs: number;

  /** Cancellation policy */
  readonly cancellation: 'cooperative' | 'immediate';

  /** Whether to enable checkpointing */
  readonly enableCheckpoints: boolean;
}

// ---------------------------------------------------------------------------
// Retry policy
// ---------------------------------------------------------------------------

/**
 * Policy for retrying failed steps.
 */
export interface RetryPolicy {
  /** Retry strategy */
  readonly strategy: 'none' | 'fixed' | 'exponential-backoff';

  /** Maximum number of retry attempts */
  readonly maxAttempts: number;

  /** Base delay between retries in ms */
  readonly baseDelayMs: number;

  /** Maximum delay between retries in ms */
  readonly maxDelayMs: number;

  /** Delay multiplier for exponential backoff */
  readonly multiplier: number;

  /** Conditions that trigger a retry */
  readonly retryOn: readonly string[];
}

// ---------------------------------------------------------------------------
// Execution context
// ---------------------------------------------------------------------------

/**
 * Context passed to the execution loop.
 */
export interface ExecutionContext {
  /** Execution IDs */
  readonly ids: ExecutionIds;

  /** Goal text */
  readonly goal: string;

  /** Available tool IDs */
  readonly availableTools: readonly string[];

  /** Available plugin IDs */
  readonly availablePlugins: readonly string[];

  /** Execution policy */
  readonly policy: ExecutionPolicy;

  /** Retry policy */
  readonly retryPolicy: RetryPolicy;

  /** Abort signal for cancellation */
  readonly signal?: AbortSignal;

  /** Request ID for tracing */
  readonly requestId?: string;
}

// ---------------------------------------------------------------------------
// Execution summary
// ---------------------------------------------------------------------------

/**
 * Summary of an execution for display and logging.
 */
export interface ExecutionSummary {
  /** Execution IDs */
  readonly ids: ExecutionIds;

  /** Final status */
  readonly status: ExecutionStatus;

  /** Goal text */
  readonly goal: string;

  /** Steps completed / total */
  readonly progress: string;

  /** Duration in ms */
  readonly durationMs: number;

  /** Number of retries */
  readonly retries: number;

  /** Error message if failed */
  readonly error?: string;
}

// ---------------------------------------------------------------------------
// Execution event base
// ---------------------------------------------------------------------------

export interface ExecutionEventBase {
  readonly executionId: string;
  readonly goalId: string;
  readonly planId: string;
  readonly sessionId: string;
  readonly correlationId: string;
  readonly timestamp: string;
}

// ---------------------------------------------------------------------------
// Execution events
// ---------------------------------------------------------------------------

export interface ExecutionStartedEvent extends ExecutionEventBase {
  readonly type: 'ExecutionStarted';
  readonly goal: string;
  readonly stepCount: number;
}

export interface ExecutionProgressEvent extends ExecutionEventBase {
  readonly type: 'ExecutionProgress';
  readonly currentStep: string;
  readonly completedSteps: number;
  readonly totalSteps: number;
}

export interface ExecutionPausedEvent extends ExecutionEventBase {
  readonly type: 'ExecutionPaused';
}

export interface ExecutionResumedEvent extends ExecutionEventBase {
  readonly type: 'ExecutionResumed';
}

export interface ExecutionCompletedEvent extends ExecutionEventBase {
  readonly type: 'ExecutionCompleted';
  readonly durationMs: number;
  readonly stepsCompleted: number;
  readonly totalSteps: number;
  readonly totalRetries: number;
}

export interface ExecutionFailedEvent extends ExecutionEventBase {
  readonly type: 'ExecutionFailed';
  readonly error: string;
  readonly errorCode?: string;
  readonly durationMs: number;
  readonly failedStep: string;
}

export interface ExecutionCancelledEvent extends ExecutionEventBase {
  readonly type: 'ExecutionCancelled';
  readonly reason: string;
  readonly stepsCompleted: number;
}

export interface StepStartedEvent extends ExecutionEventBase {
  readonly type: 'StepStarted';
  readonly stepId: string;
  readonly stepTitle: string;
  readonly stepIndex: number;
}

export interface StepCompletedEvent extends ExecutionEventBase {
  readonly type: 'StepCompleted';
  readonly stepId: string;
  readonly durationMs: number;
  readonly success: boolean;
}

export interface StepFailedEvent extends ExecutionEventBase {
  readonly type: 'StepFailed';
  readonly stepId: string;
  readonly error: string;
  readonly errorCode?: string;
  readonly durationMs: number;
}

export interface RetryStartedEvent extends ExecutionEventBase {
  readonly type: 'RetryStarted';
  readonly stepId: string;
  readonly attempt: number;
  readonly maxAttempts: number;
  readonly delayMs: number;
}

export interface RetryCompletedEvent extends ExecutionEventBase {
  readonly type: 'RetryCompleted';
  readonly stepId: string;
  readonly attempt: number;
  readonly success: boolean;
}

export interface CheckpointCreatedEvent extends ExecutionEventBase {
  readonly type: 'CheckpointCreated';
  readonly checkpointId: string;
  readonly completedSteps: number;
}

export interface CurrentStepChangedEvent extends ExecutionEventBase {
  readonly type: 'CurrentStepChanged';
  readonly previousStepId: string | undefined;
  readonly currentStepId: string;
}

export type ExecutionEvent =
  | ExecutionStartedEvent
  | ExecutionProgressEvent
  | ExecutionPausedEvent
  | ExecutionResumedEvent
  | ExecutionCompletedEvent
  | ExecutionFailedEvent
  | ExecutionCancelledEvent
  | StepStartedEvent
  | StepCompletedEvent
  | StepFailedEvent
  | RetryStartedEvent
  | RetryCompletedEvent
  | CheckpointCreatedEvent
  | CurrentStepChangedEvent;

/**
 * Function that receives execution events.
 */
export type ExecutionEventHandler = (event: ExecutionEvent) => void;
