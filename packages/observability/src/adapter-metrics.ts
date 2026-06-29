/**
 * Adapter metrics factory.
 *
 * Creates the standard metric set for a Hermes kernel or adapter.
 * Every adapter and Hermes itself use the same metric names so
 * dashboards and exporters get consistent instrumentation.
 *
 * Per platform.md §13:
 *   - Counters track monotonic totals (requests, commands, errors).
 *   - Histograms track duration distributions.
 *   - Gauges track current values (active requests, loaded modules).
 */
import type { MetricRegistry } from './metrics.js';
import type { Counter, Histogram, Gauge } from './types.js';

/**
 * Standard adapter metrics bundle. Every adapter receives this shape.
 */
export interface AdapterMetrics {
  readonly requestsTotal: Counter;
  readonly commandsTotal: Counter;
  readonly errorsTotal: Counter;
  readonly requestDurationMs: Histogram;
  readonly commandDurationMs: Histogram;
  readonly activeRequests: Gauge;
  readonly activeCommands: Gauge;
}

/**
 * Create the standard adapter metric set for a given adapter name.
 *
 * @param registry — the shared MetricRegistry instance
 * @param adapter  — adapter name label (e.g. "cli", "discord")
 */
export const createAdapterMetrics = (
  registry: MetricRegistry,
  adapter: string,
): AdapterMetrics => ({
  requestsTotal: registry.counter({
    name: 'requests_total',
    help: 'Total inbound requests',
    labels: { adapter },
  }),
  commandsTotal: registry.counter({
    name: 'commands_total',
    help: 'Total commands dispatched',
    labels: { adapter },
  }),
  errorsTotal: registry.counter({
    name: 'errors_total',
    help: 'Total errors',
    labels: { adapter },
  }),
  requestDurationMs: registry.histogram({
    name: 'request_duration_ms',
    help: 'Request duration in milliseconds',
    labels: { adapter },
  }),
  commandDurationMs: registry.histogram({
    name: 'command_duration_ms',
    help: 'Command duration in milliseconds',
    labels: { adapter },
  }),
  activeRequests: registry.gauge({
    name: 'active_requests',
    help: 'Number of requests currently in flight',
    labels: { adapter },
  }),
  activeCommands: registry.gauge({
    name: 'active_commands',
    help: 'Number of commands currently in flight',
    labels: { adapter },
  }),
});

/**
 * Hermes-specific metrics. Extends the adapter set with lifecycle
 * and module gauges.
 */
export interface HermesMetrics extends AdapterMetrics {
  readonly lifecycleTransitionsTotal: Counter;
  readonly hermesOperationDurationMs: Histogram;
  readonly loadedModules: Gauge;
}

/**
 * Create the Hermes metric set. Includes the full adapter bundle
 * plus lifecycle-specific counters/histograms and the module gauge.
 *
 * @param registry — the shared MetricRegistry instance
 */
export const createHermesMetrics = (registry: MetricRegistry): HermesMetrics => ({
  ...createAdapterMetrics(registry, 'hermes'),
  lifecycleTransitionsTotal: registry.counter({
    name: 'lifecycle_transitions_total',
    help: 'Total lifecycle phase transitions',
    labels: { adapter: 'hermes' },
  }),
  hermesOperationDurationMs: registry.histogram({
    name: 'hermes_operation_duration_ms',
    help: 'Hermes operation duration in milliseconds',
    labels: { adapter: 'hermes' },
  }),
  loadedModules: registry.gauge({
    name: 'loaded_modules',
    help: 'Number of loaded modules',
    labels: { adapter: 'hermes' },
  }),
});
