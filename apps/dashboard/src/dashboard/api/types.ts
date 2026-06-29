/**
 * Dashboard DTOs — local mirror of the Hermes public return shapes.
 *
 * Per docs/architecture/platform.md §10.5 the Dashboard MUST NOT import
 * @agent-os/hermes. The Dashboard consumes data via the REST adapter
 * (§10.1) and therefore defines its own response DTOs here. These shapes
 * are kept structurally identical to Hermes's return types so the REST
 * adapter can serialise them verbatim. If Hermes changes a return shape,
 * the corresponding change lands here and in the REST adapter in the
 * same PR.
 *
 * This is intentional decoupling: the Dashboard has no compile-time
 * dependency on Hermes; Hermes has no compile-time dependency on the
 * Dashboard. The contract between them is the REST envelope + these DTOs.
 */

export type HermesLifecyclePhase =
  'INITIALIZING' | 'STARTING' | 'RUNNING' | 'STOPPING' | 'STOPPED' | 'FAILED';

export type HermesModuleHealth = 'healthy' | 'degraded' | 'failed' | 'unknown';

export interface HermesStatusDTO {
  readonly phase: HermesLifecyclePhase;
  readonly uptime: number;
  readonly modules: number;
}

export interface HermesHealthDetailDTO {
  readonly name: string;
  readonly status: HermesModuleHealth;
  readonly detail?: string;
}

export interface HermesHealthReportDTO {
  readonly status: HermesModuleHealth;
  readonly modules: readonly HermesHealthDetailDTO[];
  readonly at: number;
}

export interface HermesModuleDTO {
  readonly name: string;
  readonly version: string;
  readonly dependencies: readonly string[];
  readonly required: boolean;
  readonly healthStatus: HermesModuleHealth;
}

export interface HermesConfigDTO {
  readonly nodeEnv: 'development' | 'production' | 'test';
  readonly logLevel: string;
  readonly openrouterApiKey: '****';
  readonly databaseUrl: '****';
  readonly redisUrl: '****';
  readonly otelEnabled: boolean;
  readonly otelExporterEndpoint: string | undefined;
  readonly hermesModulesDir: string;
  readonly hermesShutdownTimeoutMs: number;
}

export interface HermesVersionDTO {
  readonly name: string;
  readonly version: string;
}

/**
 * REST envelope per docs/architecture/platform.md §6.5.
 */
export type DashboardEnvelope<T> =
  | { readonly ok: true; readonly data: T; readonly requestId: string; readonly at: string }
  | {
      readonly ok: false;
      readonly error: {
        readonly code: string;
        readonly message: string;
        readonly detail?: unknown;
      };
      readonly requestId: string;
      readonly at: string;
    };
