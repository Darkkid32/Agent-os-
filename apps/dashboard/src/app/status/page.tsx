'use client';

import { usePolling } from '../../dashboard/hooks/usePolling';
import type { DashboardEnvelope, HermesStatusDTO } from '../../dashboard/api/types';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? '/v1';

async function fetchStatus(): Promise<DashboardEnvelope<HermesStatusDTO>> {
  const res = await fetch(`${API_BASE}/status`);
  const body = (await res.json()) as {
    ok: boolean;
    value?: HermesStatusDTO;
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

export default function StatusPage() {
  const { data, loading, error, lastUpdated } = usePolling({
    fetcher: fetchStatus,
    intervalMs: 3000,
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Status</h1>
      <div className="rounded-lg border bg-card p-6">
        {loading && !data && <p className="text-sm text-muted-foreground">Loading...</p>}
        {data && (
          <dl className="grid grid-cols-2 gap-4">
            <div>
              <dt className="text-xs text-muted-foreground">Phase</dt>
              <dd className="text-lg font-semibold">{data.phase}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Uptime</dt>
              <dd className="text-lg font-semibold">{Math.floor(data.uptime / 1000)}s</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Modules</dt>
              <dd className="text-lg font-semibold">{data.modules}</dd>
            </div>
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
