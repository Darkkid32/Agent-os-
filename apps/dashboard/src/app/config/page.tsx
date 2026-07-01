'use client';

import { usePolling } from '../../dashboard/hooks/usePolling';
import type { DashboardEnvelope, HermesConfigDTO } from '../../dashboard/api/types';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? '/v1';

async function fetchConfig(): Promise<DashboardEnvelope<HermesConfigDTO>> {
  const res = await fetch(`${API_BASE}/config`);
  const body = (await res.json()) as {
    ok: boolean;
    value?: HermesConfigDTO;
    error?: { code: string; message: string };
  };
  if (body.ok && body.value)
    return { ok: true, data: body.value, requestId: '', at: new Date().toISOString() };
  return {
    ok: false,
    error: body.error ?? { code: 'UNKNOWN', message: 'Unknown error' },
    requestId: '',
    at: new Date().toISOString(),
  };
}

export default function ConfigPage() {
  const { data, loading, error, lastUpdated } = usePolling({
    fetcher: fetchConfig,
    intervalMs: 10000,
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Configuration</h1>
      <div className="rounded-lg border bg-card p-6">
        {loading && !data && <p className="text-sm text-muted-foreground">Loading...</p>}
        {data && (
          <dl className="space-y-3">
            {Object.entries(data).map(([key, value]) => (
              <div
                key={key}
                className="flex items-center justify-between border-b pb-2 last:border-0"
              >
                <dt className="text-sm font-medium">{key}</dt>
                <dd className="text-sm text-muted-foreground font-mono">
                  {typeof value === 'boolean' ? (value ? 'true' : 'false') : String(value ?? '—')}
                </dd>
              </div>
            ))}
          </dl>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
        {lastUpdated && (
          <p className="text-xs text-muted-foreground mt-4">
            Last updated: {new Date(lastUpdated).toLocaleTimeString()}
          </p>
        )}
      </div>
    </div>
  );
}
