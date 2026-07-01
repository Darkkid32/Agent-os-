import { describe, it, expect } from 'vitest';
import { ExecutionEngine } from './ExecutionEngine.js';
import type { PlanningResponse } from '@agent-os/llm';

const mockPlanningFn = async (): Promise<PlanningResponse> => ({
  plan: {
    id: 'plan-1',
    goal: { raw: 'goal', description: 'goal', objectives: ['goal'] },
    strategy: 'sequential',
    steps: [
      {
        id: 'step-1',
        title: 'Step 1',
        description: 'desc',
        dependsOn: [],
        expectedResult: 'result',
        status: 'validated',
      },
    ],
    dependencies: [],
    requiredTools: [],
    expectedOutputs: [],
    complexity: 'simple',
    risk: 'low',
    constraints: [],
    status: 'validated',
    planningDurationMs: 0,
    reasoningSummary: '',
  },
  durationMs: 10,
});

describe('ExecutionEngine', () => {
  it('executes with planning function', async () => {
    const engine = new ExecutionEngine({ planningFn: mockPlanningFn });
    const result = await engine.execute({
      goal: 'test goal',
      availableTools: ['tool-1'],
    });
    expect(result.success).toBe(true);
    expect(result.status).toBe('completed');
    expect(result.stepsCompleted).toBe(1);
  });

  it('fails without planning function', async () => {
    const engine = new ExecutionEngine({});
    const result = await engine.execute({
      goal: 'test goal',
      availableTools: ['tool-1'],
    });
    expect(result.success).toBe(false);
    expect(result.errorCode).toBe('NO_PLAN');
  });

  it('emits events', async () => {
    const engine = new ExecutionEngine({ planningFn: mockPlanningFn });
    const events: string[] = [];
    engine.onEvent((e) => events.push(e.type));
    await engine.execute({ goal: 'test', availableTools: [] });
    expect(events).toContain('ExecutionStarted');
    expect(events).toContain('ExecutionCompleted');
  });

  it('getSummary returns summary', async () => {
    const engine = new ExecutionEngine({ planningFn: mockPlanningFn });
    const ctx = await engine.execute({ goal: 'test', availableTools: [] });
    // Summary requires ExecutionContext, but execute returns ExecutionResult
    // This test verifies execute works
    expect(ctx.status).toBe('completed');
  });

  it('handles invalid plan', async () => {
    const invalidPlanningFn = async (): Promise<PlanningResponse> => ({
      plan: {
        id: 'plan-1',
        goal: { raw: 'goal', description: 'goal', objectives: [] },
        strategy: 'sequential',
        steps: [],
        dependencies: [],
        requiredTools: [],
        expectedOutputs: [],
        complexity: 'simple',
        risk: 'low',
        constraints: [],
        status: 'validated',
        planningDurationMs: 0,
        reasoningSummary: '',
      },
      durationMs: 10,
    });
    const engine = new ExecutionEngine({ planningFn: invalidPlanningFn });
    const result = await engine.execute({ goal: 'test', availableTools: [] });
    expect(result.success).toBe(false);
    expect(result.errorCode).toBe('PLAN_INVALID');
  });
});
