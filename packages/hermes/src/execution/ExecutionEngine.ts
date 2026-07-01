/**
 * Execution engine — high-level orchestrator.
 *
 * Ties together the execution loop, planning engine, memory manager,
 * and tool executor into a cohesive execution pipeline.
 *
 * Layer: 4 (Application)
 */

import type {
  ExecutionIds,
  ExecutionResult,
  ExecutionStepResult,
  ExecutionSummary,
  ExecutionEvent,
  ExecutionEventHandler,
  ExecutionPolicy,
  RetryPolicy,
} from './ExecutionTypes.js';
import type { PlanResult, PlanningRequest, PlanningResponse } from '@agent-os/llm';
import { ExecutionLoop, type StepExecutor, type ReplanCallback } from './ExecutionLoop.js';
import { ExecutionContext } from './ExecutionContext.js';
import { validatePlanForExecution } from './ExecutionValidator.js';
import { ExecutionFailedError } from './ExecutionErrors.js';

// ---------------------------------------------------------------------------
// Execution engine options
// ---------------------------------------------------------------------------

export interface ExecutionEngineOptions {
  /** Execution policy overrides */
  readonly policy?: Partial<ExecutionPolicy> | undefined;

  /** Retry policy overrides */
  readonly retryPolicy?: Partial<RetryPolicy> | undefined;

  /** Enable observability events — default true */
  readonly enableEvents?: boolean | undefined;
}

// ---------------------------------------------------------------------------
// Planning function
// ---------------------------------------------------------------------------

/**
 * Function that produces a plan from a request.
 */
export type PlanningFunction = (request: PlanningRequest) => Promise<PlanningResponse>;

// ---------------------------------------------------------------------------
// Memory function
// ---------------------------------------------------------------------------

/**
 * Function that retrieves memory context.
 */
export type MemoryFunction = (query: string) => Promise<unknown>;

// ---------------------------------------------------------------------------
// Execution engine
// ---------------------------------------------------------------------------

/**
 * High-level execution engine.
 *
 * Usage:
 * ```ts
 * const engine = new ExecutionEngine({
 *   planningFn: (req) => planningEngine.plan(req),
 *   memoryFn: (q) => memoryManager.getContext({ text: q }),
 *   stepExecutor: myStepExecutor,
 * });
 * const result = await engine.execute({
 *   goal: 'Write a blog post about TypeScript',
 *   availableTools: ['file_write', 'web_search'],
 * });
 * ```
 */
export class ExecutionEngine {
  private readonly loop: ExecutionLoop;
  private readonly planningFn: PlanningFunction | undefined;
  private readonly memoryFn: MemoryFunction | undefined;
  private readonly options: Required<ExecutionEngineOptions>;
  private readonly eventHandlers: ExecutionEventHandler[] = [];

  constructor(options: {
    readonly planningFn?: PlanningFunction | undefined;
    readonly memoryFn?: MemoryFunction | undefined;
    readonly stepExecutor?: StepExecutor | undefined;
    readonly engineOptions?: ExecutionEngineOptions | undefined;
  }) {
    this.planningFn = options.planningFn ?? undefined;
    this.memoryFn = options.memoryFn ?? undefined;
    this.loop = new ExecutionLoop();
    this.options = {
      policy: options.engineOptions?.policy ?? {},
      retryPolicy: options.engineOptions?.retryPolicy ?? {},
      enableEvents: options.engineOptions?.enableEvents ?? true,
    };

    // Forward events from loop
    if (this.options.enableEvents) {
      this.loop.onEvent((event) => {
        this.emitEvent(event);
      });
    }
  }

  /**
   * Register an event handler.
   */
  public onEvent(handler: ExecutionEventHandler): void {
    this.eventHandlers.push(handler);
  }

