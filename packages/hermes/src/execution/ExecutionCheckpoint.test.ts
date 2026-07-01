import { describe, it, expect } from 'vitest';
import {
  createCheckpoint,
  validateCheckpoint,
  getCheckpointProgress,
  createInitialCheckpoint,
} from './ExecutionCheckpoint.js';
import type { ExecutionIds } from './ExecutionTypes.js';

const makeIds = (): ExecutionIds => ({
  executionId: 'exec-1',
  goalId: 'goal-1',
  planId: 'plan-1',
  sessionId: 'sess-1',
  correlationId: 'corr-1',
});

describe('createCheckpoint', () => {
  it('creates checkpoint with correct fields', () => {
    const ids = makeIds();
    const checkpoint = createCheckpoint(ids, 'step-1', ['step-0'], ['step-2'], 'running', [], {
      stepsCompleted: 1,
      stepsFailed: 0,
      stepsSkipped: 0,
      retryAttempts: 0,
      durationMs: 100,
      stepDurations: {},
    });
    expect(checkpoint.id).toMatch(/^ckpt_/);
    expect(checkpoint.ids).toBe(ids);
    expect(checkpoint.currentStepId).toBe('step-1');
    expect(checkpoint.completedStepIds).toEqual(['step-0']);
    expect(checkpoint.remainingStepIds).toEqual(['step-2']);
    expect(checkpoint.status).toBe('running');
    expect(checkpoint.timestamp).toBeDefined();
  });
});

describe('validateCheckpoint', () => {
  it('valid checkpoint passes', () => {
    const checkpoint = createCheckpoint(makeIds(), 'step-1', [], ['step-2'], 'running', [], {
      stepsCompleted: 0,
      stepsFailed: 0,
      stepsSkipped: 0,
      retryAttempts: 0,
      durationMs: 0,
      stepDurations: {},
    });
    const result = validateCheckpoint(checkpoint);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('current step in completed list fails', () => {
    const checkpoint = createCheckpoint(makeIds(), 'step-1', ['step-1'], [], 'running', [], {
      stepsCompleted: 1,
      stepsFailed: 0,
      stepsSkipped: 0,
      retryAttempts: 0,
      durationMs: 0,
      stepDurations: {},
    });
    const result = validateCheckpoint(checkpoint);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('already in completed'))).toBe(true);
  });
});

describe('getCheckpointProgress', () => {
  it('calculates progress', () => {
    const checkpoint = createCheckpoint(
      makeIds(),
      'step-2',
      ['step-1'],
      ['step-3'],
      'running',
      [],
      {
        stepsCompleted: 1,
        stepsFailed: 0,
        stepsSkipped: 0,
        retryAttempts: 0,
        durationMs: 0,
        stepDurations: {},
      },
    );
    const progress = getCheckpointProgress(checkpoint);
    expect(progress.completed).toBe(1);
    expect(progress.remaining).toBe(1);
    expect(progress.total).toBe(3);
    expect(progress.percentage).toBe(33);
  });
});

describe('createInitialCheckpoint', () => {
  it('creates initial checkpoint', () => {
    const ids = makeIds();
    const checkpoint = createInitialCheckpoint(ids, ['step-1', 'step-2', 'step-3']);
    expect(checkpoint.currentStepId).toBe('step-1');
    expect(checkpoint.completedStepIds).toHaveLength(0);
    expect(checkpoint.remainingStepIds).toEqual(['step-2', 'step-3']);
    expect(checkpoint.status).toBe('pending');
  });

  it('handles empty step list', () => {
    const checkpoint = createInitialCheckpoint(makeIds(), []);
    expect(checkpoint.currentStepId).toBe('');
  });
});
