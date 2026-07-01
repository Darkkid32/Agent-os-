/**
 * Execution loop — the main execution orchestrator.
 *
 * The loop:
 * 1. Receives a plan from the Planning Engine
 * 2. Executes one step at a time
 * 3. Observes results
 * 4. Retries when appropriate
 * 5. Requests replanning when necessary
 * 6. Completes goals
 *
 * It NEVER:
 * - Talks directly to LLM providers
 * - Talks directly to plugins
 * - Accesses storage directly
 * - Performs planning logic
 * - Retrieves memory directly
 *
 * Layer: 4 (Application)
 */

import type {
  ExecutionStepResult,
  ExecutionCheckpoint,
  ExecutionEvent,
  ExecutionEventHandler,
} from './ExecutionTypes.js';
import type { PlanResult, PlanStep } from '@agent-os/llm';
import type { ExecutionContext } from './ExecutionContext.js';
import {
  ExecutionFailedError,
  ExecutionCancelledError,
  StepFailedError,
  RetryExhaustedError,
} from './ExecutionErrors.js';
import { createCheckpoint } from './ExecutionCheckpoint.js';
import {
  executionStarted,
  executionCompleted,
  executionFailed,
  executionCancelled,
  executionPaused,
  executionResumed,
  stepStarted as emitStepStarted,
  stepCompleted as emitStepCompleted,
  stepFailed as emitStepFailed,
  retryStarted as emitRetryStarted,
  checkpointCreated as emitCheckpointCreated,
  executionProgress,
} from './ExecutionEvents.js';

// ---------------------------------------------------------------------------
// Step executor interface
// ---------------------------------------------------------------------------

/**
 * Interface for executing a single step.
 * Implementations wrap the ToolExecutor.
 */
export interface StepExecutor {
  execute(step: PlanStep, context: ExecutionContext): Promise<ExecutionStepResult>;
}

// ---------------------------------------------------------------------------
// Replan callback
// ---------------------------------------------------------------------------

/**
 * Callback for requesting replanning.
 */
export type ReplanCallback = (context: ExecutionContext) => Promise<PlanResult>;

// ---------------------------------------------------------------------------
// Execution loop
// ---------------------------------------------------------------------------

/**
 * The main execution loop.
 *
 * Orchestrates step execution, retry, replanning, and completion.
 */
export class ExecutionLoop {
  private readonly eventHandlers: ExecutionEventHandler[] = [];

  /**
   * Register an event handler.
   */
  public onEvent(handler: ExecutionEventHandler): void {
    this.eventHandlers.push(handler);
  }

  /**
   * Execute a plan step by step.
   */
  public async execute(
    context: ExecutionContext,
    stepExecutor: StepExecutor,
    replanCallback?: ReplanCallback,
  ): Promise<void> {
    const plan = context.getPlan();
    if (plan === undefined) {
      throw new ExecutionFailedError('No plan set for execution');
    }

    // Start execution
    context.start();
    context.stateMachine.transition('running');

    this.emit(executionStarted(context.ids, context.goal, plan.steps.length));

    try {
      // Execute steps one at a time
      let hasMore = true;
      while (hasMore) {
        // Check for cancellation
        if (context.signal?.aborted === true) {
          throw new ExecutionCancelledError('Signal aborted');
        }

        // Check if paused
        if (context.stateMachine.getStatus() === 'paused') {
          await this.waitForResume(context);
        }

        const step = context.getCurrentStep();
        if (step === undefined) {
          break;
        }

        // Execute the step
        const result = await this.executeStep(context, step, stepExecutor);

        // Add result to context
        context.addStepResult(result);

        // Update history
        context.history.stepCompleted(result);

        // Create checkpoint
        if (context.policy.enableCheckpoints) {
          const checkpoint = this.createStepCheckpoint(context, step.id);
          context.addCheckpoint(checkpoint);
          this.emit(emitCheckpointCreated(context.ids, checkpoint.id, context.getStepsCompleted()));
        }

        if (result.success) {
          // Step succeeded — move to next
          context.stateMachine.setStepState(step.id, 'completed');
          this.emit(emitStepCompleted(context.ids, step.id, result.durationMs, true));
          this.emit(
            executionProgress(
              context.ids,
              step.id,
              context.getStepsCompleted(),
              context.getTotalSteps(),
            ),
          );

          hasMore = context.nextStep();
        } else {
          // Step failed — check retry
          context.stateMachine.setStepState(step.id, 'failed');
          this.emit(
            emitStepFailed(
              context.ids,
              step.id,
              result.error ?? 'Unknown error',
              result.durationMs,
              result.errorCode,
            ),
          );

          if (context.retryManager.shouldRetry(step.id, result.errorCode)) {
            const { delayMs, attempt, exhausted } = context.retryManager.recordAttempt(step.id);

            if (exhausted) {
              // Retry exhausted — fail execution
              throw new RetryExhaustedError(step.id, attempt);
            }

            // Wait before retry
            this.emit(
              emitRetryStarted(
                context.ids,
                step.id,
                attempt,
                context.retryPolicy.maxAttempts,
                delayMs,
              ),
            );
            context.stateMachine.setStepState(step.id, 'retrying');
            await this.sleep(delayMs, context.signal);

            // Retry the step
            context.stateMachine.setStepState(step.id, 'running');
            continue;
          }

          // Check if replanning is needed
          if (replanCallback !== undefined) {
            context.history.replanRequested(`Step "${step.id}" failed: ${result.error}`);
            context.stateMachine.transition('replanning');

            try {
              const newPlan = await replanCallback(context);
              context.setPlan(newPlan);
              context.stateMachine.transition('running');
              continue;
            } catch {
              // Replanning failed — fall through to failure
            }
          }

          // No retry, no replan — fail execution
          throw new StepFailedError(step.id, result.error ?? 'Unknown error');
        }
      }

      // All steps completed successfully
      if (context.stateMachine.getStatus() !== 'cancelled') {
        context.stateMachine.transition('completed');
        this.emit(
          executionCompleted(
            context.ids,
            context.getDurationMs(),
            context.getStepsCompleted(),
            context.getTotalSteps(),
            context.getTotalRetries(),
          ),
        );
        context.history.complete('completed');
      }
    } catch (error) {
      if (
        error instanceof ExecutionCancelledError ||
        context.stateMachine.getStatus() === 'cancelled'
      ) {
        if (context.stateMachine.getStatus() !== 'cancelled') {
          context.stateMachine.transition('cancelled');
        }
        this.emit(
          executionCancelled(
            context.ids,
            error instanceof ExecutionCancelledError ? error.message : 'cancelled',
            context.getStepsCompleted(),
          ),
        );
        context.history.complete(
          'cancelled',
          error instanceof ExecutionCancelledError ? error.message : 'cancelled',
        );
        return;
      }

      if (context.stateMachine.getStatus() !== 'failed') {
        context.stateMachine.transition('failed');
      }
      const message = error instanceof Error ? error.message : String(error);
      const failedStep = context.getCurrentStep();
      this.emit(
        executionFailed(context.ids, message, context.getDurationMs(), failedStep?.id ?? 'unknown'),
      );
      context.history.complete('failed', message);
    }
  }

