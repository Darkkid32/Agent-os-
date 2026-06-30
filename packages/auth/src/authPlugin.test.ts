import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import { addAuth, requireAction } from './authPlugin.js';
import { createApiKeyProvider } from './ApiKeyProvider.js';

const provider = createApiKeyProvider({
  keys: [
    { key: 'admin-key', role: 'admin', id: 'admin-1' },
    { key: 'viewer-key', role: 'viewer', id: 'viewer-1' },
  ],
});

const buildTestApp = async (): Promise<FastifyInstance> => {
  const app = Fastify({ logger: false });

  addAuth(app, {
    provider,
    publicPaths: ['/health'],
  });

  // Public route (no auth required)
  app.get('/health', async () => ({ status: 'ok' }));

  // Protected route (auth required, any role)
  app.get('/v1/status', async (request) => ({
    ok: true,
    value: { role: request.auth?.role },
  }));

  // Admin-only route
  app.post('/v1/start', { preHandler: [requireAction('start')] }, async () => ({
    ok: true,
    value: { started: true },
  }));

  // Viewer-allowed route
  app.get('/v1/config', { preHandler: [requireAction('config')] }, async () => ({
    ok: true,
    value: { config: true },
  }));

  return app;
};

describe('authPlugin', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('public paths', () => {
    it('allows unauthenticated access to /health', async () => {
      const res = await app.inject({ method: 'GET', url: '/health' });
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.payload)).toEqual({ status: 'ok' });
    });
  });

  describe('API key authentication', () => {
    it('authenticates via X-API-Key header', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/v1/status',
        headers: { 'x-api-key': 'admin-key' },
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload) as { ok: boolean; value: { role: string } };
      expect(body.ok).toBe(true);
      expect(body.value.role).toBe('admin');
    });

    it('rejects invalid API key', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/v1/status',
        headers: { 'x-api-key': 'wrong-key' },
      });
      expect(res.statusCode).toBe(403);
      const body = JSON.parse(res.payload) as { ok: boolean; error: { code: string } };
      expect(body.ok).toBe(false);
      expect(body.error.code).toBe('AUTH_FORBIDDEN');
    });

    it('returns 401 when no credentials provided', async () => {
      const res = await app.inject({ method: 'GET', url: '/v1/status' });
      expect(res.statusCode).toBe(401);
      const body = JSON.parse(res.payload) as { ok: boolean; error: { code: string } };
      expect(body.ok).toBe(false);
      expect(body.error.code).toBe('AUTH_MISSING');
    });
  });

  describe('Bearer token authentication', () => {
    it('authenticates via Authorization header', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/v1/status',
        headers: { authorization: 'Bearer admin-key' },
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload) as { ok: boolean; value: { role: string } };
      expect(body.value.role).toBe('admin');
    });

    it('rejects malformed Authorization header', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/v1/status',
        headers: { authorization: 'InvalidFormat' },
      });
      expect(res.statusCode).toBe(401);
    });
  });

  describe('route-level authorization', () => {
    it('allows admin to access start route', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/v1/start',
        headers: { 'x-api-key': 'admin-key' },
      });
      expect(res.statusCode).toBe(200);
    });

    it('denies viewer from accessing start route', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/v1/start',
        headers: { 'x-api-key': 'viewer-key' },
      });
      expect(res.statusCode).toBe(403);
      const body = JSON.parse(res.payload) as {
        ok: boolean;
        error: { code: string; message: string };
      };
      expect(body.error.code).toBe('AUTH_FORBIDDEN');
      expect(body.error.message).toContain('start');
    });

    it('allows viewer to access config route', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/v1/config',
        headers: { 'x-api-key': 'viewer-key' },
      });
      expect(res.statusCode).toBe(200);
    });
  });
});
