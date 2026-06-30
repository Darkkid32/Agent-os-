import { ok, type Result } from '@agent-os/core';
import type { AgentPlugin, PluginContext } from '@agent-os/plugins';

export interface MetricsLoggerPluginOptions {
  readonly intervalMs?: number;
  readonly prefix?: string;
}

export const createMetricsLoggerPlugin = (
  options: MetricsLoggerPluginOptions = {},
): AgentPlugin => {
  const { intervalMs = 10000, prefix = 'agent_os' } = options;
  let context: PluginContext | undefined;
  let timer: ReturnType<typeof setInterval> | undefined;
  let metricCount = 0;

  const collectMetrics = (): Record<string, number> => {
    metricCount++;
    return {
      [`${prefix}_collect_count`]: metricCount,
      [`${prefix}_uptime_seconds`]: Math.floor(process.uptime()),
      [`${prefix}_memory_usage_mb`]: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
    };
  };

  return {
    manifest: {
      id: 'metrics-logger',
      name: 'Metrics Logger Plugin',
      version: '1.0.0',
      author: 'Agent OS',
      description: 'Collects and logs system metrics at regular intervals',
      capabilities: ['metrics', 'monitoring'],
      dependencies: [],
      minimumAgentOSVersion: '0.1.0',
      configSchema: {
        intervalMs: {
          type: 'number',
          default: 10000,
          description: 'Collection interval in milliseconds',
        },
        prefix: {
          type: 'string',
          default: 'agent_os',
          description: 'Metric name prefix',
        },
      },
    },

    initialize: async (ctx: PluginContext): Promise<Result<void>> => {
      context = ctx;
      ctx.logger.info('Metrics Logger plugin initialized', {
        intervalMs,
        prefix,
      });
      return ok(undefined);
    },

    start: async (): Promise<Result<void>> => {
      if (context == null) {
        return { ok: false, error: new Error('Plugin not initialized') };
      }

      timer = setInterval(() => {
        const metrics = collectMetrics();
        context?.logger.info('Metrics collected', metrics);
      }, intervalMs);

      context.logger.info('Metrics Logger started', { intervalMs });
      return ok(undefined);
    },

    stop: async (): Promise<Result<void>> => {
      if (timer != null) {
        clearInterval(timer);
        timer = undefined;
      }
      context?.logger.info('Metrics Logger stopped');
      return ok(undefined);
    },

    dispose: async (): Promise<Result<void>> => {
      if (timer != null) {
        clearInterval(timer);
        timer = undefined;
      }
      context = undefined;
      return ok(undefined);
    },
  };
};
