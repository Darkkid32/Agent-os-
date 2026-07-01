/**
 * Mapping helpers that normalize vendor SDK errors into the Agent OS LLM
 * error taxonomy. The goal: callers can branch on `code` regardless of the
 * underlying vendor.
 */
import {
  AuthenticationFailed,
  ContextLengthExceeded,
  InvalidModel,
  InvalidRequest,
  ProviderError,
  ProviderUnavailable,
  RateLimited,
  Timeout,
  isLLMError,
  type LLMError,
} from './errors.js';

export interface SDKErrorShape {
  readonly status?: number;
  readonly code?: string;
  readonly message?: string;
  readonly type?: string;
}

export const isRetryableStatusCode = (status: number): boolean =>
  status === 408 || status === 409 || status === 429 || status >= 500;

const RETRY_AFTER_DEFAULT_MS = 1000;

export const parseRetryAfterMs = (raw: unknown): number => {
  if (typeof raw === 'number' && Number.isFinite(raw) && raw >= 0) {
    return Math.round(raw * 1000);
  }
  if (typeof raw === 'string') {
    // Numeric-seconds form is short and pure-digits; use that only when the
    // string obviously isn't an ISO date. Anything containing "/" or "-"
    // (year-month-day) or "T" (date+time) is treated as a date.
    const looksLikeDate = /[Tt]|-/.test(raw);
    if (!looksLikeDate) {
      const asNumber = Number.parseFloat(raw);
      if (Number.isFinite(asNumber) && asNumber >= 0) return Math.round(asNumber * 1000);
      return RETRY_AFTER_DEFAULT_MS;
    }
    const asDate = Date.parse(raw);
    if (Number.isFinite(asDate)) return Math.max(0, asDate - Date.now());
  }
  return RETRY_AFTER_DEFAULT_MS;
};

const toSdkShape = (e: unknown): SDKErrorShape => {
  if (e === null || typeof e !== 'object') {
    return typeof e === 'string' ? { message: e } : {};
  }
  const obj = e as Record<string, unknown>;
  const statusRaw = obj['status'] ?? obj['statusCode'] ?? obj['httpStatus'];
  const codeRaw = obj['code'] ?? obj['errorCode'];
  const messageRaw = obj['message'] ?? obj['errorMessage'];
  const typeRaw = obj['type'] ?? obj['errorType'];
  return {
    ...(typeof statusRaw === 'number' ? { status: statusRaw } : {}),
    ...(typeof codeRaw === 'string' || typeof codeRaw === 'number'
      ? { code: String(codeRaw) }
      : {}),
    ...(typeof messageRaw === 'string' ? { message: messageRaw } : {}),
    ...(typeof typeRaw === 'string' ? { type: typeRaw } : {}),
  };
};

export const mapSDKError = (providerId: string, raw: unknown): LLMError => {
  if (isLLMError(raw)) return raw;
  const shape = toSdkShape(raw);
  const status = shape.status ?? 0;
  const message = shape.message ?? 'Unknown provider error';
  const code = shape.code ?? shape.type ?? '';

  if (status === 401 || code === 'invalid_api_key' || code === 'authentication_failed') {
    return new AuthenticationFailed(providerId, 'Provider rejected API key.', { cause: raw });
  }
  if (status === 403 || code === 'insufficient_quota' || code === 'billing_hard_limit_reached') {
    return new AuthenticationFailed(
      providerId,
      message || 'Provider denied the request (billing/quota).',
      { cause: raw },
    );
  }
  if (status === 404 || code === 'model_not_found' || code === 'invalid_model') {
    return new InvalidModel(providerId, message || `Unknown model for provider ${providerId}.`, {
      cause: raw,
    });
  }
  if (
    status === 408 ||
    code === 'request_timeout' ||
    code === 'timeout' ||
    code === 'request_time_out'
  ) {
    return new Timeout(providerId, message || 'Provider request timed out.', { cause: raw });
  }
  if (status === 413 || code === 'context_length_exceeded' || code === 'context_window_exceeded') {
    return new ContextLengthExceeded(
      providerId,
      message || 'Input exceeds the model context length.',
      { cause: raw },
    );
  }
  if (status === 429 || code === 'rate_limited') {
    return new RateLimited(
      providerId,
      message || 'Provider rate limit hit.',
      parseRetryAfterMs(
        (raw as { headers?: Record<string, string> } | null)?.headers?.['retry-after'],
      ),
      { cause: raw },
    );
  }
  if (
    status === 400 ||
    code === 'invalid_request' ||
    code === 'invalid_request_error' ||
    code === 'validation_error'
  ) {
    return new InvalidRequest(providerId, message || 'Provider rejected invalid request.', {
      cause: raw,
    });
  }
  if (status >= 500 || code === 'server_error' || code === 'provider_unavailable') {
    return new ProviderUnavailable(providerId, message || 'Provider is unavailable.', {
      cause: raw,
    });
  }
  return new ProviderError(providerId, message, { cause: raw });
};
