/**
 * @agent-os/observability
 *
 * OpenTelemetry wiring. Phase 1.1 provides a no-op default tracer plus a
 * place-holder bootstrap. Real exporters land in Phase 2.
 */

import { trace, type Tracer } from '@opentelemetry/api';

export const PACKAGE_NAME = '@agent-os/observability' as const;
export const PACKAGE_VERSION = '0.1.0' as const;

export const DEFAULT_TRACER_NAME = '@agent-os/observability' as const;

export const getTracer = (): Tracer => trace.getTracer(DEFAULT_TRACER_NAME);

export interface ObservabilityConfig {
  readonly serviceName: string;
  readonly environment: 'development' | 'production' | 'test';
  readonly enabled: boolean;
}

export const defaultConfig: ObservabilityConfig = {
  serviceName: 'agent-os',
  environment: 'development',
  enabled: false,
};
