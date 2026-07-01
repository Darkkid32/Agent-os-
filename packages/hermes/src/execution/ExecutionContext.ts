/**
 * Execution context — holds all state for a single execution.
 *
 * Layer: 4 (Application)
 */

import type {
  ExecutionIds,
  ExecutionPolicy,
  RetryPolicy,
  ExecutionStepResult,
  ExecutionCheckpoint,
} from './ExecutionTypes.js';
import type { PlanResult, PlanStep } from '@agent-os/llm';
import { ExecutionStateMachine } from './ExecutionState.js';
import { ExecutionHistory } from './ExecutionHistory.js';
import { RetryManager } from './ExecutionRetry.js';
import { ExecutionEventEmitter } from './ExecutionEvents.js';
import { createInitialCheckpoint } from './ExecutionCheckpoint.js';
import { DEFAULT_EXECUTION_POLICY, DEFAULT_RETRY_POLICY } from './ExecutionPolicy.js';

// ---------------------------------------------------------------------------
// Execution context
// ---------------------------------------------------------------------------

/**
 * Holds all state for a single execution.
 */
export class ExecutionContext {
  public readonly ids: ExecutionIds;
  public readonly goal: string;
  public readonly availableTools: readonly string[];
  public readonly availablePlugins: readonly string[];
  public readonly policy: ExecutionPolicy;
  public readonly retryPolicy: RetryPolicy;
  public readonly signal?: AbortSignal | undefined;
  public readonly requestId?: string | undefined;

  public readonly stateMachine: ExecutionStateMachine;
  public readonly history: ExecutionHistory;
  public readonly retryManager: RetryManager;
  public readonly eventEmitter: ExecutionEventEmitter;

  private plan: PlanResult | undefined;
  private currentStepIndex: number = 0;
  private stepResults: ExecutionStepResult[] = [];
  private checkpoints: ExecutionCheckpoint[] = [];
  private startTime: number = 0;

  constructor(
    ids: ExecutionIds,
    goal: string,
    options?: {
      readonly availableTools?: readonly string[];
      readonly availablePlugins?: readonly string[];
      readonly policy?: Partial<ExecutionPolicy>;
      readonly retryPolicy?: Partial<RetryPolicy>;
      readonly signal?: AbortSignal;
      readonly requestId?: string;
    },
  ) {
    this.ids = ids;
    this.goal = goal;
    this.availableTools = options?.availableTools ?? [];
    this.availablePlugins = options?.availablePlugins ?? [];
    this.policy = {
      ...DEFAULT_EXECUTION_POLICY,
      ...options?.policy,
    };
    this.retryPolicy = {
      ...DEFAULT_RETRY_POLICY,
      ...options?.retryPolicy,
    };
    this.signal = options?.signal;
    this.requestId = options?.requestId;

    this.stateMachine = new ExecutionStateMachine();
    this.history = new ExecutionHistory();
    this.retryManager = new RetryManager(this.retryPolicy);
    this.eventEmitter = new ExecutionEventEmitter();
  }

  /**
   * Set the plan to execute.
   */
  public setPlan(plan: PlanResult): void {
    this.plan = plan;
    // Create initial checkpoint
    const stepIds = plan.steps.map((s) => s.id);
    if (stepIds.length > 0) {
      const initial = createInitialCheckpoint(this.ids, stepIds);
      this.checkpoints.push(initial);
    }
  }

  /**
   * Get the current plan.
   */
  public getPlan(): PlanResult | undefined {
    return this.plan;
  }

  /**
   * Get the current step.
   */
  public getCurrentStep(): PlanStep | undefined {
    return this.plan?.steps[this.currentStepIndex];
  }

  /**
   * Get the current step index.
   */
  public getCurrentStepIndex(): number {
    return this.currentStepIndex;
  }

  /**
   * Move to the next step.
   */
  public nextStep(): boolean {
    if (this.plan === undefined) return false;
    this.currentStepIndex += 1;
    return this.currentStepIndex < this.plan.steps.length;
  }

  /**
   * Get all step results.
   */
  public getStepResults(): readonly ExecutionStepResult[] {
    return this.stepResults;
  }

  /**
   * Add a step result.
   */
  public addStepResult(result: ExecutionStepResult): void {
    this.stepResults.push(result);
  }

  /**
   * Get the latest checkpoint.
   */
  public getLatestCheckpoint(): ExecutionCheckpoint | undefined {
    return this.checkpoints[this.checkpoints.length - 1];
  }

  /**
   * Add a checkpoint.
   */
  public addCheckpoint(checkpoint: ExecutionCheckpoint): void {
    this.checkpoints.push(checkpoint);
  }

  /**
   * Get all checkpoints.
   */
  public getCheckpoints(): readonly ExecutionCheckpoint[] {
    return this.checkpoints;
  }

  /**
   * Start execution tracking.
   */
  public start(): void {
    this.startTime = Date.now();
    this.history.start();
  }

  /**
   * Get execution duration in ms.
   */
  public getDurationMs(): number {
    if (this.startTime === 0) return 0;
    return Date.now() - this.startTime;
  }

  /**
   * Get total retry attempts.
   */
  public getTotalRetries(): number {
    return this.retryManager.getTotalAttempts();
  }

  /**
   * Get steps completed count.
   */
  public getStepsCompleted(): number {
    return this.stepResults.filter((r) => r.success).length;
  }

  /**
   * Get total steps count.
   */
  public getTotalSteps(): number {
    return this.plan?.steps.length ?? 0;
  }
}
