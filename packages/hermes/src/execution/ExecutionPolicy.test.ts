import { describe, it, expect } from 'vitest';
import {
  DEFAULT_EXECUTION_POLICY,
  DEFAULT_RETRY_POLICY,
  NO_RETRY_POLICY,
  FIXED_RETRY_POLICY,
  mergeExecutionPolicies,
  mergeRetryPolicies,
  isRetryable,
  calculateRetryDelay,
} from './ExecutionPolicy.js';

describe('DEFAULT_EXECUTION_POLICY', () => {
  it('has expected values', () => {
    expect(DEFAULT_EXECUTION_POLICY.maxDurationMs).toBe(300000);
    expect(DEFAULT_EXECUTION_POLICY.maxRetries).toBe(3);
    expect(DEFAULT_EXECUTION_POLICY.enableCheckpoints).toBe(true);
  });
});

describe('DEFAULT_RETRY_POLICY', () => {
  it('has expected values', () => {
    expect(DEFAULT_RETRY_POLICY.strategy).toBe('exponential-backoff');
    expect(DEFAULT_RETRY_POLICY.maxAttempts).toBe(3);
  });
});

describe('NO_RETRY_POLICY', () => {
  it('has no retries', () => {
    expect(NO_RETRY_POLICY.strategy).toBe('none');
    expect(NO_RETRY_POLICY.maxAttempts).toBe(0);
  });
});

describe('FIXED_RETRY_POLICY', () => {
  it('has fixed delay', () => {
    expect(FIXED_RETRY_POLICY.strategy).toBe('fixed');
    expect(FIXED_RETRY_POLICY.baseDelayMs).toBe(2000);
  });
});

describe('mergeExecutionPolicies', () => {
  it('overrides defaults', () => {
    const merged = mergeExecutionPolicies(DEFAULT_EXECUTION_POLICY, { maxRetries: 5 });
    expect(merged.maxRetries).toBe(5);
    expect(merged.maxDurationMs).toBe(DEFAULT_EXECUTION_POLICY.maxDurationMs);
  });
});

describe('mergeRetryPolicies', () => {
  it('overrides defaults', () => {
    const merged = mergeRetryPolicies(DEFAULT_RETRY_POLICY, { maxAttempts: 10 });
    expect(merged.maxAttempts).toBe(10);
  });
});

describe('isRetryable', () => {
  it('returns true for retryable error', () => {
    expect(isRetryable('STEP_FAILED', DEFAULT_RETRY_POLICY)).toBe(true);
  });

  it('returns false for non-retryable error', () => {
    expect(isRetryable('UNKNOWN_ERROR', DEFAULT_RETRY_POLICY)).toBe(false);
  });

  it('returns false for no-retry policy', () => {
    expect(isRetryable('STEP_FAILED', NO_RETRY_POLICY)).toBe(false);
  });

  it('returns false for undefined error', () => {
    expect(isRetryable(undefined, DEFAULT_RETRY_POLICY)).toBe(false);
  });
});

describe('calculateRetryDelay', () => {
  it('returns 0 for no-retry', () => {
    expect(calculateRetryDelay(1, NO_RETRY_POLICY)).toBe(0);
  });

  it('returns base delay for fixed', () => {
    expect(calculateRetryDelay(1, FIXED_RETRY_POLICY)).toBe(2000);
  });

  it('calculates exponential backoff', () => {
    expect(calculateRetryDelay(1, DEFAULT_RETRY_POLICY)).toBe(1000);
    expect(calculateRetryDelay(2, DEFAULT_RETRY_POLICY)).toBe(2000);
    expect(calculateRetryDelay(3, DEFAULT_RETRY_POLICY)).toBe(4000);
  });

  it('caps at max delay', () => {
    expect(calculateRetryDelay(10, DEFAULT_RETRY_POLICY)).toBe(DEFAULT_RETRY_POLICY.maxDelayMs);
  });
});
