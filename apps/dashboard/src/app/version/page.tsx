'use client';

import { usePolling } from '../../dashboard/hooks/usePolling';
import type { DashboardEnvelope, HermesVersionDTO } from '../../dashboard/api/types';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? '/v1';

async function fetchVersion(): Promise<DashboardEnvelope<HermesVersionDTO>> {
  const res = await fetch(`${API_BASE}/version`);
  const body = (await res.json()) as {
    ok: boolean;
    value?: HermesVersionDTO;
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

export default function VersionPage() {
  const { data, loading, error } = usePolling({ fetcher: fetchVersion, intervalMs: 30000 });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Version</h1>
      <div className="rounded-lg border bg-card p-6">
        {loading && !data && <p className="text-sm text-muted-foreground">Loading...</p>}
        {data && (
          <dl className="space-y-3">
            <div className="flex items-center justify-between border-b pb-2">
              <dt className="text-sm font-medium">Package</dt>
              <dd className="text-sm text-muted-foreground font-mono">{data.name}</dd>
            </div>
            <div className="flex items-center justify-between border-b pb-2">
              <dt className="text-sm font-medium">Version</dt>
              <dd className="text-sm text-muted-foreground font-mono">{data.version}</dd>
            </div>
          </dl>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    </div>
  );
}
