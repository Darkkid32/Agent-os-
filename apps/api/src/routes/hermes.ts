/**
 * /v1/* REST routes — Hermes kernel surface.
 *
 * Per docs/architecture/platform.md §6.2, the REST adapter exposes the
 * seven canonical verbs. Per §6.5 and §6.6, every response uses a
 * uniform envelope and every error code maps to an HTTP status.
 *
 * Phase 4.3: this file exists as the integration target for the
 * apps/api ↔ Hermes test. The current `buildApp(config)` does NOT
 * register these routes unless `config.hermes` is supplied —
 * production behaviour is unchanged.
 *
 * Phase 4.4: error envelopes are now produced via
 * `mapKernelErrorToAdapterError` and `ADAPTER_ERROR_HTTP_STATUS` from
 * `@agent-os/core/adapter-errors`. Stopping from a non-RUNNING phase
 * is reported as `PHASE_CONFLICT` (HTTP 409) per the spec, not
 * `HERMES_ERROR` (HTTP 500).
 *
 * Fastify plugin pattern: routes are registered under prefix `/v1`
 * with the Hermes instance supplied via plugin options.
 */
import type { FastifyInstance, FastifyPluginAsync, FastifyReply } from 'fastify';
import {
  ADAPTER_ERROR_HTTP_STATUS,
  type AdapterErrorShape,
  mapKernelErrorToAdapterError,
} from '@agent-os/core/adapter-errors';
import { type HermesConfig, type HermesPort, redactHermesConfig } from '@agent-os/hermes';

export interface HermesRoutesOpts {
  readonly hermes: HermesPort;
}

const configToJson = (cfg: HermesConfig): Record<string, unknown> => ({
  nodeEnv: cfg.nodeEnv,
  logLevel: cfg.logLevel,
  openrouterApiKey: cfg.openrouterApiKey,
  databaseUrl: cfg.databaseUrl,
  redisUrl: cfg.redisUrl,
  otelEnabled: cfg.otelEnabled,
  otelExporterEndpoint: cfg.otelExporterEndpoint ?? null,
  hermesModulesDir: cfg.hermesModulesDir,
  hermesShutdownTimeoutMs: cfg.hermesShutdownTimeoutMs,
});

/**
 * Build the platform-spec error envelope. The HTTP status code is
 * derived from `ADAPTER_ERROR_HTTP_STATUS` so the spec mapping is the
 * single source of truth. The body wraps the canonical
 * `AdapterErrorShape` in the §6.5 error half.
 */
const errorReply = (reply: FastifyReply, err: unknown): FastifyReply => {
  const mapped: AdapterErrorShape = mapKernelErrorToAdapterError(err);
  return reply.code(ADAPTER_ERROR_HTTP_STATUS[mapped.code]).send({
    ok: false,
    error: { code: mapped.code, message: mapped.message, detail: mapped.detail },
  });
};

export const hermesRoutes: FastifyPluginAsync<HermesRoutesOpts> = async (
  app: FastifyInstance,
  opts: HermesRoutesOpts,
): Promise<void> => {
  const { hermes } = opts;

  app.get('/status', async () => ({
    ok: true,
    value: hermes.status(),
  }));

  app.get('/health', async () => ({
    ok: true,
    value: await hermes.health(),
  }));

  app.post('/start', async (_req, reply) => {
    const r = await hermes.start();
    if (r.ok) {
      return { ok: true, value: { started: true, phase: hermes.status().phase } };
    }
    return errorReply(reply, r.error);
  });

  app.post('/stop', async (_req, reply) => {
    const r = await hermes.stop();
    if (r.ok) {
      return { ok: true, value: { stopped: true, phase: hermes.status().phase } };
    }
    return errorReply(reply, r.error);
  });

  app.get('/modules', async () => ({
    ok: true,
    value: { count: hermes.status().modules },
  }));

  app.get('/config', async () => {
    const redacted = redactHermesConfig(hermes.config);
    return { ok: true, value: configToJson(redacted) };
  });

  app.get('/version', async () => {
    const { PACKAGE_NAME, PACKAGE_VERSION } = await import('@agent-os/hermes');
    return { ok: true, value: { name: PACKAGE_NAME, version: PACKAGE_VERSION } };
  });
};
