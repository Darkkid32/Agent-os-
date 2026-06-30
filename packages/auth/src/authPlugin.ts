/**
 * Fastify authentication for Agent OS HTTP surfaces.
 *
 * Provides `addAuth` which registers a preHandler hook that:
 * 1. Extracts credentials from `Authorization` header (Bearer token)
 *    or `X-API-Key` header
 * 2. Passes credentials to the configured `AuthenticationProvider`
 * 3. On success: attaches `AuthenticatedSubject` to `request.auth`
 * 4. On failure: returns 401/403 with structured error envelope
 * 5. Skips authentication for configured public paths (e.g., /health)
 *
 * Also provides `requireAction` for route-level authorization.
 *
 * Audit logs all authentication failures via the configured logger.
 */
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { ADAPTER_ERROR_HTTP_STATUS, adapterError } from '@agent-os/core/adapter-errors';
import { createLogger } from '@agent-os/observability';
import type { AuthConfig, AuthenticatedSubject } from './types.js';
import { canHttp, type HttpAction } from './permissions.js';

declare module 'fastify' {
  interface FastifyRequest {
    readonly auth?: AuthenticatedSubject;
  }
}

const logger = createLogger({ defaultAdapter: 'auth' });

const extractBearerToken = (authorization: string | undefined): string | undefined => {
  if (!authorization) return undefined;
  const parts = authorization.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') return undefined;
  return parts[1];
};

const extractApiKey = (request: FastifyRequest): string | undefined => {
  const headerValue = request.headers['x-api-key'];
  if (typeof headerValue === 'string') return headerValue;
  return undefined;
};

const isPublicPath = (pathname: string, publicPaths: readonly string[]): boolean =>
  publicPaths.some((p) => (p.endsWith('/') ? pathname.startsWith(p) : pathname === p));

/**
 * Register authentication middleware on a Fastify instance.
 *
 * Unlike a plugin, this directly adds the preHandler hook to the app
 * without encapsulation, so it applies to all routes.
 *
 * @example
 * ```ts
 * const app = Fastify();
 * addAuth(app, {
 *   provider: createApiKeyProvider({ keys: [...] }),
 *   publicPaths: ['/health', '/version'],
 * });
 * ```
 */
export const addAuth = (app: FastifyInstance, config: AuthConfig): void => {
  const publicPaths = config.publicPaths ?? ['/health', '/version'];

  app.addHook('preHandler', async (request: FastifyRequest, reply: FastifyReply) => {
    const pathname = request.url.split('?')[0] ?? request.url;

    if (isPublicPath(pathname, publicPaths)) {
      return;
    }

    const bearerToken = extractBearerToken(request.headers.authorization as string | undefined);
    const apiKey = extractApiKey(request);

    const credential = bearerToken ?? apiKey;

    if (!credential) {
      logger.warn('authentication missing', {
        method: request.method,
        url: request.url,
      });
      const shaped = adapterError('AUTH_MISSING', 'Authentication credentials required');
      await reply.code(ADAPTER_ERROR_HTTP_STATUS['AUTH_MISSING']).send({
        ok: false,
        error: { code: shaped.code, message: shaped.message },
      });
      return;
    }

    const result = await config.provider.authenticate(credential);

    if (!result.ok) {
      logger.warn('authentication failed', {
        method: request.method,
        url: request.url,
        reason: result.reason,
      });
      const shaped = adapterError('AUTH_FORBIDDEN', result.reason);
      await reply.code(ADAPTER_ERROR_HTTP_STATUS['AUTH_FORBIDDEN']).send({
        ok: false,
        error: { code: shaped.code, message: shaped.message },
      });
      return;
    }

    // Attach authenticated subject to request.
    (request as { auth: AuthenticatedSubject }).auth = result.subject;

    logger.debug('authentication succeeded', {
      method: request.method,
      url: request.url,
      subjectId: result.subject.id,
      role: result.subject.role,
    });
  });
};

/**
 * Route-level authorization decorator. Returns a preHandler that checks
 * the authenticated subject's role against the required action.
 *
 * @example
 * ```ts
 * app.post('/v1/start', { preHandler: [requireAction('start')] }, async () => { ... });
 * ```
 */
export const requireAction = (action: HttpAction) => {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const subject = request.auth;

    if (!subject) {
      const shaped = adapterError('AUTH_MISSING', 'Authentication required');
      await reply.code(ADAPTER_ERROR_HTTP_STATUS['AUTH_MISSING']).send({
        ok: false,
        error: { code: shaped.code, message: shaped.message },
      });
      return;
    }

    if (!canHttp(subject.role, action)) {
      logger.warn('authorization denied', {
        method: request.method,
        url: request.url,
        subjectId: subject.id,
        role: subject.role,
        action,
      });
      const shaped = adapterError(
        'AUTH_FORBIDDEN',
        `Action "${action}" denied for role "${subject.role}".`,
      );
      await reply.code(ADAPTER_ERROR_HTTP_STATUS['AUTH_FORBIDDEN']).send({
        ok: false,
        error: { code: shaped.code, message: shaped.message },
      });
    }
  };
};
