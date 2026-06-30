import type { DashboardApiClient } from './client';
import type {
  DashboardEnvelope,
  HermesConfigDTO,
  HermesHealthReportDTO,
  HermesStatusDTO,
  HermesVersionDTO,
} from './types';

export interface MockSnapshot {
  readonly status: HermesStatusDTO;
  readonly health: HermesHealthReportDTO;
  readonly modulesCount: number;
  readonly config: HermesConfigDTO;
  readonly version: HermesVersionDTO;
}

const mockVersion: HermesVersionDTO = { name: '@agent-os/hermes', version: '1.0.0' };

const mockConfig: HermesConfigDTO = {
  nodeEnv: 'development',
  logLevel: 'info',
  openrouterApiKey: '****',
  databaseUrl: '****',
  redisUrl: '****',
  otelEnabled: false,
  otelExporterEndpoint: undefined,
  hermesModulesDir: './modules',
  hermesShutdownTimeoutMs: 30000,
};

const defaultSnapshot: MockSnapshot = {
  status: { phase: 'INITIALIZING', uptime: 0, modules: 0 },
  health: { status: 'unknown', modules: [], at: Date.now() },
  modulesCount: 0,
  config: mockConfig,
  version: mockVersion,
};

const envelope = <T>(data: T): DashboardEnvelope<T> => ({
  ok: true,
  data,
  requestId: `mock-${Date.now().toString(36)}`,
  at: new Date().toISOString(),
});

export class MockDashboardClient implements DashboardApiClient {
  private snapshot: MockSnapshot;

  public constructor(snapshot: MockSnapshot = defaultSnapshot) {
    this.snapshot = snapshot;
  }

  public setSnapshot(snapshot: MockSnapshot): void {
    this.snapshot = snapshot;
  }

  public async status(): Promise<DashboardEnvelope<HermesStatusDTO>> {
    return envelope(this.snapshot.status);
  }

  public async health(): Promise<DashboardEnvelope<HermesHealthReportDTO>> {
    return envelope(this.snapshot.health);
  }

  public async modules(): Promise<DashboardEnvelope<{ readonly count: number }>> {
    return envelope({ count: this.snapshot.modulesCount });
  }

  public async config(): Promise<DashboardEnvelope<HermesConfigDTO>> {
    return envelope(this.snapshot.config);
  }

  public async version(): Promise<DashboardEnvelope<HermesVersionDTO>> {
    return envelope(this.snapshot.version);
  }
}
