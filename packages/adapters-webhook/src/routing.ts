/**
 * Routing.
 *
 * The adapter is a stateless HTTP-in / HTTP-out function. The
 * consumer supplies a route table through WebhookAdapterConfig. This
 * module matches method + path against the table and surfaces the
 * standard 404 / 405 outcomes.
 *
 * Routing is exact-match: paths must begin with `/` and are
 * case-sensitive. Consumers wanting prefix routes register one entry
 * per concrete path. This keeps the adapter free of vendor-specific
 * routing semantics (GitHub event headers, Stripe API version, etc.).
 */
import { err, ok, type Result } from '@agent-os/core';
import type { RoutingError, WebhookMethod, WebhookRoute } from './types.js';

export interface RouteMatch {
  readonly route: WebhookRoute;
}

export const matchRoute = (
  routes: readonly WebhookRoute[],
  method: string,
  path: string,
): Result<RouteMatch, RoutingError> => {
  const upperMethod = method.toUpperCase() as WebhookMethod;
  if (!isKnownMethod(upperMethod)) {
    return unknownMethod(routes, path, upperMethod);
  }
  const exact = routes.find((r) => r.method === upperMethod && r.path === path);
  if (exact) return ok({ route: exact });

  const pathOnly = routes.find((r) => r.path === path);
  if (pathOnly) {
    return err({
      code: 'METHOD_NOT_ALLOWED',
      message: `method ${upperMethod} not allowed for ${path}`,
      allow: methodsForPath(routes, path),
    });
  }
  return err({ code: 'NOT_FOUND', message: `no route for ${upperMethod} ${path}` });
};

const KNOWN_METHODS: ReadonlySet<WebhookMethod> = new Set<WebhookMethod>([
  'GET',
  'POST',
  'PUT',
  'PATCH',
  'DELETE',
]);

const isKnownMethod = (m: string): m is WebhookMethod => KNOWN_METHODS.has(m as WebhookMethod);

const methodsForPath = (
  routes: readonly WebhookRoute[],
  path: string,
): readonly WebhookMethod[] => {
  const set = new Set<WebhookMethod>();
  for (const r of routes) if (r.path === path) set.add(r.method);
  return Array.from(set);
};

const unknownMethod = (
  routes: readonly WebhookRoute[],
  path: string,
  method: string,
): Result<RouteMatch, RoutingError> => {
  const pathOnly = routes.find((r) => r.path === path);
  if (pathOnly) {
    return err({
      code: 'METHOD_NOT_ALLOWED',
      message: `method ${method} not allowed for ${path}`,
      allow: methodsForPath(routes, path),
    });
  }
  return err({ code: 'NOT_FOUND', message: `no route for ${method} ${path}` });
};
