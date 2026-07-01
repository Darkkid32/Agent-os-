/**
 * Tests for PlanningErrors.
 */
import { describe, it, expect } from 'vitest';
import {
  PlanningError,
  PlanningFailedError,
  InvalidGoalError,
  NoToolsAvailableError,
  StrategyNotSupportedError,
  MaxStepsExceededError,
  PlanValidationError,
  CycleDetectedError,
  MissingDependencyError,
  DuplicateStepIdError,
  EmptyPlanError,
  ToolNotFoundError,
  InvalidDependencyError,
  isPlanningError,
} from './PlanningErrors.js';

describe('PlanningError hierarchy', () => {
  it('PlanningFailedError has correct code', () => {
    const e = new PlanningFailedError('something broke');
    expect(e.code).toBe('PLANNING_FAILED');
    expect(e.message).toBe('something broke');
    expect(e.name).toBe('PlanningFailedError');
    expect(e).toBeInstanceOf(Error);
    expect(e).toBeInstanceOf(PlanningError);
  });

  it('InvalidGoalError has correct code', () => {
    const e = new InvalidGoalError('empty goal');
    expect(e.code).toBe('INVALID_GOAL');
    expect(e.message).toBe('empty goal');
    expect(e.name).toBe('InvalidGoalError');
  });

  it('NoToolsAvailableError has correct code', () => {
    const e = new NoToolsAvailableError();
    expect(e.code).toBe('NO_TOOLS_AVAILABLE');
    expect(e.name).toBe('NoToolsAvailableError');
  });

  it('StrategyNotSupportedError has correct code', () => {
    const e = new StrategyNotSupportedError('hybrid');
    expect(e.code).toBe('STRATEGY_NOT_SUPPORTED');
    expect(e.message).toContain('hybrid');
    expect(e.name).toBe('StrategyNotSupportedError');
  });

  it('MaxStepsExceededError has correct code', () => {
    const e = new MaxStepsExceededError(5);
    expect(e.code).toBe('MAX_STEPS_EXCEEDED');
    expect(e.message).toContain('5');
    expect(e.name).toBe('MaxStepsExceededError');
  });

  it('PlanValidationError stores validation errors', () => {
    const e = new PlanValidationError(['err1', 'err2']);
    expect(e.code).toBe('VALIDATION_FAILED');
    expect(e.validationErrors).toEqual(['err1', 'err2']);
    expect(e.message).toContain('err1');
    expect(e.name).toBe('PlanValidationError');
  });

  it('CycleDetectedError stores cycle', () => {
    const e = new CycleDetectedError(['a', 'b', 'c', 'a']);
    expect(e.code).toBe('CYCLE_DETECTED');
    expect(e.cycle).toEqual(['a', 'b', 'c', 'a']);
    expect(e.message).toContain('a -> b -> c -> a');
    expect(e.name).toBe('CycleDetectedError');
  });

  it('MissingDependencyError has correct code', () => {
    const e = new MissingDependencyError('step-2', 'step-99');
    expect(e.code).toBe('MISSING_DEPENDENCY');
    expect(e.message).toContain('step-2');
    expect(e.message).toContain('step-99');
    expect(e.name).toBe('MissingDependencyError');
  });

  it('DuplicateStepIdError has correct code', () => {
    const e = new DuplicateStepIdError('step-1');
    expect(e.code).toBe('DUPLICATE_STEP_ID');
    expect(e.message).toContain('step-1');
    expect(e.name).toBe('DuplicateStepIdError');
  });

  it('EmptyPlanError has correct code', () => {
    const e = new EmptyPlanError();
    expect(e.code).toBe('EMPTY_PLAN');
    expect(e.name).toBe('EmptyPlanError');
  });

  it('ToolNotFoundError has correct code', () => {
    const e = new ToolNotFoundError('search');
    expect(e.code).toBe('TOOL_NOT_FOUND');
    expect(e.message).toContain('search');
    expect(e.name).toBe('ToolNotFoundError');
  });

  it('InvalidDependencyError has correct code', () => {
    const e = new InvalidDependencyError('step-1', 'self-reference');
    expect(e.code).toBe('INVALID_DEPENDENCY');
    expect(e.message).toContain('step-1');
    expect(e.message).toContain('self-reference');
    expect(e.name).toBe('InvalidDependencyError');
  });

  it('PlanningFailedError preserves cause', () => {
    const cause = new Error('inner');
    const e = new PlanningFailedError('outer', { cause });
    expect(e.cause).toBe(cause);
  });
});

describe('isPlanningError', () => {
  it('returns true for PlanningError instances', () => {
    expect(isPlanningError(new PlanningFailedError('x'))).toBe(true);
    expect(isPlanningError(new InvalidGoalError('x'))).toBe(true);
    expect(isPlanningError(new NoToolsAvailableError())).toBe(true);
    expect(isPlanningError(new EmptyPlanError())).toBe(true);
  });

  it('returns false for non-PlanningError values', () => {
    expect(isPlanningError(new Error('plain'))).toBe(false);
    expect(isPlanningError(null)).toBe(false);
    expect(isPlanningError(undefined)).toBe(false);
    expect(isPlanningError('string')).toBe(false);
    expect(isPlanningError(42)).toBe(false);
    expect(isPlanningError({})).toBe(false);
  });
});
