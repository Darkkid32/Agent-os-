/**
 * Execution serializer.
 *
 * Serializes and deserializes execution state for checkpointing and persistence.
 *
 * Layer: 4 (Application)
 */

import type {
  ExecutionIds,
  ExecutionCheckpoint,
  ExecutionStepResult,
  ExecutionStatistics,
  ExecutionStatus,
} from './ExecutionTypes.js';

// ---------------------------------------------------------------------------
// Serialized execution
// ---------------------------------------------------------------------------

/**
 * Serialized execution state.
 */
export interface SerializedExecution {
  /** Version for future compatibility */
  readonly version: number;

  /** Execution IDs */
  readonly ids: ExecutionIds;

  /** Goal text */
  readonly goal: string;

  /** Current status */
  readonly status: ExecutionStatus;

  /** Step results */
  readonly stepResults: readonly SerializedStepResult[];

  /** Statistics */
  readonly statistics: ExecutionStatistics;

  /** Start timestamp */
  readonly startedAt: string;

  /** Last update timestamp */
  readonly updatedAt: string;
}

/**
 * Serialized step result.
 */
export interface SerializedStepResult {
  readonly stepId: string;
  readonly success: boolean;
  readonly data?: unknown;
  readonly error?: string;
  readonly errorCode?: string;
  readonly durationMs: number;
  readonly retryAttempts: number;
  readonly completedAt: string;
}

// ---------------------------------------------------------------------------
// Serializer
// ---------------------------------------------------------------------------

const CURRENT_VERSION = 1;

/**
 * Serialize an execution checkpoint.
 */
export const serializeCheckpoint = (checkpoint: ExecutionCheckpoint): string => {
  const serialized: SerializedExecution = {
    version: CURRENT_VERSION,
    ids: checkpoint.ids,
    goal: '',
    status: checkpoint.status,
    stepResults: checkpoint.stepResults.map(serializeStepResult),
    statistics: checkpoint.statistics,
    startedAt: checkpoint.timestamp,
    updatedAt: new Date().toISOString(),
  };
  return JSON.stringify(serialized, null, 2);
};

/**
 * Deserialize an execution state.
 */
export const deserializeExecution = (json: string): SerializedExecution => {
  const parsed = JSON.parse(json) as SerializedExecution;

  if (parsed.version !== CURRENT_VERSION) {
    throw new Error(`Unsupported serialized version: ${parsed.version}`);
  }

  return parsed;
};

/**
 * Serialize a step result.
 */
export const serializeStepResult = (result: ExecutionStepResult): SerializedStepResult => ({
  stepId: result.stepId,
  success: result.success,
  ...(result.data !== undefined ? { data: result.data } : {}),
  ...(result.error !== undefined ? { error: result.error } : {}),
  ...(result.errorCode !== undefined ? { errorCode: result.errorCode } : {}),
  durationMs: result.durationMs,
  retryAttempts: result.retryAttempts,
  completedAt: result.completedAt,
});

/**
 * Deserialize a step result.
 */
export const deserializeStepResult = (serialized: SerializedStepResult): ExecutionStepResult => ({
  stepId: serialized.stepId,
  success: serialized.success,
  ...(serialized.data !== undefined ? { data: serialized.data } : {}),
  ...(serialized.error !== undefined ? { error: serialized.error } : {}),
  ...(serialized.errorCode !== undefined ? { errorCode: serialized.errorCode } : {}),
  durationMs: serialized.durationMs,
  retryAttempts: serialized.retryAttempts,
  completedAt: serialized.completedAt,
});

/**
 * Validate serialized data.
 */
export const validateSerialized = (
  json: string,
): {
  readonly valid: boolean;
  readonly error?: string;
} => {
  try {
    const parsed = JSON.parse(json) as SerializedExecution;
    if (parsed.version !== CURRENT_VERSION) {
      return { valid: false, error: `Unsupported version: ${parsed.version}` };
    }
    if (!parsed.ids?.executionId) {
      return { valid: false, error: 'Missing executionId' };
    }
    return { valid: true };
  } catch (e) {
    return { valid: false, error: e instanceof Error ? e.message : String(e) };
  }
};
