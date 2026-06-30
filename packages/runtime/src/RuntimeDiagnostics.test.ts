import { describe, it, expect } from 'vitest';
import { createDiagnostics } from './RuntimeDiagnostics.js';

describe('RuntimeDiagnostics', () => {
  it('returns default report', () => {
    const diag = createDiagnostics({});
    const report = diag.report();
    expect(report.version).toBe('1.0.0');
    expect(report.uptimeMs).toBeGreaterThanOrEqual(0);
    expect(report.buildInfo.nodeVersion).toBe(process.version);
    expect(report.buildInfo.platform).toBe(process.platform);
    expect(report.memoryUsage.heapUsedMb).toBeGreaterThan(0);
  });

  it('tracks loaded plugins', () => {
    const diag = createDiagnostics({ loadedPlugins: ['plugin-a', 'plugin-b'] });
    const report = diag.report();
    expect(report.loadedPlugins).toEqual(['plugin-a', 'plugin-b']);
  });

  it('tracks loaded adapters', () => {
    const diag = createDiagnostics({ loadedAdapters: ['webhook', 'telegram'] });
    const report = diag.report();
    expect(report.loadedAdapters).toEqual(['webhook', 'telegram']);
  });

  it('updates plugins dynamically', () => {
    const diag = createDiagnostics({});
    diag.setPlugins(['new-plugin']);
    const report = diag.report();
    expect(report.loadedPlugins).toEqual(['new-plugin']);
  });

  it('updates adapters dynamically', () => {
    const diag = createDiagnostics({});
    diag.setAdapters(['new-adapter']);
    const report = diag.report();
    expect(report.loadedAdapters).toEqual(['new-adapter']);
  });

  it('tracks event bus status', () => {
    const diag = createDiagnostics({
      eventBusStatus: { subscribedTopics: 5, status: 'active' },
    });
    const report = diag.report();
    expect(report.eventBusStatus.subscribedTopics).toBe(5);
    expect(report.eventBusStatus.status).toBe('active');
  });

  it('tracks configuration summary', () => {
    const diag = createDiagnostics({
      configSummary: { port: 4000, logLevel: 'info' },
    });
    const report = diag.report();
    expect(report.configurationSummary).toEqual({ port: 4000, logLevel: 'info' });
  });

  it('tracks startup status', () => {
    const diag = createDiagnostics({
      startupStatus: {
        phase: 'running',
        startedSteps: ['db', 'cache'],
        failedStep: undefined,
        durationMs: 150,
      },
    });
    const report = diag.report();
    expect(report.startup.phase).toBe('running');
    expect(report.startup.startedSteps).toEqual(['db', 'cache']);
    expect(report.startup.durationMs).toBe(150);
  });

  it('tracks shutdown status', () => {
    const diag = createDiagnostics({
      shutdownStatus: {
        phase: 'stopped',
        startedAt: 1000,
        completedAt: 2000,
        durationMs: 1000,
        failedStep: undefined,
      },
    });
    const report = diag.report();
    expect(report.shutdown.phase).toBe('stopped');
    expect(report.shutdown.durationMs).toBe(1000);
  });

  it('updates all fields dynamically', () => {
    const diag = createDiagnostics({});
    diag.setPlugins(['p1']);
    diag.setAdapters(['a1']);
    diag.setConfigSummary({ key: 'value' });
    diag.setEventBusStatus({ subscribedTopics: 3, status: 'active' });
    diag.setStartupStatus({
      phase: 'running',
      startedSteps: ['s1'],
      failedStep: undefined,
      durationMs: 100,
    });
    diag.setShutdownStatus({
      phase: 'idle',
      startedAt: undefined,
      completedAt: undefined,
      durationMs: undefined,
      failedStep: undefined,
    });

    const report = diag.report();
    expect(report.loadedPlugins).toEqual(['p1']);
    expect(report.loadedAdapters).toEqual(['a1']);
    expect(report.configurationSummary).toEqual({ key: 'value' });
    expect(report.eventBusStatus.subscribedTopics).toBe(3);
    expect(report.startup.phase).toBe('running');
    expect(report.shutdown.phase).toBe('idle');
  });
});
