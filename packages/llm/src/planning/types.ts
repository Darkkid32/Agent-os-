/**
 * Planning engine types.
 *
 * The planner transforms a user's goal into a structured execution plan.
 * The planner NEVER executes tools — it only reasons and produces plans.
 *
 * Layer: 2 (Platform)
 * Dependencies: @agent-os/core (Result)
 */

import type { ToolDefinition } from '../tools/types.js';

// ---------------------------------------------------------------------------
// Plan status
// ---------------------------------------------------------------------------

export type PlanStatus =
  'draft' | 'validated' | 'ready' | 'executing' | 'completed' | 'failed' | 'cancelled';

// ---------------------------------------------------------------------------
// Plan priority
// ---------------------------------------------------------------------------

export type PlanPriority = 'low' | 'medium' | 'high' | 'critical';

// ---------------------------------------------------------------------------
// Complexity
// ---------------------------------------------------------------------------

export type ComplexityLevel = 'trivial' | 'simple' | 'moderate' | 'complex' | 'very-complex';

// ---------------------------------------------------------------------------
// Risk level
// ---------------------------------------------------------------------------

export type RiskLevel = 'none' | 'low' | 'medium' | 'high';

// ---------------------------------------------------------------------------
// Strategy
// ---------------------------------------------------------------------------

export type PlanningStrategyType = 'sequential' | 'parallel' | 'conditional';

// ---------------------------------------------------------------------------
// Plan goal
// ---------------------------------------------------------------------------

/**
 * The user's high-level goal, parsed into structured form.
 */
export interface PlanGoal {
  /** Original user text */
  readonly raw: string;

  /** Parsed/normalized description */
  readonly description: string;

  /** Key objectives extracted from the goal */
  readonly objectives: readonly string[];

  /** Success criteria if stated */
  readonly successCriteria?: string;
}

// ---------------------------------------------------------------------------
// Plan constraint
// ---------------------------------------------------------------------------

/**
 * A constraint on how the plan can be executed.
 */
export interface PlanConstraint {
  /** Unique constraint identifier */
  readonly id: string;

  /** Human-readable description */
  readonly description: string;

  /** Constraint type */
  readonly type: 'resource' | 'time' | 'dependency' | 'security' | 'custom';

  /** Optional value associated with the constraint */
  readonly value?: string;
}

// ---------------------------------------------------------------------------
// Plan step
// ---------------------------------------------------------------------------

/**
 * A single step in the execution plan.
 * Contains NO execution logic — only the description of what to do.
 */
export interface PlanStep {
  /** Unique step identifier */
  readonly id: string;

  /** Short title for display */
  readonly title: string;

  /** Detailed description of what this step does */
  readonly description: string;

  /** Tool ID to execute (from ToolDefinition.id) */
  readonly tool?: string;

  /** Arguments to pass to the tool (keys map to tool parameter names) */
  readonly arguments?: Readonly<Record<string, unknown>>;

  /** IDs of steps that must complete before this one */
  readonly dependsOn: readonly string[];

  /** Expected output description */
  readonly expectedResult: string;

  /** Current status of this step */
  readonly status: PlanStatus;

  /** Optional metadata */
  readonly metadata?: Readonly<Record<string, unknown>>;
}

// ---------------------------------------------------------------------------
// Plan dependency
// ---------------------------------------------------------------------------

/**
 * A declared dependency between two plan steps.
 */
export interface PlanDependency {
  /** Step that depends on another */
  readonly from: string;

  /** Step being depended upon */
  readonly to: string;
}

// ---------------------------------------------------------------------------
// Plan result (output of planning)
// ---------------------------------------------------------------------------

/**
 * The output of the planning engine — a complete, validated plan.
 */
export interface PlanResult {
  /** Unique plan identifier */
  readonly id: string;

  /** The structured goal */
  readonly goal: PlanGoal;

  /** Planning strategy used */
  readonly strategy: PlanningStrategyType;

  /** Ordered steps to achieve the goal */
  readonly steps: readonly PlanStep[];

  /** Explicit dependency graph */
  readonly dependencies: readonly PlanDependency[];

  /** Tools referenced by the plan */
  readonly requiredTools: readonly string[];

  /** Expected outputs at each stage */
  readonly expectedOutputs: readonly string[];

  /** Estimated complexity */
  readonly complexity: ComplexityLevel;

  /** Risk assessment */
  readonly risk: RiskLevel;

  /** Execution constraints */
  readonly constraints: readonly PlanConstraint[];

  /** Current plan status */
  readonly status: PlanStatus;

  /** Planning duration in ms */
  readonly planningDurationMs: number;

  /** Reasoning summary from the planner */
  readonly reasoningSummary: string;
}

// ---------------------------------------------------------------------------
// Planning request
// ---------------------------------------------------------------------------

/**
 * Input to the planning engine.
 */
export interface PlanningRequest {
  /** User's goal text */
  readonly goal: string;

  /** Available tool definitions */
  readonly availableTools: readonly ToolDefinition[];

  /** System context (role, capabilities, etc.) */
  readonly systemContext?: string;

  /** Available plugin IDs */
  readonly availablePlugins?: readonly string[];

  /** Preferred strategy (if any) */
  readonly preferredStrategy?: PlanningStrategyType;

  /** Maximum number of steps allowed */
  readonly maxSteps?: number;

  /** Execution constraints */
  readonly constraints?: readonly PlanConstraint[];

  /** Request ID for tracing */
  readonly requestId?: string;
}

// ---------------------------------------------------------------------------
// Planning response
// ---------------------------------------------------------------------------

/**
 * Output from the planning engine — either a plan or an error.
 */
export interface PlanningResponse {
  /** The generated plan (if successful) */
  readonly plan?: PlanResult;

  /** Error message (if failed) */
  readonly error?: string;

  /** Error code (if failed) */
  readonly errorCode?: string;

  /** Planning duration in ms */
  readonly durationMs: number;

  /** Request ID for tracing */
  readonly requestId?: string;
}

// ---------------------------------------------------------------------------
// Planning events (dashboard)
// ---------------------------------------------------------------------------

export interface PlanningEventBase {
  readonly planId: string;
  readonly timestamp: string;
  readonly requestId?: string;
}

export interface PlanningStartedEvent extends PlanningEventBase {
  readonly type: 'PlanningStarted';
  readonly goal: string;
}

export interface PlanCreatedEvent extends PlanningEventBase {
  readonly type: 'PlanCreated';
  readonly stepCount: number;
  readonly strategy: PlanningStrategyType;
  readonly complexity: ComplexityLevel;
}

export interface PlanValidatedEvent extends PlanningEventBase {
  readonly type: 'PlanValidated';
  readonly valid: boolean;
  readonly errors?: readonly string[];
}

export interface PlanRejectedEvent extends PlanningEventBase {
  readonly type: 'PlanRejected';
  readonly reason: string;
}

export interface PlanningCompletedEvent extends PlanningEventBase {
  readonly type: 'PlanningCompleted';
  readonly durationMs: number;
  readonly stepCount: number;
  readonly complexity: ComplexityLevel;
}

export interface PlanningFailedEvent extends PlanningEventBase {
  readonly type: 'PlanningFailed';
  readonly error: string;
  readonly errorCode?: string;
  readonly durationMs: number;
}

export type PlanningEvent =
  | PlanningStartedEvent
  | PlanCreatedEvent
  | PlanValidatedEvent
  | PlanRejectedEvent
  | PlanningCompletedEvent
  | PlanningFailedEvent;

/**
 * Function that receives planning events.
 */
export type PlanningEventHandler = (event: PlanningEvent) => void;
