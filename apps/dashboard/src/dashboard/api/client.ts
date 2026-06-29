import type {
  DashboardEnvelope,
  HermesConfigDTO,
  HermesHealthReportDTO,
  HermesStatusDTO,
  HermesVersionDTO,
} from './types';

export interface DashboardApiClient {
  readonly status: () => Promise<DashboardEnvelope<HermesStatusDTO>>;
  readonly health: () => Promise<DashboardEnvelope<HermesHealthReportDTO>>;
  readonly modules: () => Promise<DashboardEnvelope<{ readonly count: number }>>;
  readonly config: () => Promise<DashboardEnvelope<HermesConfigDTO>>;
  readonly version: () => Promise<DashboardEnvelope<HermesVersionDTO>>;
}

const newRequestId = (): string => {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  return `req-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
};

const isoNow = (): string => new Date().toISOString();

export class FetchDashboardClient implements DashboardApiClient {
  private readonly baseUrl: string;

  public constructor(baseUrl = '/v1') {
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  public async status(): Promise<DashboardEnvelope<HermesStatusDTO>> {
    return this.get<HermesStatusDTO>('/status');
  }

  public async health(): Promise<DashboardEnvelope<HermesHealthReportDTO>> {
    return this.get<HermesHealthReportDTO>('/health');
  }

  public async modules(): Promise<DashboardEnvelope<{ readonly count: number }>> {
    return this.get<{ readonly count: number }>('/modules');
  }

  public async config(): Promise<DashboardEnvelope<HermesConfigDTO>> {
    return this.get<HermesConfigDTO>('/config');
  }

  public async version(): Promise<DashboardEnvelope<HermesVersionDTO>> {
    return this.get<HermesVersionDTO>('/version');
  }

  private async get<T>(path: string): Promise<DashboardEnvelope<T>> {
    const requestId = newRequestId();
    const at = isoNow();
    try {
      const res = await fetch(`${this.baseUrl}${path}`, {
        method: 'GET',
        headers: { 'x-request-id': requestId },
      });
      if (!res.ok) {
        return {
          ok: false,
          error: { code: `HTTP_${res.status}`, message: `REST adapter returned ${res.status}` },
          requestId,
          at,
        };
      }
      const body = (await res.json()) as DashboardEnvelope<T>;
      return body;
    } catch (e) {
      return {
        ok: false,
        error: {
          code: 'NETWORK_ERROR',
          message: e instanceof Error ? e.message : String(e),
        },
        requestId,
        at,
      };
    }
  }
}
