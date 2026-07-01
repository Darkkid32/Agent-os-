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
 *
 * Phase 9.6: Mission Control DTOs added for agents, missions, memory,
 * plans, tools, skills, models, logs, graph, and metrics summary.
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
  readonly status: HermesModuleHealth;
  readonly detail?: string;
}

export interface HermesModulesDTO {
  readonly count: number;
  readonly items: readonly HermesModuleDTO[];
}

export type HermesPluginsDTO = HermesModulesDTO;

export interface MetricEntryDTO {
  readonly name: string;
  readonly help: string;
  readonly type: 'counter' | 'histogram' | 'gauge';
  readonly labels: Readonly<Record<string, string>>;
  readonly value: number;
}

export interface HermesMetricsDTO {
  readonly count: number;
  readonly items: readonly MetricEntryDTO[];
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

// ---------------------------------------------------------------------------
// Mission Control DTOs (Phase 9.6)
// ---------------------------------------------------------------------------

export interface AgentDTO {
  readonly id: string;
  readonly name: string;
  readonly status: string;
  readonly type: string;
  readonly detail?: string;
  readonly registeredAt: string;
}

export interface AgentsDTO {
  readonly count: number;
  readonly items: readonly AgentDTO[];
}

export interface MissionDTO {
  readonly id: string;
  readonly name: string;
  readonly status: string;
  readonly goal: string;
  readonly startedAt: string;
  readonly updatedAt: string;
}

export interface MissionsDTO {
  readonly count: number;
  readonly items: readonly MissionDTO[];
}

export interface MemoryEntryDTO {
  readonly id: string;
  readonly content: string;
  readonly scope: string;
  readonly source: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface MemoryDTO {
  readonly count: number;
  readonly items: readonly MemoryEntryDTO[];
}

export interface PlanDTO {
  readonly id: string;
  readonly name: string;
  readonly status: string;
  readonly goal: string;
  readonly stepCount: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface PlansDTO {
  readonly count: number;
  readonly items: readonly PlanDTO[];
}

export interface ToolDTO {
  readonly id: string;
  readonly name: string;
  readonly type: string;
  readonly description: string;
  readonly status: string;
}

export interface ToolsDTO {
  readonly count: number;
  readonly items: readonly ToolDTO[];
}

export interface SkillDTO {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly status: string;
}

export interface SkillsDTO {
  readonly count: number;
  readonly items: readonly SkillDTO[];
}

export interface ModelDTO {
  readonly id: string;
  readonly name: string;
  readonly provider: string;
  readonly status: string;
}

export interface ModelsDTO {
  readonly count: number;
  readonly items: readonly ModelDTO[];
}

export interface LogEntryDTO {
  readonly id: string;
  readonly level: string;
  readonly message: string;
  readonly source: string;
  readonly timestamp: string;
}

export interface LogsDTO {
  readonly count: number;
  readonly items: readonly LogEntryDTO[];
}

export interface GraphNodeDTO {
  readonly id: string;
  readonly type: string;
  readonly label: string;
  readonly properties: Readonly<Record<string, unknown>>;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface GraphEdgeDTO {
  readonly id: string;
  readonly type: string;
  readonly sourceId: string;
  readonly targetId: string;
  readonly weight: number;
  readonly properties: Readonly<Record<string, unknown>>;
  readonly createdAt: string;
}

export interface GraphStatsDTO {
  readonly nodeCount: number;
  readonly edgeCount: number;
  readonly nodesByType: Readonly<Record<string, number>>;
  readonly edgesByType: Readonly<Record<string, number>>;
}

export interface GraphDTO {
  readonly nodes: readonly GraphNodeDTO[];
  readonly edges: readonly GraphEdgeDTO[];
  readonly stats: GraphStatsDTO;
}

export interface MetricsSummaryDTO {
  readonly hermes: {
    readonly phase: string;
    readonly uptime: number;
    readonly modules: number;
  };
  readonly graph: GraphStatsDTO;
}

// ---------------------------------------------------------------------------
// REST envelope
// ---------------------------------------------------------------------------

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

export interface DashboardSnapshot {
  readonly status: DashboardEnvelope<HermesStatusDTO>;
  readonly health: DashboardEnvelope<HermesHealthReportDTO>;
  readonly modules: DashboardEnvelope<HermesModulesDTO>;
  readonly version: DashboardEnvelope<HermesVersionDTO>;
  readonly plugins: DashboardEnvelope<HermesPluginsDTO>;
  readonly metrics: DashboardEnvelope<HermesMetricsDTO>;
}
