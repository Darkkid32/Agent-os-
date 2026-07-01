import { describe, it, expect } from 'vitest';
import { ExecutionLoop } from './ExecutionLoop.js';
import { ExecutionContext } from './ExecutionContext.js';
import type { ExecutionIds, ExecutionStepResult } from './ExecutionTypes.js';
import type { PlanResult } from '@agent-os/llm';

const makeIds = (): ExecutionIds => ({
  executionId: 'exec-1',
  goalId: 'goal-1',
  planId: 'plan-1',
  sessionId: 'sess-1',
  correlationId: 'corr-1',
});

const makePlan = (steps: { id: string; title: string }[]): PlanResult => ({
  id: 'plan-1',
  goal: { raw: 'goal', description: 'goal', objectives: ['goal'] },
  strategy: 'sequential',
  steps: steps.map((s) => ({
    id: s.id,
    title: s.title,
    description: 'desc',
    dependsOn: [],
    expectedResult: 'result',
    status: 'validated' as const,
  })),
  dependencies: [],
  requiredTools: [],
  expectedOutputs: [],
  complexity: 'simple',
  risk: 'low',
  constraints: [],
  status: 'validated',
  planningDurationMs: 0,
  reasoningSummary: '',
});

const successExecutor = {
  execute: async (step: { id: string }): Promise<ExecutionStepResult> => ({
    stepId: step.id,
    success: true,
    data: { message: 'done' },
    durationMs: 10,
    retryAttempts: 0,
    completedAt: new Date().toISOString(),
  }),
};

const failingExecutor = {
  execute: async (step: { id: string }): Promise<ExecutionStepResult> => ({
    stepId: step.id,
    success: false,
    error: 'failed',
    errorCode: 'STEP_FAILED',
    durationMs: 10,
    retryAttempts: 0,
    completedAt: new Date().toISOString(),
  }),
};

describe('ExecutionLoop', () => {
  it('executes plan successfully', async () => {
    const loop = new ExecutionLoop();
    const ctx = new ExecutionContext(makeIds(), 'goal');
    ctx.setPlan(makePlan([{ id: 'step-1', title: 'Step 1' }]));
    await loop.execute(ctx, successExecutor);
    expect(ctx.stateMachine.getStatus()).toBe('completed');
    expect(ctx.getStepResults()).toHaveLength(1);
    expect(ctx.getStepsCompleted()).toBe(1);
  });

  it('emits ExecutionStarted event', async () => {
    const loop = new ExecutionLoop();
    const events: string[] = [];
    loop.onEvent((e) => events.push(e.type));
    const ctx = new ExecutionContext(makeIds(), 'goal');
    ctx.setPlan(makePlan([{ id: 'step-1', title: 'Step 1' }]));
    await loop.execute(ctx, successExecutor);
    expect(events).toContain('ExecutionStarted');
    expect(events).toContain('ExecutionCompleted');
  });

  it('handles step failure', async () => {
    const loop = new ExecutionLoop();
    const ctx = new ExecutionContext(makeIds(), 'goal');
    ctx.setPlan(makePlan([{ id: 'step-1', title: 'Step 1' }]));
    await loop.execute(ctx, failingExecutor);
    expect(ctx.stateMachine.getStatus()).toBe('failed');
  });

  it('emits StepFailed on failure', async () => {
    const loop = new ExecutionLoop();
    const events: string[] = [];
    loop.onEvent((e) => events.push(e.type));
    const ctx = new ExecutionContext(makeIds(), 'goal');
    ctx.setPlan(makePlan([{ id: 'step-1', title: 'Step 1' }]));
    await loop.execute(ctx, failingExecutor);
    expect(events).toContain('StepFailed');
    expect(events).toContain('ExecutionFailed');
  });

  it('cancel stops execution', async () => {
    const loop = new ExecutionLoop();
    const ctx = new ExecutionContext(makeIds(), 'goal');
    ctx.setPlan(makePlan([{ id: 'step-1', title: 'Step 1' }]));
    // Start execution in background
    const execPromise = loop.execute(ctx, successExecutor);
    // Cancel immediately
    loop.cancel(ctx, 'user cancelled');
    await execPromise;
    expect(ctx.stateMachine.getStatus()).toBe('cancelled');
  });

  it('pause and resume', async () => {
    const loop = new ExecutionLoop();
    const ctx = new ExecutionContext(makeIds(), 'goal');
    ctx.setPlan(makePlan([{ id: 'step-1', title: 'Step 1' }]));
    // Start execution
    const execPromise = loop.execute(ctx, successExecutor);
    // Pause
    loop.pause(ctx);
    expect(ctx.stateMachine.getStatus()).toBe('paused');
    // Resume
    loop.resume(ctx);
    await execPromise;
    expect(ctx.stateMachine.getStatus()).toBe('completed');
  });

  it('retry on failure', async () => {
    let attempts = 0;
    const retryExecutor = {
      execute: async (step: { id: string }): Promise<ExecutionStepResult> => {
        attempts += 1;
        if (attempts < 3) {
          return {
            stepId: step.id,
            success: false,
            error: 'failed',
            errorCode: 'STEP_FAILED',
            durationMs: 10,
            retryAttempts: attempts,
            completedAt: new Date().toISOString(),
          };
        }
        return {
          stepId: step.id,
          success: true,
          data: { message: 'done' },
          durationMs: 10,
          retryAttempts: attempts,
          completedAt: new Date().toISOString(),
        };
      },
    };
    const loop = new ExecutionLoop();
    const ctx = new ExecutionContext(makeIds(), 'goal', {
      retryPolicy: {
        maxAttempts: 3,
        baseDelayMs: 10,
        maxDelayMs: 100,
        multiplier: 1,
        strategy: 'exponential-backoff',
        retryOn: ['STEP_FAILED'],
      },
    });
    ctx.setPlan(makePlan([{ id: 'step-1', title: 'Step 1' }]));
    await loop.execute(ctx, retryExecutor);
    expect(ctx.stateMachine.getStatus()).toBe('completed');
    expect(attempts).toBe(3);
  });

  it('throws on no plan', async () => {
    const loop = new ExecutionLoop();
    const ctx = new ExecutionContext(makeIds(), 'goal');
    await expect(loop.execute(ctx, successExecutor)).rejects.toThrow('No plan');
  });
});
