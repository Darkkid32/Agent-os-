/**
 * RuntimeDiagnostics — collects and exposes runtime diagnostics.
 *
 * Aggregates version, uptime, build info, loaded plugins/adapters,
 * configuration summary, memory usage, and event bus status.
 */

import type { Logger } from '@agent-os/observability';
import type {
  BuildInfo,
  DiagnosticsReport,
  EventBusStatusReport,
  MemoryUsageReport,
  ShutdownStatus,
  StartupStatus,
} from './types.js';

export interface DiagnosticsConfig {
  readonly version?: string;
  readonly loadedPlugins?: readonly string[];
  readonly loadedAdapters?: readonly string[];
  readonly configSummary?: Readonly<Record<string, unknown>>;
  readonly eventBusStatus?: EventBusStatusReport;
  readonly startupStatus?: StartupStatus;
  readonly shutdownStatus?: ShutdownStatus;
}

export interface RuntimeDiagnostics {
  readonly report: () => DiagnosticsReport;
  readonly setPlugins: (plugins: readonly string[]) => void;
  readonly setAdapters: (adapters: readonly string[]) => void;
  readonly setConfigSummary: (summary: Readonly<Record<string, unknown>>) => void;
  readonly setEventBusStatus: (status: EventBusStatusReport) => void;
  readonly setStartupStatus: (status: StartupStatus) => void;
  readonly setShutdownStatus: (status: ShutdownStatus) => void;
}

function getMemoryUsage(): MemoryUsageReport {
  const mem = process.memoryUsage();
  return {
    heapUsedMb: Math.round((mem.heapUsed / 1024 / 1024) * 100) / 100,
    heapTotalMb: Math.round((mem.heapTotal / 1024 / 1024) * 100) / 100,
    rssMb: Math.round((mem.rss / 1024 / 1024) * 100) / 100,
    externalMb: Math.round((mem.external / 1024 / 1024) * 100) / 100,
  };
}

function getBuildInfo(): BuildInfo {
  return {
    version: process.version,
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
  };
}

export const createDiagnostics = (
  config: DiagnosticsConfig,
  logger?: Logger,
): RuntimeDiagnostics => {
  let plugins = [...(config.loadedPlugins ?? [])];
  let adapters = [...(config.loadedAdapters ?? [])];
  let configSummary: Readonly<Record<string, unknown>> = config.configSummary ?? {};
  let eventBusStatus: EventBusStatusReport = config.eventBusStatus ?? {
    subscribedTopics: 0,
    status: 'inactive',
  };
  let startupStatus: StartupStatus = config.startupStatus ?? {
    phase: 'idle',
    startedSteps: [],
    failedStep: undefined,
    durationMs: undefined,
  };
  let shutdownStatus: ShutdownStatus = config.shutdownStatus ?? {
    phase: 'idle',
    startedAt: undefined,
    completedAt: undefined,
    durationMs: undefined,
    failedStep: undefined,
  };

  const startedAt = Date.now();

  logger?.debug('diagnostics initialized');

  return {
    report(): DiagnosticsReport {
      return {
        version: '1.0.0',
        uptimeMs: Date.now() - startedAt,
        buildInfo: getBuildInfo(),
        loadedPlugins: plugins,
        loadedAdapters: adapters,
        configurationSummary: configSummary,
        memoryUsage: getMemoryUsage(),
        eventBusStatus,
        startup: startupStatus,
        shutdown: shutdownStatus,
      };
    },

    setPlugins(newPlugins: readonly string[]): void {
      plugins = [...newPlugins];
    },

    setAdapters(newAdapters: readonly string[]): void {
      adapters = [...newAdapters];
    },

    setConfigSummary(summary: Readonly<Record<string, unknown>>): void {
      configSummary = summary;
    },

    setEventBusStatus(status: EventBusStatusReport): void {
      eventBusStatus = status;
    },

    setStartupStatus(status: StartupStatus): void {
      startupStatus = status;
    },

    setShutdownStatus(status: ShutdownStatus): void {
      shutdownStatus = status;
    },
  };
};
