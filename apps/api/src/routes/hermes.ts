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
import type { MetricEntry, MetricRegistry } from '@agent-os/observability';

export interface HermesRoutesOpts {
  readonly hermes: HermesPort;
  readonly metricRegistry?: MetricRegistry;
}

interface HermesModuleDTO {
  readonly name: string;
  readonly status: string;
  readonly detail?: string;
}

interface MetricsDTO {
  readonly count: number;
  readonly items: readonly MetricEntry[];
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

const moduleToJson = (module: {
  readonly name: string;
  readonly status: string;
  readonly detail?: string;
}): HermesModuleDTO => ({
  name: module.name,
  status: module.status,
  ...(module.detail ? { detail: module.detail } : {}),
});

const metricsToJson = (metrics: readonly MetricEntry[]): MetricsDTO => ({
  count: metrics.length,
  items: metrics.map((metric) => ({
    name: metric.name,
    help: metric.help,
    type: metric.type,
    labels: { ...metric.labels },
    value: metric.value,
  })),
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
  const { hermes, metricRegistry } = opts;

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

  app.get('/modules', async () => {
    const status = hermes.status();
    const health = await hermes.health();
    return {
      ok: true,
      value: {
        count: status.modules,
        items: health.modules.map(moduleToJson),
      },
    };
  });

  app.get('/plugins', async () => {
    const health = await hermes.health();
    const modules = health.modules.map(moduleToJson);
    return {
      ok: true,
      value: { count: modules.length, items: modules },
    };
  });

  app.get('/metrics', async () => ({
    ok: true,
    value: metricsToJson(metricRegistry?.getMetrics() ?? []),
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
