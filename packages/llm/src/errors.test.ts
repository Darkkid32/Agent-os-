/**
 * Tests for the typed LLMError hierarchy.
 */
import { describe, it, expect } from 'vitest';
import {
  LLMError,
  ProviderUnavailable,
  RateLimited,
  InvalidModel,
  AuthenticationFailed,
  Timeout,
  ContextLengthExceeded,
  UnknownProvider,
  ProviderError,
  InvalidRequest,
  isLLMError,
  toResult,
} from './errors.js';
import { ok, err } from '@agent-os/core';

describe('LLMError hierarchy', () => {
  it('every subclass carries the correct LLMErrorCode', () => {
    expect(new ProviderUnavailable('p', 'm').code).toBe('PROVIDER_UNAVAILABLE');
    expect(new RateLimited('p', 'm', 0).code).toBe('RATE_LIMITED');
    expect(new InvalidModel('p', 'm').code).toBe('INVALID_MODEL');
    expect(new AuthenticationFailed('p', 'm').code).toBe('AUTHENTICATION_FAILED');
    expect(new Timeout('p', 'm').code).toBe('TIMEOUT');
    expect(new ContextLengthExceeded('p', 'm').code).toBe('CONTEXT_LENGTH_EXCEEDED');
    expect(new UnknownProvider('p', 'm').code).toBe('UNKNOWN_PROVIDER');
    expect(new ProviderError('p', 'm').code).toBe('PROVIDER_ERROR');
    expect(new InvalidRequest('p', 'm').code).toBe('INVALID_REQUEST');
  });

  it('LLMError preserves providerId, name, message, and cause', () => {
    const cause = new Error('inner');
    const e = new ProviderUnavailable('openai', 'down', { cause });
    expect(e.providerId).toBe('openai');
    expect(e.message).toBe('down');
    expect(e.name).toBe('ProviderUnavailable');
    expect(e.cause).toBe(cause);
    expect(e).toBeInstanceOf(Error);
    expect(e).toBeInstanceOf(LLMError);
  });

  it('RateLimited captures retryAfterMs', () => {
    const e = new RateLimited('openai', 'too busy', 5000);
    expect(e.retryAfterMs).toBe(5000);
  });

  it('isLLMError narrows correctly', () => {
    expect(isLLMError(new ProviderUnavailable('p', 'm'))).toBe(true);
    expect(isLLMError(new Error('plain'))).toBe(false);
    expect(isLLMError({})).toBe(false);
    expect(isLLMError(null)).toBe(false);
    expect(isLLMError('string-error')).toBe(false);
  });

  it('toResult wraps a synchronous happy path', async () => {
    const result = await toResult(() => 2 + 3);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toBe(5);
    else throw new Error('expected ok');
  });

  it('toResult wraps a synchronous throw into a Result-error', async () => {
    const result = await toResult((): number => {
      throw new InvalidRequest('p', 'bad input');
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(InvalidRequest);
    }
  });

  it('toResult wraps a promise happy path', async () => {
    const result = await toResult(async () => 'ok');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toBe('ok');
  });

  it('toResult wraps a promise rejection', async () => {
    const result = await toResult(() => Promise.reject(new Timeout('p', 'slow')));
    expect(result.ok).toBe(false);
  });

  it('cause defaults to undefined when omitted', () => {
    const e = new InvalidModel('p', 'no such model');
    expect(e.cause).toBeUndefined();
  });

  it('UnknownProvider has no cause field', () => {
    const e = new UnknownProvider('p', 'unknown');
    expect(e.cause).toBeUndefined();
  });

  it('interoperates with @agent-os/core Result helpers (compile-time check)', async () => {
    const r: ReturnType<typeof ok> = ok(1);
    const e: ReturnType<typeof err> = err(new ProviderUnavailable('p', 'm'));
    expect(r.ok).toBe(true);
    expect(e.ok).toBe(false);
  });
});