  /**
   * Pause the execution.
   */
  public pause(context: ExecutionContext): void {
    if (context.stateMachine.canPause()) {
      context.stateMachine.transition('paused');
      this.emit(executionPaused(context.ids));
    }
  }

  /**
   * Resume the execution.
   */
  public resume(context: ExecutionContext): void {
    if (context.stateMachine.canResume()) {
      context.stateMachine.transition('running');
      this.emit(executionResumed(context.ids));
    }
  }

  /**
   * Cancel the execution.
   */
  public cancel(context: ExecutionContext, reason: string): void {
    if (context.stateMachine.canCancel()) {
      context.stateMachine.transition('cancelled');
      this.emit(executionCancelled(context.ids, reason, context.getStepsCompleted()));
      context.history.complete('cancelled', reason);
    }
  }

  // -------------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------------

  private async executeStep(
    context: ExecutionContext,
    step: PlanStep,
    stepExecutor: StepExecutor,
  ): Promise<ExecutionStepResult> {
    if (context.stateMachine.getStepState(step.id) !== 'running') {
      context.stateMachine.setStepState(step.id, 'running');
    }
    this.emit(emitStepStarted(context.ids, step.id, step.title, context.getCurrentStepIndex()));

    try {
      const result = await stepExecutor.execute(step, context);
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        stepId: step.id,
        success: false,
        error: message,
        errorCode: 'STEP_EXECUTION_ERROR',
        durationMs: 0,
        retryAttempts: 0,
        completedAt: new Date().toISOString(),
      };
    }
  }

  private createStepCheckpoint(
    context: ExecutionContext,
    completedStepId: string,
  ): ExecutionCheckpoint {
    const plan = context.getPlan();
    const allStepIds = plan?.steps.map((s) => s.id) ?? [];
    const completedIds = context
      .getStepResults()
      .filter((r) => r.success)
      .map((r) => r.stepId);
    const remainingIds = allStepIds.filter(
      (id) => !completedIds.includes(id) && id !== completedStepId,
    );

    return createCheckpoint(
      context.ids,
      completedStepId,
      completedIds,
      remainingIds,
      context.stateMachine.getStatus(),
      context.getStepResults(),
      context.history.getStatistics(),
    );
  }

  private async waitForResume(context: ExecutionContext): Promise<void> {
    return new Promise((resolve) => {
      const check = (): void => {
        if (context.stateMachine.getStatus() !== 'paused') {
          resolve();
          return;
        }
        setTimeout(check, 100);
      };
      check();
    });
  }

  private sleep(ms: number, signal?: AbortSignal): Promise<void> {
    return new Promise((resolve) => {
      if (signal?.aborted === true) {
        resolve();
        return;
      }
      const timer = setTimeout(resolve, ms);
      signal?.addEventListener(
        'abort',
        () => {
          clearTimeout(timer);
          resolve();
        },
        { once: true },
      );
    });
  }

  private emit(event: ExecutionEvent): void {
    for (const handler of this.eventHandlers) {
      try {
        handler(event);
      } catch {
        // Swallow handler errors
      }
    }
    // Also forward to context event emitter
  }
}
