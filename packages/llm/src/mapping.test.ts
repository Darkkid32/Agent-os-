/**
 * Tests for SDK error mapping.
 */
import { describe, it, expect } from 'vitest';
import { mapSDKError, isRetryableStatusCode, parseRetryAfterMs } from './mapping.js';
import {
  RateLimited,
  AuthenticationFailed,
  UnknownProvider,
  type ProviderUnavailable,
} from './errors.js';

describe('isRetryableStatusCode', () => {
  it('returns true for 408, 409, 429, 5xx', () => {
    expect(isRetryableStatusCode(408)).toBe(true);
    expect(isRetryableStatusCode(409)).toBe(true);
    expect(isRetryableStatusCode(429)).toBe(true);
    expect(isRetryableStatusCode(500)).toBe(true);
    expect(isRetryableStatusCode(503)).toBe(true);
    expect(isRetryableStatusCode(599)).toBe(true);
  });

  it('returns false for 400, 401, 403, 404', () => {
    expect(isRetryableStatusCode(400)).toBe(false);
    expect(isRetryableStatusCode(401)).toBe(false);
    expect(isRetryableStatusCode(403)).toBe(false);
    expect(isRetryableStatusCode(404)).toBe(false);
  });
});

describe('parseRetryAfterMs', () => {
  it('returns the default for null/undefined/non-numeric', () => {
    expect(parseRetryAfterMs(undefined)).toBe(1000);
    expect(parseRetryAfterMs(null)).toBe(1000);
    expect(parseRetryAfterMs('garbage')).toBe(1000);
  });

  it('parses a numeric-seconds string', () => {
    expect(parseRetryAfterMs('2')).toBe(2000);
  });

  it('parses a numeric-seconds number', () => {
    expect(parseRetryAfterMs(0.5)).toBe(500);
  });

  it('parses future-date headers as the delay from now', () => {
    const future = new Date(Date.now() + 5000).toISOString();
    const result = parseRetryAfterMs(future);
    // The difference should be near 5000ms (allow large slack to avoid timer flake)
    expect(result).toBeGreaterThan(0);
    expect(result).toBeLessThanOrEqual(10000);
  });
});

describe('mapSDKError', () => {
  it('returns the error unchanged if it is already an LLMError', () => {
    const original = new UnknownProvider('p', 'x');
    expect(mapSDKError('p', original)).toBe(original);
  });

  it('maps status 401 to AuthenticationFailed', () => {
    const e = mapSDKError('openai', { status: 401, message: 'unauth' });
    expect(e).toBeInstanceOf(AuthenticationFailed);
  });

  it('maps status 403 / insufficient_quota to AuthenticationFailed', () => {
    expect(mapSDKError('x', { status: 403 }).code).toBe('AUTHENTICATION_FAILED');
    expect(mapSDKError('x', { code: 'insufficient_quota' }).code).toBe('AUTHENTICATION_FAILED');
    expect(mapSDKError('x', { code: 'billing_hard_limit_reached' }).code).toBe(
      'AUTHENTICATION_FAILED',
    );
  });

  it('maps status 404 / model_not_found to InvalidModel', () => {
    expect(mapSDKError('x', { status: 404 }).code).toBe('INVALID_MODEL');
    expect(mapSDKError('x', { code: 'model_not_found' }).code).toBe('INVALID_MODEL');
  });

  it('maps status 408 / timeout to Timeout', () => {
    expect(mapSDKError('x', { status: 408 }).code).toBe('TIMEOUT');
    expect(mapSDKError('x', { code: 'request_timeout' }).code).toBe('TIMEOUT');
    expect(mapSDKError('x', { code: 'timeout' }).code).toBe('TIMEOUT');
  });

  it('maps status 413 / context_length_exceeded to ContextLengthExceeded', () => {
    expect(mapSDKError('x', { status: 413 }).code).toBe('CONTEXT_LENGTH_EXCEEDED');
    expect(mapSDKError('x', { code: 'context_length_exceeded' }).code).toBe(
      'CONTEXT_LENGTH_EXCEEDED',
    );
  });

  it('maps status 429 to RateLimited with retry-after', () => {
    const parsed = mapSDKError('x', {
      status: 429,
      message: 'slow down',
      headers: { 'retry-after': '2' },
    });
    expect(parsed).toBeInstanceOf(RateLimited);
    expect(parsed.retryAfterMs).toBe(2000);
  });

  it('maps status 400 to InvalidRequest', () => {
    expect(mapSDKError('x', { status: 400 }).code).toBe('INVALID_REQUEST');
  });

  it('maps status 5xx to ProviderUnavailable', () => {
    expect(mapSDKError('x', { status: 500 }).code).toBe('PROVIDER_UNAVAILABLE');
    expect(mapSDKError('x', { status: 503 }).code).toBe('PROVIDER_UNAVAILABLE');
  });

  it('falls back to ProviderError for unknown shapes', () => {
    expect(mapSDKError('x', { message: 'weird error' }).code).toBe('PROVIDER_ERROR');
  });

  it('handles string-only errors', () => {
    expect(mapSDKError('x', 'plain string').code).toBe('PROVIDER_ERROR');
  });

  it('handles null', () => {
    expect(mapSDKError('x', null).code).toBe('PROVIDER_ERROR');
  });

  it('handles errorCode / errorMessage alias keys', () => {
    expect(mapSDKError('x', { statusCode: 401 }).code).toBe('AUTHENTICATION_FAILED');
    expect(mapSDKError('x', { httpStatus: 404 }).code).toBe('INVALID_MODEL');
    expect(mapSDKError('x', { errorCode: 'model_not_found' }).code).toBe('INVALID_MODEL');
    // errorMessage alone only carries a message, no status/code, so it falls
    // through to ProviderError. Verify the message flows through.
    const result = mapSDKError('x', { errorMessage: 'the model is missing' });
    expect(result.code).toBe('PROVIDER_ERROR');
    expect(result.message).toBe('the model is missing');
    expect(mapSDKError('x', { errorType: 'invalid_request_error' }).code).toBe('INVALID_REQUEST');
    expect(mapSDKError('x', { code: 'validation_error' }).code).toBe('INVALID_REQUEST');
    expect(mapSDKError('x', { code: 'rate_limited' }).code).toBe('RATE_LIMITED');
    expect(mapSDKError('x', { code: 'context_window_exceeded' }).code).toBe(
      'CONTEXT_LENGTH_EXCEEDED',
    );
    expect(mapSDKError('x', { code: 'server_error' }).code).toBe('PROVIDER_UNAVAILABLE');
  });

  it('preserves the original error as cause', () => {
    const original = { status: 503, message: 'down' };
    const mapped = mapSDKError('x', original) as ProviderUnavailable;
    expect(mapped.cause).toBe(original);
  });
});
