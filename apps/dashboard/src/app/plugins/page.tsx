'use client';

import { usePolling } from '../../dashboard/hooks/usePolling';
import type { DashboardEnvelope, HermesPluginsDTO } from '../../dashboard/api/types';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? '/v1';

async function fetchPlugins(): Promise<DashboardEnvelope<HermesPluginsDTO>> {
  const res = await fetch(`${API_BASE}/plugins`);
  const body = (await res.json()) as {
    ok: boolean;
    value?: HermesPluginsDTO;
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

function StatusDot({ status }: { readonly status: string }) {
  const color =
    status === 'healthy'
      ? 'bg-green-500'
      : status === 'failed'
        ? 'bg-red-500'
        : status === 'degraded'
          ? 'bg-yellow-500'
          : 'bg-gray-400';
  return <span className={`inline-block h-2 w-2 rounded-full ${color}`} />;
}

export default function PluginsPage() {
  const { data, loading, error, lastUpdated } = usePolling({
    fetcher: fetchPlugins,
    intervalMs: 5000,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Plugins</h1>
        {data && <span className="text-sm text-muted-foreground">{data.count} loaded</span>}
      </div>
      <div className="rounded-lg border bg-card">
        {loading && !data && <p className="p-4 text-sm text-muted-foreground">Loading...</p>}
        {data && data.items.length === 0 && (
          <p className="p-4 text-sm text-muted-foreground">No plugins loaded</p>
        )}
        {data &&
          data.items.map((plugin) => (
            <div
              key={plugin.name}
              className="flex items-center justify-between border-b p-4 last:border-0"
            >
              <div className="flex items-center gap-3">
                <StatusDot status={plugin.status} />
                <div>
                  <p className="text-sm font-medium">{plugin.name}</p>
                  {plugin.detail && (
                    <p className="text-xs text-muted-foreground">{plugin.detail}</p>
                  )}
                </div>
              </div>
              <span className="text-xs text-muted-foreground">{plugin.status}</span>
            </div>
          ))}
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {lastUpdated && (
        <p className="text-xs text-muted-foreground">
          Last updated: {new Date(lastUpdated).toLocaleTimeString()}
        </p>
      )}
    </div>
  );
}