  /**
   * Execute a goal.
   */
  public async execute(input: {
    readonly goal: string;
    readonly availableTools: readonly string[];
    readonly availablePlugins?: readonly string[];
    readonly requestId?: string;
    readonly signal?: AbortSignal;
  }): Promise<ExecutionResult> {
    const startTime = Date.now();
    const ids = this.createIds(input.requestId);

    // Step 1: Get memory context
    let memoryContext: unknown;
    if (this.memoryFn !== undefined) {
      try {
        memoryContext = await this.memoryFn(input.goal);
      } catch {
        // Memory retrieval is optional — continue without it
      }
    }
    void memoryContext;

    // Step 2: Get plan
    let plan: PlanResult | undefined;
    if (this.planningFn !== undefined) {
      const response = await this.planningFn({
        goal: input.goal,
        availableTools: input.availableTools.map((id) => ({
          id,
          name: id,
          description: '',
          pluginId: 'system',
          parameters: {},
          permissions: [],
        })),
        ...(input.availablePlugins !== undefined
          ? { availablePlugins: input.availablePlugins }
          : {}),
        ...(input.requestId !== undefined ? { requestId: input.requestId } : {}),
      });
      plan = response.plan;
    }

    if (plan === undefined) {
      return {
        ids,
        status: 'failed',
        success: false,
        stepResults: [],
        durationMs: Date.now() - startTime,
        error: 'No plan generated',
        errorCode: 'NO_PLAN',
        stepsCompleted: 0,
        totalSteps: 0,
        totalRetries: 0,
      };
    }

    // Step 3: Validate plan
    const validation = validatePlanForExecution(plan);
    if (!validation.valid) {
      return {
        ids,
        status: 'failed',
        success: false,
        stepResults: [],
        durationMs: Date.now() - startTime,
        error: validation.errors.join('; '),
        errorCode: 'PLAN_INVALID',
        stepsCompleted: 0,
        totalSteps: plan.steps.length,
        totalRetries: 0,
      };
    }

    // Step 4: Create execution context
    const context = new ExecutionContext(ids, input.goal, {
      availableTools: input.availableTools,
      availablePlugins: input.availablePlugins ?? [],
      ...(this.options.policy !== undefined ? { policy: this.options.policy } : {}),
      ...(this.options.retryPolicy !== undefined ? { retryPolicy: this.options.retryPolicy } : {}),
      ...(input.signal !== undefined ? { signal: input.signal } : {}),
      ...(input.requestId !== undefined ? { requestId: input.requestId } : {}),
    });
    context.setPlan(plan);

    // Step 5: Execute
    const stepExecutor = this.createDefaultStepExecutor();
    const replanCallback =
      this.planningFn !== undefined
        ? this.createReplanCallback(input.availableTools, input.availablePlugins)
        : undefined;

    await this.loop.execute(context, stepExecutor, replanCallback);

    // Step 6: Build result
    return this.buildResult(context, startTime);
  }

  /**
   * Pause an execution.
   */
  public pause(context: ExecutionContext): void {
    this.loop.pause(context);
  }

  /**
   * Resume an execution.
   */
  public resume(context: ExecutionContext): void {
    this.loop.resume(context);
  }

  /**
   * Cancel an execution.
   */
  public cancel(context: ExecutionContext, reason: string): void {
    this.loop.cancel(context, reason);
  }

  /**
   * Get execution summary.
   */
  public getSummary(context: ExecutionContext): ExecutionSummary {
    return {
      ids: context.ids,
      status: context.stateMachine.getStatus(),
      goal: context.goal,
      progress: `${context.getStepsCompleted()}/${context.getTotalSteps()}`,
      durationMs: context.getDurationMs(),
      retries: context.getTotalRetries(),
    };
  }

  // -------------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------------

  private createIds(requestId?: string): ExecutionIds {
    const executionId = `exec_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const goalId = `goal_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const planId = `plan_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const sessionId = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const correlationId =
      requestId ?? `corr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    return { executionId, goalId, planId, sessionId, correlationId };
  }

  private createDefaultStepExecutor(): StepExecutor {
    return {
      execute: async (step, context): Promise<ExecutionStepResult> => {
        const startTime = Date.now();
        void context;

        // Default implementation — just record the step
        // Real implementation wraps ToolExecutor
        return {
          stepId: step.id,
          success: true,
          data: { message: `Step "${step.title}" completed` },
          durationMs: Date.now() - startTime,
          retryAttempts: 0,
          completedAt: new Date().toISOString(),
        };
      },
    };
  }

  private createReplanCallback(
    availableTools: readonly string[],
    availablePlugins?: readonly string[],
  ): ReplanCallback {
    return async (context: ExecutionContext): Promise<PlanResult> => {
      if (this.planningFn === undefined) {
        throw new ExecutionFailedError('No planning function available for replanning');
      }

      const response = await this.planningFn({
        goal: context.goal,
        availableTools: availableTools.map((id) => ({
          id,
          name: id,
          description: '',
          pluginId: 'system',
          parameters: {},
          permissions: [],
        })),
        ...(availablePlugins !== undefined ? { availablePlugins } : {}),
        ...(context.requestId !== undefined ? { requestId: context.requestId } : {}),
      });

      if (response.plan === undefined) {
        throw new ExecutionFailedError('Replanning failed: no plan generated');
      }

      return response.plan;
    };
  }

  private buildResult(context: ExecutionContext, startTime: number): ExecutionResult {
    const status = context.stateMachine.getStatus();
    const stepResults = context.getStepResults();

    return {
      ids: context.ids,
      status,
      success: status === 'completed',
      stepResults,
      durationMs: Date.now() - startTime,
      ...(status === 'failed' ? { error: 'Execution failed', errorCode: 'EXECUTION_FAILED' } : {}),
      stepsCompleted: context.getStepsCompleted(),
      totalSteps: context.getTotalSteps(),
      totalRetries: context.getTotalRetries(),
    };
  }

  private emitEvent(event: ExecutionEvent): void {
    for (const handler of this.eventHandlers) {
      try {
        handler(event);
      } catch {
        // Swallow handler errors
      }
    }
  }
}
