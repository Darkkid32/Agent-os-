import { describe, it, expect } from 'vitest';
import { ExecutionContext } from './ExecutionContext.js';
import type { ExecutionIds } from './ExecutionTypes.js';

const makeIds = (): ExecutionIds => ({
  executionId: 'exec-1',
  goalId: 'goal-1',
  planId: 'plan-1',
  sessionId: 'sess-1',
  correlationId: 'corr-1',
});

describe('ExecutionContext', () => {
  it('initializes with correct values', () => {
    const ctx = new ExecutionContext(makeIds(), 'test goal');
    expect(ctx.ids.executionId).toBe('exec-1');
    expect(ctx.goal).toBe('test goal');
    expect(ctx.stateMachine.getStatus()).toBe('pending');
  });

  it('setPlan and getPlan', () => {
    const ctx = new ExecutionContext(makeIds(), 'goal');
    const plan = {
      id: 'plan-1',
      goal: { raw: 'goal', description: 'goal', objectives: ['goal'] },
      strategy: 'sequential' as const,
      steps: [
        {
          id: 'step-1',
          title: 'Step 1',
          description: 'desc',
          dependsOn: [],
          expectedResult: 'result',
          status: 'validated' as const,
        },
        {
          id: 'step-2',
          title: 'Step 2',
          description: 'desc',
          dependsOn: ['step-1'],
          expectedResult: 'result',
          status: 'validated' as const,
        },
      ],
      dependencies: [{ from: 'step-1', to: 'step-2' }],
      requiredTools: [],
      expectedOutputs: [],
      complexity: 'simple' as const,
      risk: 'low' as const,
      constraints: [],
      status: 'validated' as const,
      planningDurationMs: 0,
      reasoningSummary: '',
    };
    ctx.setPlan(plan);
    expect(ctx.getPlan()).toBe(plan);
  });

  it('getCurrentStep returns first step', () => {
    const ctx = new ExecutionContext(makeIds(), 'goal');
    ctx.setPlan({
      id: 'plan-1',
      goal: { raw: 'goal', description: 'goal', objectives: [] },
      strategy: 'sequential' as const,
      steps: [
        {
          id: 'step-1',
          title: 'Step 1',
          description: 'desc',
          dependsOn: [],
          expectedResult: 'result',
          status: 'validated' as const,
        },
      ],
      dependencies: [],
      requiredTools: [],
      expectedOutputs: [],
      complexity: 'simple' as const,
      risk: 'low' as const,
      constraints: [],
      status: 'validated' as const,
      planningDurationMs: 0,
      reasoningSummary: '',
    });
    expect(ctx.getCurrentStep()?.id).toBe('step-1');
  });

  it('nextStep advances index', () => {
    const ctx = new ExecutionContext(makeIds(), 'goal');
    ctx.setPlan({
      id: 'plan-1',
      goal: { raw: 'goal', description: 'goal', objectives: [] },
      strategy: 'sequential' as const,
      steps: [
        {
          id: 'step-1',
          title: 'Step 1',
          description: 'desc',
          dependsOn: [],
          expectedResult: 'result',
          status: 'validated' as const,
        },
        {
          id: 'step-2',
          title: 'Step 2',
          description: 'desc',
          dependsOn: [],
          expectedResult: 'result',
          status: 'validated' as const,
        },
      ],
      dependencies: [],
      requiredTools: [],
      expectedOutputs: [],
      complexity: 'simple' as const,
      risk: 'low' as const,
      constraints: [],
      status: 'validated' as const,
      planningDurationMs: 0,
      reasoningSummary: '',
    });
    expect(ctx.getCurrentStep()?.id).toBe('step-1');
    expect(ctx.nextStep()).toBe(true);
    expect(ctx.getCurrentStep()?.id).toBe('step-2');
    expect(ctx.nextStep()).toBe(false);
  });

  it('addStepResult and getStepResults', () => {
    const ctx = new ExecutionContext(makeIds(), 'goal');
    ctx.addStepResult({
      stepId: 'step-1',
      success: true,
      durationMs: 100,
      retryAttempts: 0,
      completedAt: new Date().toISOString(),
    });
    expect(ctx.getStepResults()).toHaveLength(1);
  });

  it('getStepsCompleted counts successful steps', () => {
    const ctx = new ExecutionContext(makeIds(), 'goal');
    ctx.addStepResult({
      stepId: 'step-1',
      success: true,
      durationMs: 100,
      retryAttempts: 0,
      completedAt: new Date().toISOString(),
    });
    ctx.addStepResult({
      stepId: 'step-2',
      success: false,
      durationMs: 100,
      retryAttempts: 0,
      completedAt: new Date().toISOString(),
    });
    expect(ctx.getStepsCompleted()).toBe(1);
  });

  it('getTotalSteps returns plan step count', () => {
    const ctx = new ExecutionContext(makeIds(), 'goal');
    expect(ctx.getTotalSteps()).toBe(0);
    ctx.setPlan({
      id: 'plan-1',
      goal: { raw: 'goal', description: 'goal', objectives: [] },
      strategy: 'sequential' as const,
      steps: [
        {
          id: 'step-1',
          title: 'Step 1',
          description: 'desc',
          dependsOn: [],
          expectedResult: 'result',
          status: 'validated' as const,
        },
        {
          id: 'step-2',
          title: 'Step 2',
          description: 'desc',
          dependsOn: [],
          expectedResult: 'result',
          status: 'validated' as const,
        },
      ],
      dependencies: [],
      requiredTools: [],
      expectedOutputs: [],
      complexity: 'simple' as const,
      risk: 'low' as const,
      constraints: [],
      status: 'validated' as const,
      planningDurationMs: 0,
      reasoningSummary: '',
    });
    expect(ctx.getTotalSteps()).toBe(2);
  });

  it('start and getDurationMs', () => {
    const ctx = new ExecutionContext(makeIds(), 'goal');
    ctx.start();
    expect(ctx.getDurationMs()).toBeGreaterThanOrEqual(0);
  });

  it('getTotalRetries', () => {
    const ctx = new ExecutionContext(makeIds(), 'goal');
    expect(ctx.getTotalRetries()).toBe(0);
  });
});
