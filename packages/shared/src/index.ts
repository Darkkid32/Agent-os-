/**
 * @agent-os/shared
 *
 * Cross-cutting shared types and Zod schemas used by API surface and runtime.
 * Phase 1.1: contract-only. Real domain schemas land in Phase 2.
 */

import { z } from 'zod';

export const PACKAGE_NAME = '@agent-os/shared' as const;
export const PACKAGE_VERSION = '1.0.0' as const;

export const HealthStatusSchema = z.object({
  status: z.literal('ok'),
  version: z.string(),
  uptimeSeconds: z.number().nonnegative(),
});

export type HealthStatus = z.infer<typeof HealthStatusSchema>;

export const ErrorEnvelopeSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.record(z.unknown()).optional(),
  traceId: z.string().optional(),
});

export type ErrorEnvelope = z.infer<typeof ErrorEnvelopeSchema>;
