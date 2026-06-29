/**
 * Observability context — request and correlation ID propagation.
 *
 * Per docs/architecture/platform.md §13.2 and §13.3:
 *   - Every inbound request gets a UUID v4 request ID at the adapter boundary.
 *   - Correlation IDs tie sequences of related requests together.
 *   - Both propagate through all log entries for the request chain.
 *
 * Uses Node.js AsyncLocalStorage so each async branch inherits the
 * correct context without explicit parameter threading.
 */
import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';
import type { ObservabilityContext } from './types.js';

const storage = new AsyncLocalStorage<ObservabilityContext>();

/**
 * Run a function within an observability context. All child async calls
 * inherit the context via AsyncLocalStorage.
 */
export const runWithContext = <T>(ctx: ObservabilityContext, fn: () => T): T =>
  storage.run(ctx, fn);

/**
 * Get the current observability context, or undefined if none is set.
 */
export const currentContext = (): ObservabilityContext | undefined => storage.getStore();

/**
 * Generate a UUID v4 request ID.
 */
export const generateRequestId = (): string => randomUUID();

/**
 * Generate a UUID v4 correlation ID.
 */
export const generateCorrelationId = (): string => randomUUID();

/**
 * Create a full observability context with generated IDs.
 * If a caller supplies a correlation ID (e.g. via X-Correlation-ID header),
 * it is used; otherwise one is generated.
 */
export const createContext = (suppliedCorrelationId?: string): ObservabilityContext => ({
  requestId: generateRequestId(),
  correlationId: suppliedCorrelationId ?? generateCorrelationId(),
});
