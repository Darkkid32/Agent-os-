/**
 * ShutdownManager — orchestrates ordered, idempotent graceful shutdown.
 *
 * Runs shutdown steps in reverse order with a configurable timeout.
 * Prevents duplicate shutdown execution. Handles SIGINT/SIGTERM.
 * Emits shutdown duration via the logger.
 */

import type { Logger } from '@agent-os/observability';
import type {
  ShutdownManagerConfig,
  ShutdownPhase,
  ShutdownStatus,
  ShutdownStep,
} from './types.js';

export interface ShutdownManager {
  readonly addStep: (step: ShutdownStep) => void;
  readonly removeStep: (name: string) => void;
  readonly shutdown: (reason?: string) => Promise<ShutdownStatus>;
  readonly installSignalHandlers: () => void;
  readonly status: () => ShutdownStatus;
}

export const createShutdownManager = (
  config: ShutdownManagerConfig,
  logger?: Logger,
): ShutdownManager => {
  const timeoutMs = config.timeoutMs ?? 30_000;
  const steps: ShutdownStep[] = [...(config.steps ?? [])];
  let phase: ShutdownPhase = 'idle';
  let startedAt: number | undefined;
  let completedAt: number | undefined;
  let failedStep: string | undefined;
  let shuttingDown = false;

  const updateStatus = (
    newPhase: ShutdownPhase,
    start: number | undefined,
    end: number | undefined,
    failed: string | undefined,
  ): ShutdownStatus => {
    phase = newPhase;
    startedAt = start;
    completedAt = end;
    failedStep = failed;
    return {
      phase,
      startedAt,
      completedAt,
      durationMs: end != null && start != null ? end - start : undefined,
      failedStep,
    };
  };

  return {
    addStep(step: ShutdownStep): void {
      steps.push(step);
    },

    removeStep(name: string): void {
      const idx = steps.findIndex((s) => s.name === name);
      if (idx >= 0) steps.splice(idx, 1);
    },

    async shutdown(reason = 'manual'): Promise<ShutdownStatus> {
      if (shuttingDown) {
        return {
          phase,
          startedAt,
          completedAt,
          durationMs:
            completedAt != null && startedAt != null ? completedAt - startedAt : undefined,
          failedStep,
        };
      }
      shuttingDown = true;

      const start = Date.now();
      updateStatus('shutting-down', start, undefined, undefined);
      logger?.info('shutdown initiated', { reason, stepCount: steps.length });

      const timeoutPromise = new Promise<never>((_, reject) => {
        const timer = setTimeout(() => {
          reject(new Error(`Shutdown timed out after ${timeoutMs}ms`));
        }, timeoutMs);
        timer.unref();
      });

      const runSteps = async (): Promise<void> => {
        const reversed = [...steps].reverse();
        for (const step of reversed) {
          try {
            logger?.debug('shutdown step', { step: step.name });
            await step.shutdown();
          } catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            logger?.error('shutdown step failed', { step: step.name, error: msg });
            updateStatus('timed-out', start, Date.now(), step.name);
            return;
          }
        }
        updateStatus('stopped', start, Date.now(), undefined);
      };

      try {
        await Promise.race([runSteps(), timeoutPromise]);
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        logger?.error('shutdown failed', { error: msg });
        updateStatus('timed-out', start, Date.now(), failedStep ?? 'unknown');
      }

      const finalStatus = {
        phase,
        startedAt,
        completedAt,
        durationMs: completedAt != null && startedAt != null ? completedAt - startedAt : undefined,
        failedStep,
      };
      logger?.info('shutdown complete', {
        phase: finalStatus.phase,
        durationMs: finalStatus.durationMs ?? 0,
        failedStep: finalStatus.failedStep,
      });
      return finalStatus;
    },

    installSignalHandlers(): void {
      const handler = (): void => {
        void this.shutdown('signal');
      };
      process.on('SIGINT', handler);
      process.on('SIGTERM', handler);
    },

    status(): ShutdownStatus {
      return {
        phase,
        startedAt,
        completedAt,
        durationMs: completedAt != null && startedAt != null ? completedAt - startedAt : undefined,
        failedStep,
      };
    },
  };
};
