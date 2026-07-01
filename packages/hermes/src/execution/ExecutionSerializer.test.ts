import { describe, it, expect } from 'vitest';
import {
  serializeCheckpoint,
  deserializeExecution,
  serializeStepResult,
  deserializeStepResult,
  validateSerialized,
} from './ExecutionSerializer.js';
import { createCheckpoint } from './ExecutionCheckpoint.js';
import type { ExecutionIds, ExecutionStepResult } from './ExecutionTypes.js';

const makeIds = (): ExecutionIds => ({
  executionId: 'exec-1',
  goalId: 'goal-1',
  planId: 'plan-1',
  sessionId: 'sess-1',
  correlationId: 'corr-1',
});

describe('serializeCheckpoint', () => {
  it('serializes to JSON', () => {
    const checkpoint = createCheckpoint(makeIds(), 'step-1', [], ['step-2'], 'running', [], {
      stepsCompleted: 0,
      stepsFailed: 0,
      stepsSkipped: 0,
      retryAttempts: 0,
      durationMs: 0,
      stepDurations: {},
    });
    const json = serializeCheckpoint(checkpoint);
    expect(typeof json).toBe('string');
    const parsed = JSON.parse(json);
    expect(parsed.version).toBe(1);
    expect(parsed.ids.executionId).toBe('exec-1');
  });
});

describe('deserializeExecution', () => {
  it('deserializes valid JSON', () => {
    const data = {
      version: 1,
      ids: makeIds(),
      goal: 'test',
      status: 'running',
      stepResults: [],
      statistics: {
        stepsCompleted: 0,
        stepsFailed: 0,
        stepsSkipped: 0,
        retryAttempts: 0,
        durationMs: 0,
        stepDurations: {},
      },
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const result = deserializeExecution(JSON.stringify(data));
    expect(result.version).toBe(1);
    expect(result.ids.executionId).toBe('exec-1');
  });

  it('throws on invalid version', () => {
    const data = { version: 999, ids: makeIds() };
    expect(() => deserializeExecution(JSON.stringify(data))).toThrow('Unsupported');
  });
});

describe('serializeStepResult', () => {
  it('serializes step result', () => {
    const result: ExecutionStepResult = {
      stepId: 'step-1',
      success: true,
      durationMs: 100,
      retryAttempts: 0,
      completedAt: new Date().toISOString(),
    };
    const serialized = serializeStepResult(result);
    expect(serialized.stepId).toBe('step-1');
    expect(serialized.success).toBe(true);
  });
});

describe('deserializeStepResult', () => {
  it('deserializes step result', () => {
    const data = {
      stepId: 'step-1',
      success: true,
      durationMs: 100,
      retryAttempts: 0,
      completedAt: new Date().toISOString(),
    };
    const result = deserializeStepResult(data);
    expect(result.stepId).toBe('step-1');
  });
});

describe('validateSerialized', () => {
  it('valid JSON passes', () => {
    const data = {
      version: 1,
      ids: makeIds(),
      goal: 'test',
      status: 'running',
      stepResults: [],
      statistics: {
        stepsCompleted: 0,
        stepsFailed: 0,
        stepsSkipped: 0,
        retryAttempts: 0,
        durationMs: 0,
        stepDurations: {},
      },
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const result = validateSerialized(JSON.stringify(data));
    expect(result.valid).toBe(true);
  });

  it('invalid JSON fails', () => {
    const result = validateSerialized('not json');
    expect(result.valid).toBe(false);
  });

  it('missing executionId fails', () => {
    const data = { version: 1, ids: {} };
    const result = validateSerialized(JSON.stringify(data));
    expect(result.valid).toBe(false);
  });
});
