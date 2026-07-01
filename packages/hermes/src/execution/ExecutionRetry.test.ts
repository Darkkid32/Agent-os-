import { describe, it, expect } from 'vitest';
import { RetryManager } from './ExecutionRetry.js';
import { DEFAULT_RETRY_POLICY, NO_RETRY_POLICY } from './ExecutionPolicy.js';

describe('RetryManager', () => {
  it('shouldRetry returns true for retryable error', () => {
    const rm = new RetryManager(DEFAULT_RETRY_POLICY);
    expect(rm.shouldRetry('step-1', 'STEP_FAILED')).toBe(true);
  });

  it('shouldRetry returns false for non-retryable error', () => {
    const rm = new RetryManager(DEFAULT_RETRY_POLICY);
    expect(rm.shouldRetry('step-1', 'UNKNOWN')).toBe(false);
  });

  it('shouldRetry returns false when exhausted', () => {
    const rm = new RetryManager({ ...DEFAULT_RETRY_POLICY, maxAttempts: 1 });
    rm.recordAttempt('step-1');
    expect(rm.shouldRetry('step-1', 'STEP_FAILED')).toBe(false);
  });

  it('shouldRetry returns false for no-retry policy', () => {
    const rm = new RetryManager(NO_RETRY_POLICY);
    expect(rm.shouldRetry('step-1', 'STEP_FAILED')).toBe(false);
  });

  it('recordAttempt increments attempt', () => {
    const rm = new RetryManager(DEFAULT_RETRY_POLICY);
    const result = rm.recordAttempt('step-1');
    expect(result.attempt).toBe(1);
    expect(result.delayMs).toBeGreaterThanOrEqual(0);
  });

  it('recordAttempt marks exhausted', () => {
    const rm = new RetryManager({ ...DEFAULT_RETRY_POLICY, maxAttempts: 1 });
    const result = rm.recordAttempt('step-1');
    expect(result.exhausted).toBe(true);
  });

  it('getState returns state', () => {
    const rm = new RetryManager(DEFAULT_RETRY_POLICY);
    rm.recordAttempt('step-1');
    const state = rm.getState('step-1');
    expect(state).toBeDefined();
    expect(state?.attempt).toBe(1);
  });

  it('getState returns undefined for unknown step', () => {
    const rm = new RetryManager(DEFAULT_RETRY_POLICY);
    expect(rm.getState('step-1')).toBeUndefined();
  });

  it('getPolicy returns policy', () => {
    const rm = new RetryManager(DEFAULT_RETRY_POLICY);
    expect(rm.getPolicy()).toBe(DEFAULT_RETRY_POLICY);
  });

  it('reset clears state', () => {
    const rm = new RetryManager(DEFAULT_RETRY_POLICY);
    rm.recordAttempt('step-1');
    rm.reset('step-1');
    expect(rm.getState('step-1')).toBeUndefined();
  });

  it('resetAll clears all states', () => {
    const rm = new RetryManager(DEFAULT_RETRY_POLICY);
    rm.recordAttempt('step-1');
    rm.recordAttempt('step-2');
    rm.resetAll();
    expect(rm.getState('step-1')).toBeUndefined();
    expect(rm.getState('step-2')).toBeUndefined();
  });

  it('getTotalAttempts sums all attempts', () => {
    const rm = new RetryManager(DEFAULT_RETRY_POLICY);
    rm.recordAttempt('step-1');
    rm.recordAttempt('step-1');
    rm.recordAttempt('step-2');
    expect(rm.getTotalAttempts()).toBe(3);
  });
});
