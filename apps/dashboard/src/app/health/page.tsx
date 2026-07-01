'use client';

import { usePolling } from '../../dashboard/hooks/usePolling';
import type { DashboardEnvelope, HermesHealthReportDTO } from '../../dashboard/api/types';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? '/v1';

async function fetchHealth(): Promise<DashboardEnvelope<HermesHealthReportDTO>> {
  const res = await fetch(`${API_BASE}/health`);
  const body = (await res.json()) as {
    ok: boolean;
    value?: HermesHealthReportDTO;
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

function HealthBadge({ status }: { readonly status: string }) {
  const colors: Record<string, string> = {
    healthy: 'bg-green-100 text-green-800',
    degraded: 'bg-yellow-100 text-yellow-800',
    failed: 'bg-red-100 text-red-800',
    unknown: 'bg-gray-100 text-gray-800',
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${colors[status] ?? colors.unknown}`}
    >
      {status}
    </span>
  );
}

export default function HealthPage() {
  const { data, loading, error, lastUpdated } = usePolling({
    fetcher: fetchHealth,
    intervalMs: 5000,
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Health</h1>
      <div className="rounded-lg border bg-card p-6">
        {loading && !data && <p className="text-sm text-muted-foreground">Loading...</p>}
        {data && (
          <>
            <div className="mb-4">
              <p className="text-xs text-muted-foreground">Overall Status</p>
              <HealthBadge status={data.status} />
            </div>
            <div className="space-y-3">
              {data.modules.map((m) => (
                <div
                  key={m.name}
                  className="flex items-center justify-between border-b pb-2 last:border-0"
                >
                  <div>
                    <p className="text-sm font-medium">{m.name}</p>
                    {m.detail && <p className="text-xs text-muted-foreground">{m.detail}</p>}
                  </div>
                  <HealthBadge status={m.status} />
                </div>
              ))}
            </div>
          </>
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
