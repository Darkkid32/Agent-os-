/**
 * HTTP response builders.
 *
 * The webhook adapter speaks the same REST envelope shape as the
 * kernel's REST adapter (docs/architecture/platform.md §6.5):
 *
 *   success: { ok: true,  value: <T> }
 *   failure: { ok: false, error: { code, message, detail? } }
 *
 * Each builder returns a Fetch `Response`. Status codes are chosen
 * from the adapter's own translation table; consumers that need a
 * different status can supply their own handler that returns a
 * ResponseBody with a custom status.
 */
import type { HandlerError, ResponseBody, RoutingError } from './types.js';

const JSON_HEADERS: Readonly<Record<string, string>> = {
  'content-type': 'application/json; charset=utf-8',
};

const envelope = (okValue: boolean, payload: unknown): string =>
  JSON.stringify(okValue ? { ok: true, value: payload } : { ok: false, error: payload });

export const fromResponseBody = (rb: ResponseBody): Response => {
  const headers = new Headers(JSON_HEADERS);
  if (rb.headers) {
    for (const [k, v] of Object.entries(rb.headers)) headers.set(k, v);
  }
  return new Response(envelope(true, rb.body), { status: rb.status, headers });
};

export const okResponse = (value: unknown, status = 200): Response =>
  new Response(envelope(true, value), { status, headers: JSON_HEADERS });

export const errorResponse = (err: HandlerError | RoutingError, status: number): Response => {
  const headers = new Headers(JSON_HEADERS);
  if ('allow' in err && err.allow) {
    headers.set('allow', err.allow.join(', '));
  }
  return new Response(envelope(false, err), { status, headers });
};

export const notFoundResponse = (message: string): Response =>
  errorResponse({ code: 'NOT_FOUND', message }, 404);

export const methodNotAllowedResponse = (allow: readonly string[], message: string): Response => {
  const routing: RoutingError = {
    code: 'METHOD_NOT_ALLOWED',
    message,
    allow: allow as readonly ('GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE')[],
  };
  return errorResponse(routing, 405);
};

export const unauthorizedResponse = (message: string): Response =>
  errorResponse({ code: 'UNAUTHORIZED', message }, 401);

export const badRequestResponse = (message: string, detail?: unknown): Response =>
  errorResponse(
    {
      code: 'BAD_REQUEST',
      message,
      ...(detail === undefined ? {} : { detail }),
    },
    400,
  );

export const internalErrorResponse = (message: string): Response =>
  errorResponse({ code: 'INTERNAL', message }, 500);
