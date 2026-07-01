import { describe, it, expect } from 'vitest';
import {
  validatePlanForExecution,
  validateStateTransition,
  validateStepOrdering,
  validateCheckpointIntegrity,
  validateCancellation,
} from './ExecutionValidator.js';
import { createCheckpoint } from './ExecutionCheckpoint.js';
import type { ExecutionIds } from './ExecutionTypes.js';

const makeIds = (): ExecutionIds => ({
  executionId: 'exec-1',
  goalId: 'goal-1',
  planId: 'plan-1',
  sessionId: 'sess-1',
  correlationId: 'corr-1',
});

describe('validatePlanForExecution', () => {
  it('valid plan passes', () => {
    const plan = {
      id: 'plan-1',
      goal: { raw: 'test', description: 'test', objectives: ['test'] },
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
    };
    const result = validatePlanForExecution(plan);
    expect(result.valid).toBe(true);
  });

  it('empty steps fails', () => {
    const plan = {
      id: 'plan-1',
      goal: { raw: 'test', description: 'test', objectives: ['test'] },
      strategy: 'sequential' as const,
      steps: [],
      dependencies: [],
      requiredTools: [],
      expectedOutputs: [],
      complexity: 'simple' as const,
      risk: 'low' as const,
      constraints: [],
      status: 'validated' as const,
      planningDurationMs: 0,
      reasoningSummary: '',
    };
    const result = validatePlanForExecution(plan);
    expect(result.valid).toBe(false);
  });
});

describe('validateStateTransition', () => {
  it('valid transition passes', () => {
    const result = validateStateTransition('pending', 'running');
    expect(result.valid).toBe(true);
  });

  it('invalid transition fails', () => {
    const result = validateStateTransition('pending', 'completed');
    expect(result.valid).toBe(false);
  });
});

describe('validateStepOrdering', () => {
  it('valid ordering passes', () => {
    const result = validateStepOrdering(['step-1', 'step-2'], { 'step-2': ['step-1'] });
    expect(result.valid).toBe(true);
  });

  it('missing dependency fails', () => {
    const result = validateStepOrdering(['step-1'], { 'step-1': ['step-2'] });
    expect(result.valid).toBe(false);
  });
});

describe('validateCheckpointIntegrity', () => {
  it('valid checkpoint passes', () => {
    const checkpoint = createCheckpoint(makeIds(), 'step-1', [], ['step-2'], 'running', [], {
      stepsCompleted: 0,
      stepsFailed: 0,
      stepsSkipped: 0,
      retryAttempts: 0,
      durationMs: 0,
      stepDurations: {},
    });
    const result = validateCheckpointIntegrity(checkpoint);
    expect(result.valid).toBe(true);
  });
});

describe('validateCancellation', () => {
  it('running can be cancelled', () => {
    const result = validateCancellation('running');
    expect(result.valid).toBe(true);
  });

  it('completed cannot be cancelled', () => {
    const result = validateCancellation('completed');
    expect(result.valid).toBe(false);
  });

  it('cancelled cannot be cancelled again', () => {
    const result = validateCancellation('cancelled');
    expect(result.valid).toBe(false);
  });

  it('failed cannot be cancelled', () => {
    const result = validateCancellation('failed');
    expect(result.valid).toBe(false);
  });
});
