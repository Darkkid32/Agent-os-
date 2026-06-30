import type {
  DashboardEnvelope,
  HermesConfigDTO,
  HermesHealthReportDTO,
  HermesMetricsDTO,
  HermesModulesDTO,
  HermesPluginsDTO,
  HermesStatusDTO,
  HermesVersionDTO,
} from './types';

export interface DashboardApiClient {
  readonly status: () => Promise<DashboardEnvelope<HermesStatusDTO>>;
  readonly health: () => Promise<DashboardEnvelope<HermesHealthReportDTO>>;
  readonly modules: () => Promise<DashboardEnvelope<HermesModulesDTO>>;
  readonly config: () => Promise<DashboardEnvelope<HermesConfigDTO>>;
  readonly version: () => Promise<DashboardEnvelope<HermesVersionDTO>>;
  readonly plugins: () => Promise<DashboardEnvelope<HermesPluginsDTO>>;
  readonly metrics: () => Promise<DashboardEnvelope<HermesMetricsDTO>>;
}

const newRequestId = (): string => {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  return `req-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
};

const isoNow = (): string => new Date().toISOString();

const configuredBaseUrl = (): string => process.env.NEXT_PUBLIC_API_BASE_URL ?? '/v1';

const normalizeBaseUrl = (baseUrl: string): string => {
  const trimmed = baseUrl.replace(/\/$/, '');
  return trimmed.endsWith('/v1') ? trimmed : `${trimmed}/v1`;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const valueAsString = (value: unknown, fallback: string): string =>
  typeof value === 'string' ? value : fallback;

const normalizeResponse = <T>(
  body: unknown,
  requestId: string,
  at: string,
): DashboardEnvelope<T> => {
  if (!isRecord(body) || typeof body['ok'] !== 'boolean') {
    return {
      ok: false,
      error: { code: 'INVALID_RESPONSE', message: 'REST adapter returned an invalid envelope' },
      requestId,
      at,
    };
  }

  const responseRequestId = valueAsString(body['requestId'], requestId);
  const responseAt = valueAsString(body['at'], at);

  if (body['ok']) {
    if ('data' in body) {
      return { ok: true, data: body['data'] as T, requestId: responseRequestId, at: responseAt };
    }
    if ('value' in body) {
      return { ok: true, data: body['value'] as T, requestId: responseRequestId, at: responseAt };
    }
    return {
      ok: false,
      error: { code: 'INVALID_RESPONSE', message: 'REST adapter success envelope has no value' },
      requestId: responseRequestId,
      at: responseAt,
    };
  }

  const error = isRecord(body['error']) ? body['error'] : {};
  return {
    ok: false,
    error: {
      code: valueAsString(error['code'], 'REST_ERROR'),
      message: valueAsString(error['message'], 'REST adapter returned an error'),
      detail: error['detail'],
    },
    requestId: responseRequestId,
    at: responseAt,
  };
};

export class FetchDashboardClient implements DashboardApiClient {
  private readonly baseUrl: string;

  public constructor(baseUrl = configuredBaseUrl()) {
    this.baseUrl = normalizeBaseUrl(baseUrl);
  }

  public async status(): Promise<DashboardEnvelope<HermesStatusDTO>> {
    return this.get<HermesStatusDTO>('/status');
  }

  public async health(): Promise<DashboardEnvelope<HermesHealthReportDTO>> {
    return this.get<HermesHealthReportDTO>('/health');
  }

  public async modules(): Promise<DashboardEnvelope<HermesModulesDTO>> {
    return this.get<HermesModulesDTO>('/modules');
  }

  public async config(): Promise<DashboardEnvelope<HermesConfigDTO>> {
    return this.get<HermesConfigDTO>('/config');
  }

  public async version(): Promise<DashboardEnvelope<HermesVersionDTO>> {
    return this.get<HermesVersionDTO>('/version');
  }

  public async plugins(): Promise<DashboardEnvelope<HermesPluginsDTO>> {
    return this.get<HermesPluginsDTO>('/plugins');
  }

  public async metrics(): Promise<DashboardEnvelope<HermesMetricsDTO>> {
    return this.get<HermesMetricsDTO>('/metrics');
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
      const body: unknown = await res.json();
      return normalizeResponse<T>(body, requestId, at);
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
