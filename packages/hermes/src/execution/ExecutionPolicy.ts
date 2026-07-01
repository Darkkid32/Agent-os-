/**
 * Execution policies.
 *
 * Defines default policies and policy enforcement.
 *
 * Layer: 4 (Application)
 */

import type { ExecutionPolicy, RetryPolicy } from './ExecutionTypes.js';

// ---------------------------------------------------------------------------
// Default policies
// ---------------------------------------------------------------------------

/**
 * Default execution policy.
 */
export const DEFAULT_EXECUTION_POLICY: ExecutionPolicy = {
  maxDurationMs: 300000, // 5 minutes
  maxRetries: 3,
  maxSteps: 50,
  defaultStepTimeoutMs: 30000, // 30 seconds
  cancellation: 'cooperative',
  enableCheckpoints: true,
};

/**
 * Default retry policy.
 */
export const DEFAULT_RETRY_POLICY: RetryPolicy = {
  strategy: 'exponential-backoff',
  maxAttempts: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  multiplier: 2,
  retryOn: ['STEP_FAILED', 'STEP_TIMEOUT', 'TOOL_TIMEOUT', 'TOOL_EXECUTION_FAILED'],
};

/**
 * No-retry policy.
 */
export const NO_RETRY_POLICY: RetryPolicy = {
  strategy: 'none',
  maxAttempts: 0,
  baseDelayMs: 0,
  maxDelayMs: 0,
  multiplier: 1,
  retryOn: [],
};

/**
 * Fixed retry policy.
 */
export const FIXED_RETRY_POLICY: RetryPolicy = {
  strategy: 'fixed',
  maxAttempts: 3,
  baseDelayMs: 2000,
  maxDelayMs: 2000,
  multiplier: 1,
  retryOn: ['STEP_FAILED', 'STEP_TIMEOUT'],
};

// ---------------------------------------------------------------------------
// Policy helpers
// ---------------------------------------------------------------------------

/**
 * Merge execution policies (overrides override defaults).
 */
export const mergeExecutionPolicies = (
  defaults: ExecutionPolicy,
  overrides: Partial<ExecutionPolicy>,
): ExecutionPolicy => ({
  ...defaults,
  ...overrides,
});

/**
 * Merge retry policies.
 */
export const mergeRetryPolicies = (
  defaults: RetryPolicy,
  overrides: Partial<RetryPolicy>,
): RetryPolicy => ({
  ...defaults,
  ...overrides,
});

/**
 * Check if an error code is retryable.
 */
export const isRetryable = (errorCode: string | undefined, retryPolicy: RetryPolicy): boolean => {
  if (retryPolicy.strategy === 'none') return false;
  if (errorCode === undefined) return false;
  return retryPolicy.retryOn.includes(errorCode);
};

/**
 * Calculate retry delay.
 */
export const calculateRetryDelay = (attempt: number, retryPolicy: RetryPolicy): number => {
  if (retryPolicy.strategy === 'none') return 0;
  if (retryPolicy.strategy === 'fixed') return retryPolicy.baseDelayMs;

  // Exponential backoff
  const delay = retryPolicy.baseDelayMs * Math.pow(retryPolicy.multiplier, attempt - 1);
  return Math.min(delay, retryPolicy.maxDelayMs);
};
