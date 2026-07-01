import { describe, it, expect } from 'vitest';
import {
  MemoryError,
  MemoryNotFoundError,
  MemoryStoreFailedError,
  MemoryRetrievalFailedError,
  MemoryProviderUnavailableError,
  MemoryValidationFailedError,
  MemoryDuplicateError,
  MemoryQuotaExceededError,
  MemoryPolicyViolationError,
  MemoryIndexFailedError,
  isMemoryError,
} from './MemoryErrors.js';

describe('MemoryError hierarchy', () => {
  it('MemoryNotFoundError', () => {
    const e = new MemoryNotFoundError('id-1');
    expect(e.code).toBe('MEMORY_NOT_FOUND');
    expect(e.message).toContain('id-1');
    expect(e.name).toBe('MemoryNotFoundError');
    expect(e instanceof MemoryError).toBe(true);
    expect(e instanceof Error).toBe(true);
  });

  it('MemoryStoreFailedError', () => {
    const cause = new Error('disk full');
    const e = new MemoryStoreFailedError('store failed', { cause });
    expect(e.code).toBe('MEMORY_STORE_FAILED');
    expect(e.cause).toBe(cause);
    expect(e.name).toBe('MemoryStoreFailedError');
  });

  it('MemoryRetrievalFailedError', () => {
    const e = new MemoryRetrievalFailedError('retrieval failed');
    expect(e.code).toBe('MEMORY_RETRIEVAL_FAILED');
    expect(e.name).toBe('MemoryRetrievalFailedError');
  });

  it('MemoryProviderUnavailableError', () => {
    const e = new MemoryProviderUnavailableError('pg');
    expect(e.code).toBe('MEMORY_PROVIDER_UNAVAILABLE');
    expect(e.message).toContain('pg');
    expect(e.name).toBe('MemoryProviderUnavailableError');
  });

  it('MemoryValidationFailedError', () => {
    const e = new MemoryValidationFailedError(['err1', 'err2']);
    expect(e.code).toBe('MEMORY_VALIDATION_FAILED');
    expect(e.validationErrors).toEqual(['err1', 'err2']);
    expect(e.name).toBe('MemoryValidationFailedError');
  });

  it('MemoryDuplicateError', () => {
    const e = new MemoryDuplicateError('id-1');
    expect(e.code).toBe('MEMORY_DUPLICATE');
    expect(e.name).toBe('MemoryDuplicateError');
  });

  it('MemoryQuotaExceededError', () => {
    const e = new MemoryQuotaExceededError('scope', 100);
    expect(e.code).toBe('MEMORY_QUOTA_EXCEEDED');
    expect(e.message).toContain('scope');
    expect(e.message).toContain('100');
    expect(e.name).toBe('MemoryQuotaExceededError');
  });

  it('MemoryPolicyViolationError', () => {
    const e = new MemoryPolicyViolationError('policy-1', 'bad');
    expect(e.code).toBe('MEMORY_POLICY_VIOLATION');
    expect(e.message).toContain('policy-1');
    expect(e.name).toBe('MemoryPolicyViolationError');
  });

  it('MemoryIndexFailedError', () => {
    const e = new MemoryIndexFailedError('index failed');
    expect(e.code).toBe('MEMORY_INDEX_FAILED');
    expect(e.name).toBe('MemoryIndexFailedError');
  });

  it('isMemoryError', () => {
    expect(isMemoryError(new MemoryNotFoundError('x'))).toBe(true);
    expect(isMemoryError(new Error('x'))).toBe(false);
    expect(isMemoryError(null)).toBe(false);
    expect(isMemoryError('string')).toBe(false);
  });
});
