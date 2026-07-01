/**
 * Typed LLM error model.
 *
 * Every error thrown or returned through `Result` from `@agent-os/llm`
 * MUST extend `LLMError`. Each subclass maps to a stable `code` that maps
 * deterministically to `@agent-os/core` adapter error codes (used by
 * adapters and the REST envelope).
 */
import type { Result } from '@agent-os/core';

export type LLMErrorCode =
  | 'PROVIDER_UNAVAILABLE'
  | 'RATE_LIMITED'
  | 'INVALID_MODEL'
  | 'AUTHENTICATION_FAILED'
  | 'TIMEOUT'
  | 'CONTEXT_LENGTH_EXCEEDED'
  | 'UNKNOWN_PROVIDER'
  | 'PROVIDER_ERROR'
  | 'INVALID_REQUEST';

export abstract class LLMError extends Error {
  public readonly code: LLMErrorCode;
  public readonly providerId: string;
  public override readonly cause?: unknown;
  public readonly retryAfterMs?: number;

  protected constructor(
    code: LLMErrorCode,
    providerId: string,
    message: string,
    options?: { readonly cause?: unknown; readonly retryAfterMs?: number },
  ) {
    super(message);
    this.name = new.target.name;
    this.code = code;
    this.providerId = providerId;
    if (options?.cause !== undefined) this.cause = options.cause;
    if (options?.retryAfterMs !== undefined) this.retryAfterMs = options.retryAfterMs;
  }
}

export class ProviderUnavailable extends LLMError {
  public constructor(providerId: string, message: string, options?: { readonly cause?: unknown }) {
    super('PROVIDER_UNAVAILABLE', providerId, message, options);
  }
}

export class RateLimited extends LLMError {
  public override readonly retryAfterMs: number;
  public constructor(
    providerId: string,
    message: string,
    retryAfterMs: number,
    options?: { readonly cause?: unknown },
  ) {
    super('RATE_LIMITED', providerId, message, { ...options, retryAfterMs });
    this.retryAfterMs = retryAfterMs;
  }
}

export class InvalidModel extends LLMError {
  public constructor(providerId: string, message: string, options?: { readonly cause?: unknown }) {
    super('INVALID_MODEL', providerId, message, options);
  }
}

export class AuthenticationFailed extends LLMError {
  public constructor(providerId: string, message: string, options?: { readonly cause?: unknown }) {
    super('AUTHENTICATION_FAILED', providerId, message, options);
  }
}

export class Timeout extends LLMError {
  public constructor(providerId: string, message: string, options?: { readonly cause?: unknown }) {
    super('TIMEOUT', providerId, message, options);
  }
}

export class ContextLengthExceeded extends LLMError {
  public constructor(providerId: string, message: string, options?: { readonly cause?: unknown }) {
    super('CONTEXT_LENGTH_EXCEEDED', providerId, message, options);
  }
}

export class UnknownProvider extends LLMError {
  public constructor(providerId: string, message: string) {
    super('UNKNOWN_PROVIDER', providerId, message);
  }
}

export class ProviderError extends LLMError {
  public constructor(providerId: string, message: string, options?: { readonly cause?: unknown }) {
    super('PROVIDER_ERROR', providerId, message, options);
  }
}

export class InvalidRequest extends LLMError {
  public constructor(providerId: string, message: string, options?: { readonly cause?: unknown }) {
    super('INVALID_REQUEST', providerId, message, options);
  }
}

export const isLLMError = (e: unknown): e is LLMError => e instanceof LLMError;

export const toResult = <T>(fn: () => T | Promise<T>): Promise<Result<T>> => {
  try {
    const value = fn();
    if (value instanceof Promise) {
      return value.then(
        (v) => ({ ok: true, value: v }) as Result<T>,
        (e: unknown) => ({ ok: false, error: e }) as Result<T>,
      );
    }
    return Promise.resolve({ ok: true, value } as Result<T>);
  } catch (e) {
    return Promise.resolve({ ok: false, error: e } as Result<T>);
  }
};
