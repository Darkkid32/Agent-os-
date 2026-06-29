import type { EventBus, Topic } from '@agent-os/event-bus';
import { now as timestampNow, type Timestamp } from '@agent-os/core';
import type { HermesLifecycle, HermesLifecyclePhase } from './HermesLifecycle.js';

/**
 * Hermes Event Dispatcher (Phase 2.4).
 *
 * Per docs/architecture/hermes.md §2.6 and §6, this module is a thin typed
 * facade over `@agent-os/event-bus`. It bridges lifecycle transitions to
 * domain events on the EventBus and nothing else.
 *
 * Conformance notes:
 *   - §2.4: lifecycle state is NOT owned here. HermesLifecycle remains the
 *     sole writer of the phase value; the dispatcher only observes.
 *   - §6.1: five lifecycle topics. The dispatcher maps every successful
 *     transition into exactly one event.
 *   - §6.3: events are emitted AFTER the transition is committed (the
 *     handler is registered via HermesLifecycle.onTransition, which fires
 *     post-commit). Best-effort publish: a throw is reported through the
 *     caller-supplied onPublishError hook and never rolls back the
 *     transition.
 *   - §2.6: no new transport. The dispatcher is a bridge, not an
 *     alternative to EventBus.
 *   - §4.1: dependency surface is core + event-bus + observability.
 *     OpenTelemetry is NOT imported here; the caller bridges publish
 *     errors into observability through the onPublishError hook.
 */

export const HERMES_TOPIC_INITIALIZING = 'hermes.initializing' as const;
export const HERMES_TOPIC_STARTED = 'hermes.started' as const;
export const HERMES_TOPIC_STOPPING = 'hermes.stopping' as const;
export const HERMES_TOPIC_STOPPED = 'hermes.stopped' as const;
export const HERMES_TOPIC_FAILED = 'hermes.failed' as const;

export type HermesLifecycleTopic =
  | typeof HERMES_TOPIC_INITIALIZING
  | typeof HERMES_TOPIC_STARTED
  | typeof HERMES_TOPIC_STOPPING
  | typeof HERMES_TOPIC_STOPPED
  | typeof HERMES_TOPIC_FAILED;

interface InitializingPayload {
  readonly phase: 'INITIALIZING';
  readonly previousPhase: HermesLifecyclePhase | undefined;
  readonly at: Timestamp;
}

interface StartedPayload {
  readonly phase: 'RUNNING';
  readonly previousPhase: HermesLifecyclePhase | undefined;
  readonly modules: number;
  readonly at: Timestamp;
}

interface StoppingPayload {
  readonly phase: 'STOPPING';
  readonly previousPhase: HermesLifecyclePhase | undefined;
  readonly reason: string;
  readonly at: Timestamp;
}

interface StoppedPayload {
  readonly phase: 'STOPPED';
  readonly previousPhase: HermesLifecyclePhase | undefined;
  readonly at: Timestamp;
}

interface FailedPayload {
  readonly phase: 'FAILED';
  readonly previousPhase: HermesLifecyclePhase | undefined;
  readonly reason: string;
  readonly at: Timestamp;
}

export type HermesLifecycleEventPayload =
  InitializingPayload | StartedPayload | StoppingPayload | StoppedPayload | FailedPayload;

export interface HermesEventDispatcherOptions {
  /**
   * Called when the lifecycle transitions to STOPPING. Defaults to empty
   * string. The dispatcher does not invent reasons; callers supply them.
   */
  readonly reasonForStopping?: () => string;
  /**
   * Called when the lifecycle transitions to FAILED. Defaults to empty
   * string. The dispatcher does not invent reasons; callers supply them.
   */
  readonly reasonForFailure?: () => string;
  /**
   * Reports the current module count when emitting `hermes.started`.
   * Defaults to 0 until the Module Registry exists. The dispatcher does
   * not invent module counts.
   */
  readonly getModuleCount?: () => number;
  /**
   * Receives any error raised by EventBus.publish. The dispatcher logs
   * through this hook instead of importing observability directly, so
   * the dispatcher's dependency surface stays within §4.1 (core,
   * runtime, observability, event-bus) without touching
   * @opentelemetry/api.
   *
   * If omitted, publish errors are silently swallowed per §6.3
   * ("best-effort").
   */
  readonly onPublishError?: (topic: HermesLifecycleTopic, error: unknown) => void;
}

export interface HermesEventDispatcher {
  /** Returns the disposer that unsubscribes from HermesLifecycle. */
  readonly dispose: () => void;
}

const topicFor = (phase: HermesLifecyclePhase): HermesLifecycleTopic | undefined => {
  switch (phase) {
    case 'INITIALIZING':
      return HERMES_TOPIC_INITIALIZING;
    case 'RUNNING':
      return HERMES_TOPIC_STARTED;
    case 'STOPPING':
      return HERMES_TOPIC_STOPPING;
    case 'STOPPED':
      return HERMES_TOPIC_STOPPED;
    case 'FAILED':
      return HERMES_TOPIC_FAILED;
    case 'STARTING':
      // §6.1 does not define a topic for STARTING. The dispatcher
      // intentionally emits nothing for this phase.
      return undefined;
  }
};

const asTopic = (value: string): Topic => value as Topic;

const buildPayload = (
  from: HermesLifecyclePhase | undefined,
  to: HermesLifecyclePhase,
  options: HermesEventDispatcherOptions,
): HermesLifecycleEventPayload => {
  const at = timestampNow();
  switch (to) {
    case 'INITIALIZING':
      return { phase: 'INITIALIZING', previousPhase: from, at };
    case 'RUNNING':
      return {
        phase: 'RUNNING',
        previousPhase: from,
        modules: options.getModuleCount ? options.getModuleCount() : 0,
        at,
      };
    case 'STOPPING':
      return {
        phase: 'STOPPING',
        previousPhase: from,
        reason: options.reasonForStopping ? options.reasonForStopping() : '',
        at,
      };
    case 'STOPPED':
      return { phase: 'STOPPED', previousPhase: from, at };
    case 'FAILED':
      return {
        phase: 'FAILED',
        previousPhase: from,
        reason: options.reasonForFailure ? options.reasonForFailure() : '',
        at,
      };
    case 'STARTING':
      // Unreachable: topicFor() returns undefined for STARTING and the
      // caller short-circuits before reaching buildPayload.
      throw new Error('HermesEventDispatcher: unreachable STARTING payload build.');
  }
};

export const createHermesEventDispatcher = (
  lifecycle: HermesLifecycle,
  bus: EventBus,
  options: HermesEventDispatcherOptions = {},
): HermesEventDispatcher => {
  const handler = (from: HermesLifecyclePhase, to: HermesLifecyclePhase): void => {
    const topic = topicFor(to);
    if (!topic) return;
    const payload = buildPayload(from, to, options);
    // §6.3: best-effort. A throw must not roll back the committed
    // transition. The lifecycle module already swallows the throw
    // inside fire(); this catch exists to guarantee independence from
    // any future change to that contract.
    try {
      void bus.publish(asTopic(topic), payload);
    } catch (error) {
      if (options.onPublishError) {
        options.onPublishError(topic, error);
      }
    }
  };

  const unsubscribe = lifecycle.onTransition(handler);

  return {
    dispose: (): void => {
      unsubscribe();
    },
  };
};
