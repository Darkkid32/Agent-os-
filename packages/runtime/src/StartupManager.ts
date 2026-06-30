/**
 * StartupManager — manages ordered startup with dependency resolution and rollback.
 *
 * Steps are started in dependency order. If a step fails, all started steps
 * are rolled back in reverse order. Emits startup duration via the logger.
 */

import type { Logger } from '@agent-os/observability';
import type { StartupManagerConfig, StartupPhase, StartupStatus, StartupStep } from './types.js';

export interface StartupManager {
  readonly addStep: (step: StartupStep) => void;
  readonly removeStep: (name: string) => void;
  readonly start: () => Promise<StartupStatus>;
  readonly status: () => StartupStatus;
}

function topologicalSort(steps: readonly StartupStep[]): StartupStep[] {
  const byName = new Map(steps.map((s) => [s.name, s]));
  const visited = new Set<string>();
  const result: StartupStep[] = [];

  const visit = (name: string): void => {
    if (visited.has(name)) return;
    visited.add(name);
    const step = byName.get(name);
    if (step == null) return;
    for (const dep of step.dependencies ?? []) {
      visit(dep);
    }
    result.push(step);
  };

  for (const step of steps) {
    visit(step.name);
  }
  return result;
}

export const createStartupManager = (
  config: StartupManagerConfig,
  logger?: Logger,
): StartupManager => {
  const timeoutMs = config.timeoutMs ?? 60_000;
  const steps: StartupStep[] = [...(config.steps ?? [])];
  let phase: StartupPhase = 'idle';
  let startedSteps: string[] = [];
  let failedStep: string | undefined;
  let durationMs: number | undefined;

  const updateStatus = (
    newPhase: StartupPhase,
    started: string[],
    failed: string | undefined,
    dur: number | undefined,
  ): StartupStatus => {
    phase = newPhase;
    startedSteps = started;
    failedStep = failed;
    durationMs = dur;
    return { phase, startedSteps, failedStep, durationMs };
  };

  return {
    addStep(step: StartupStep): void {
      steps.push(step);
    },

    removeStep(name: string): void {
      const idx = steps.findIndex((s) => s.name === name);
      if (idx >= 0) steps.splice(idx, 1);
    },

    async start(): Promise<StartupStatus> {
      const start = Date.now();
      updateStatus('starting', [], undefined, undefined);
      const sorted = topologicalSort(steps);
      const started: string[] = [];

      logger?.info('startup initiated', { stepCount: sorted.length });

      const timeoutPromise = new Promise<never>((_, reject) => {
        const timer = setTimeout(() => {
          reject(new Error(`Startup timed out after ${timeoutMs}ms`));
        }, timeoutMs);
        timer.unref();
      });

      const runSteps = async (): Promise<void> => {
        for (const step of sorted) {
          // Check dependencies are met
          const deps = step.dependencies ?? [];
          const unmet = deps.filter((d) => !started.includes(d));
          if (unmet.length > 0) {
            logger?.error('startup step dependency unmet', {
              step: step.name,
              unmetDependencies: unmet,
            });
            updateStatus('failed', started, step.name, Date.now() - start);
            return;
          }

          try {
            logger?.debug('startup step', { step: step.name });
            await step.startup();
            started.push(step.name);
          } catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            logger?.error('startup step failed', { step: step.name, error: msg });
            updateStatus('failed', started, step.name, Date.now() - start);

            // Rollback started steps in reverse order
            logger?.info('startup rollback initiated', { rollbackSteps: started.length });
            const rollbackSteps = [...started].reverse();
            for (const rollbackStep of rollbackSteps) {
              const stepDef = sorted.find((s) => s.name === rollbackStep);
              if (stepDef?.rollback != null) {
                try {
                  await stepDef.rollback();
                } catch (rollbackError) {
                  const rmsg =
                    rollbackError instanceof Error ? rollbackError.message : String(rollbackError);
                  logger?.error('rollback step failed', { step: rollbackStep, error: rmsg });
                }
              }
            }
            updateStatus('rolled-back', started, step.name, Date.now() - start);
            return;
          }
        }
        updateStatus('running', started, undefined, Date.now() - start);
      };

      try {
        await Promise.race([runSteps(), timeoutPromise]);
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        logger?.error('startup failed', { error: msg });
        updateStatus('failed', started, failedStep ?? 'timeout', Date.now() - start);
      }

      const finalStatus = {
        phase,
        startedSteps: started,
        failedStep,
        durationMs: Date.now() - start,
      };
      logger?.info('startup complete', {
        phase: finalStatus.phase,
        durationMs: finalStatus.durationMs,
        startedSteps: finalStatus.startedSteps.length,
        failedStep: finalStatus.failedStep,
      });
      return finalStatus;
    },

    status(): StartupStatus {
      return { phase, startedSteps, failedStep, durationMs };
    },
  };
};
