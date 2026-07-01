/**
 * Memory-specific error classes.
 *
 * Layer: 2 (Platform)
 */

// ---------------------------------------------------------------------------
// Error codes
// ---------------------------------------------------------------------------

export type MemoryErrorCode =
  | 'MEMORY_NOT_FOUND'
  | 'MEMORY_STORE_FAILED'
  | 'MEMORY_RETRIEVAL_FAILED'
  | 'MEMORY_PROVIDER_UNAVAILABLE'
  | 'MEMORY_VALIDATION_FAILED'
  | 'MEMORY_DUPLICATE'
  | 'MEMORY_QUOTA_EXCEEDED'
  | 'MEMORY_POLICY_VIOLATION'
  | 'MEMORY_INDEX_FAILED';

// ---------------------------------------------------------------------------
// Base memory error
// ---------------------------------------------------------------------------

/**
 * Abstract base for all memory-related errors.
 */
export abstract class MemoryError extends Error {
  public readonly code: MemoryErrorCode;

  protected constructor(
    code: MemoryErrorCode,
    message: string,
    options?: { readonly cause?: unknown },
  ) {
    super(message, options);
    this.code = code;
    this.name = 'MemoryError';
  }
}

// ---------------------------------------------------------------------------
// Concrete errors
// ---------------------------------------------------------------------------

export class MemoryNotFoundError extends MemoryError {
  public constructor(id: string) {
    super('MEMORY_NOT_FOUND', `Memory "${id}" not found.`);
    this.name = 'MemoryNotFoundError';
  }
}

export class MemoryStoreFailedError extends MemoryError {
  public constructor(message: string, options?: { readonly cause?: unknown }) {
    super('MEMORY_STORE_FAILED', message, options);
    this.name = 'MemoryStoreFailedError';
  }
}

export class MemoryRetrievalFailedError extends MemoryError {
  public constructor(message: string, options?: { readonly cause?: unknown }) {
    super('MEMORY_RETRIEVAL_FAILED', message, options);
    this.name = 'MemoryRetrievalFailedError';
  }
}

export class MemoryProviderUnavailableError extends MemoryError {
  public constructor(providerId: string) {
    super('MEMORY_PROVIDER_UNAVAILABLE', `Memory provider "${providerId}" is not available.`);
    this.name = 'MemoryProviderUnavailableError';
  }
}

export class MemoryValidationFailedError extends MemoryError {
  public readonly validationErrors: readonly string[];

  public constructor(errors: readonly string[]) {
    super('MEMORY_VALIDATION_FAILED', `Memory validation failed: ${errors.join('; ')}`);
    this.validationErrors = errors;
    this.name = 'MemoryValidationFailedError';
  }
}

export class MemoryDuplicateError extends MemoryError {
  public constructor(id: string) {
    super('MEMORY_DUPLICATE', `Memory "${id}" already exists.`);
    this.name = 'MemoryDuplicateError';
  }
}

export class MemoryQuotaExceededError extends MemoryError {
  public constructor(scope: string, limit: number) {
    super('MEMORY_QUOTA_EXCEEDED', `Memory quota exceeded for scope "${scope}" (limit: ${limit}).`);
    this.name = 'MemoryQuotaExceededError';
  }
}

export class MemoryPolicyViolationError extends MemoryError {
  public constructor(policyId: string, message: string) {
    super('MEMORY_POLICY_VIOLATION', `Policy "${policyId}" violation: ${message}`);
    this.name = 'MemoryPolicyViolationError';
  }
}

export class MemoryIndexFailedError extends MemoryError {
  public constructor(message: string, options?: { readonly cause?: unknown }) {
    super('MEMORY_INDEX_FAILED', message, options);
    this.name = 'MemoryIndexFailedError';
  }
}

// ---------------------------------------------------------------------------
// Type guard
// ---------------------------------------------------------------------------

/**
 * Check if an error is a MemoryError.
 */
export const isMemoryError = (e: unknown): e is MemoryError => e instanceof MemoryError;
