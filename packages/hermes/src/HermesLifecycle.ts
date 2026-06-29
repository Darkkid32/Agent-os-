/**
 * Hermes Lifecycle Manager.
 *
 * Per docs/architecture/hermes.md §2.4 and §3, this is the SOLE writer of the
 * lifecycle phase value. All other components read through `currentPhase()`
 * or react to the transition callback. No async, no I/O — a pure state
 * machine that can be exercised in isolation.
 *
 * Per §2.4 (event emission) and §2.4 (Health Monitor capture on FAILED):
 * those integrations happen through the optional `onTransition` callback,
 * registered later by the Event Dispatcher and Health Monitor when those
 * modules come online. This keeps the Lifecycle Manager free of cross-
 * module dependencies in line with §4.3 (dependency inversion).
 *
 * Concurrency (per §3.3):
 *   - The Lifecycle Manager is single-threaded within the Node.js event loop.
 *   - `transition()` is synchronous, so "concurrent" means re-entrant from
 *     a transition handler. A re-entrant call from inside a handler is
 *     rejected with a clear error to protect the single-writer invariant.
 *   - Calls during an in-flight transition (e.g., `stop()` racing against
 *     health-triggered failure) are queued and flushed by the Bootstrap
 *     orchestrator after the current transition completes.
 */

export type HermesLifecyclePhase =
  'INITIALIZING' | 'STARTING' | 'RUNNING' | 'STOPPING' | 'STOPPED' | 'FAILED';

const PHASES: readonly HermesLifecyclePhase[] = [
  'INITIALIZING',
  'STARTING',
  'RUNNING',
  'STOPPING',
  'STOPPED',
  'FAILED',
] as const;

const TERMINAL_PHASES: ReadonlySet<HermesLifecyclePhase> = new Set(['STOPPED', 'FAILED']);

/**
 * Legal successors for each phase. Encoded exactly per §3.2 of the
 * architecture document (eight legal edges).
 */
const LEGAL_TRANSITIONS: ReadonlyMap<
  HermesLifecyclePhase,
  ReadonlySet<HermesLifecyclePhase>
> = new Map([
  ['INITIALIZING', new Set<HermesLifecyclePhase>(['STARTING', 'FAILED'])],
  ['STARTING', new Set<HermesLifecyclePhase>(['RUNNING', 'FAILED'])],
  ['RUNNING', new Set<HermesLifecyclePhase>(['STOPPING', 'FAILED'])],
  ['STOPPING', new Set<HermesLifecyclePhase>(['STOPPED', 'FAILED'])],
  ['STOPPED', new Set<HermesLifecyclePhase>()],
  ['FAILED', new Set<HermesLifecyclePhase>()],
]);

export interface HermesLifecycle {
  readonly currentPhase: () => HermesLifecyclePhase;
  readonly transition: (to: HermesLifecyclePhase) => void;
  readonly isTerminal: () => boolean;
  readonly onTransition: (handler: TransitionHandler) => () => void;
}

export type TransitionHandler = (from: HermesLifecyclePhase, to: HermesLifecyclePhase) => void;

export interface HermesLifecycleOptions {
  readonly initialPhase?: HermesLifecyclePhase;
  readonly onTransition?: TransitionHandler;
}

export const isHermesLifecyclePhase = (value: string): value is HermesLifecyclePhase =>
  (PHASES as readonly string[]).includes(value);

export const createHermesLifecycle = (options: HermesLifecycleOptions = {}): HermesLifecycle => {
  let phase: HermesLifecyclePhase = options.initialPhase ?? 'INITIALIZING';
  let transitioning = false;
  const handlers: TransitionHandler[] = [];
  const pendingQueue: HermesLifecyclePhase[] = [];

  if (options.onTransition) handlers.push(options.onTransition);

  const fire = (from: HermesLifecyclePhase, to: HermesLifecyclePhase): void => {
    for (const handler of handlers) {
      try {
        handler(from, to);
      } catch {
        // Per §6.3 of the architecture: events are best-effort. A handler
        // throwing must not roll back the committed transition. The
        // Lifecycle Manager remains the single writer of the phase.
      }
    }
  };

  const applyTransition = (to: HermesLifecyclePhase): void => {
    if (!isHermesLifecyclePhase(to)) {
      throw new Error(`HermesLifecycle: unknown phase "${to}".`);
    }
    if (TERMINAL_PHASES.has(phase)) {
      throw new Error(
        `HermesLifecycle: terminal phase ${phase}; no further transitions permitted.`,
      );
    }
    const allowed = LEGAL_TRANSITIONS.get(phase);
    if (!allowed || !allowed.has(to)) {
      throw new Error(`HermesLifecycle: illegal transition ${phase} -> ${to}.`);
    }
    const from = phase;
    phase = to;
    fire(from, to);
  };

  return {
    currentPhase: (): HermesLifecyclePhase => phase,

    transition: (to: HermesLifecyclePhase): void => {
      if (!isHermesLifecyclePhase(to)) {
        throw new Error(`HermesLifecycle: unknown phase "${to}".`);
      }
      if (TERMINAL_PHASES.has(phase)) {
        throw new Error(
          `HermesLifecycle: terminal phase ${phase}; no further transitions permitted.`,
        );
      }
      // §3.3: a re-entrant transition (handler calls transition() again)
      // is queued rather than executed in-line, so the single-writer
      // invariant holds and SIGTERM cannot interleave with a health-
      // triggered failure.
      if (transitioning) {
        pendingQueue.push(to);
        return;
      }
      const allowed = LEGAL_TRANSITIONS.get(phase);
      if (!allowed || !allowed.has(to)) {
        throw new Error(`HermesLifecycle: illegal transition ${phase} -> ${to}.`);
      }
      transitioning = true;
      try {
        applyTransition(to);
        // Drain the queue after the current transition resolves, dropping
        // any queued transitions that became illegal because the phase
        // advanced past them.
        while (pendingQueue.length > 0 && !TERMINAL_PHASES.has(phase)) {
          const next = pendingQueue.shift();
          if (next === undefined) break;
          const nextAllowed = LEGAL_TRANSITIONS.get(phase);
          if (!nextAllowed || !nextAllowed.has(next)) {
            continue;
          }
          applyTransition(next);
        }
      } finally {
        transitioning = false;
      }
    },

    isTerminal: (): boolean => TERMINAL_PHASES.has(phase),

    onTransition: (handler: TransitionHandler): (() => void) => {
      handlers.push(handler);
      return () => {
        const idx = handlers.indexOf(handler);
        if (idx !== -1) handlers.splice(idx, 1);
      };
    },
  };
};
