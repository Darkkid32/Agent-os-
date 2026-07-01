import { describe, it, expect } from 'vitest';
import {
  ExecutionError,
  ExecutionNotFoundError,
  ExecutionFailedError,
  ExecutionCancelledError,
  ExecutionTimeoutError,
  ExecutionPolicyViolationError,
  StepFailedError,
  StepTimeoutError,
  StepValidationError,
  RetryExhaustedError,
  CheckpointFailedError,
  InvalidStateTransitionError,
  PlanInvalidError,
  isExecutionError,
} from './ExecutionErrors.js';

describe('ExecutionError hierarchy', () => {
  it('ExecutionNotFoundError', () => {
    const e = new ExecutionNotFoundError('id-1');
    expect(e.code).toBe('EXECUTION_NOT_FOUND');
    expect(e.message).toContain('id-1');
    expect(e.name).toBe('ExecutionNotFoundError');
    expect(e instanceof ExecutionError).toBe(true);
    expect(e instanceof Error).toBe(true);
  });

  it('ExecutionFailedError', () => {
    const cause = new Error('disk full');
    const e = new ExecutionFailedError('failed', { cause });
    expect(e.code).toBe('EXECUTION_FAILED');
    expect(e.cause).toBe(cause);
    expect(e.name).toBe('ExecutionFailedError');
  });

  it('ExecutionCancelledError', () => {
    const e = new ExecutionCancelledError('user cancelled');
    expect(e.code).toBe('EXECUTION_CANCELLED');
    expect(e.message).toContain('user cancelled');
    expect(e.name).toBe('ExecutionCancelledError');
  });

  it('ExecutionTimeoutError', () => {
    const e = new ExecutionTimeoutError('exec-1', 5000);
    expect(e.code).toBe('EXECUTION_TIMEOUT');
    expect(e.message).toContain('5000');
    expect(e.name).toBe('ExecutionTimeoutError');
  });

  it('ExecutionPolicyViolationError', () => {
    const e = new ExecutionPolicyViolationError('policy-1', 'bad');
    expect(e.code).toBe('EXECUTION_POLICY_VIOLATION');
    expect(e.message).toContain('policy-1');
    expect(e.name).toBe('ExecutionPolicyViolationError');
  });

  it('StepFailedError', () => {
    const e = new StepFailedError('step-1', 'failed');
    expect(e.code).toBe('STEP_FAILED');
    expect(e.stepId).toBe('step-1');
    expect(e.name).toBe('StepFailedError');
  });

  it('StepTimeoutError', () => {
    const e = new StepTimeoutError('step-1', 5000);
    expect(e.code).toBe('STEP_TIMEOUT');
    expect(e.name).toBe('StepTimeoutError');
  });

  it('StepValidationError', () => {
    const e = new StepValidationError('step-1', ['err1', 'err2']);
    expect(e.code).toBe('STEP_VALIDATION_FAILED');
    expect(e.validationErrors).toEqual(['err1', 'err2']);
    expect(e.name).toBe('StepValidationError');
  });

  it('RetryExhaustedError', () => {
    const e = new RetryExhaustedError('step-1', 3);
    expect(e.code).toBe('RETRY_EXHAUSTED');
    expect(e.message).toContain('3');
    expect(e.name).toBe('RetryExhaustedError');
  });

  it('CheckpointFailedError', () => {
    const e = new CheckpointFailedError('ckpt failed');
    expect(e.code).toBe('CHECKPOINT_FAILED');
    expect(e.name).toBe('CheckpointFailedError');
  });

  it('InvalidStateTransitionError', () => {
    const e = new InvalidStateTransitionError('pending', 'completed');
    expect(e.code).toBe('INVALID_STATE_TRANSITION');
    expect(e.message).toContain('pending');
    expect(e.message).toContain('completed');
    expect(e.name).toBe('InvalidStateTransitionError');
  });

  it('PlanInvalidError', () => {
    const e = new PlanInvalidError('no steps');
    expect(e.code).toBe('PLAN_INVALID');
    expect(e.name).toBe('PlanInvalidError');
  });

  it('isExecutionError', () => {
    expect(isExecutionError(new ExecutionNotFoundError('x'))).toBe(true);
    expect(isExecutionError(new Error('x'))).toBe(false);
    expect(isExecutionError(null)).toBe(false);
    expect(isExecutionError('string')).toBe(false);
  });
});
