'use client';

import { usePolling } from '../../dashboard/hooks/usePolling';
import type { DashboardEnvelope, MetricsSummaryDTO } from '../../dashboard/api/types';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? '/v1';

async function fetchMetricsSummary(): Promise<DashboardEnvelope<MetricsSummaryDTO>> {
  const res = await fetch(`${API_BASE}/metrics/summary`);
  const body = (await res.json()) as {
    ok: boolean;
    value?: MetricsSummaryDTO;
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

function MetricCard({ label, value }: { readonly label: string; readonly value: string | number }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
    </div>
  );
}

export default function MetricsPage() {
  const { data, error, lastUpdated } = usePolling({
    fetcher: fetchMetricsSummary,
    intervalMs: 5000,
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Metrics</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard label="Hermes Phase" value={data?.hermes.phase ?? '—'} />
        <MetricCard
          label="Uptime"
          value={data ? `${Math.floor(data.hermes.uptime / 1000)}s` : '—'}
        />
        <MetricCard label="Modules" value={data?.hermes.modules ?? '—'} />
        <MetricCard label="Graph Nodes" value={data?.graph.nodeCount ?? '—'} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard label="Graph Edges" value={data?.graph.edgeCount ?? '—'} />
      </div>

      {data && Object.keys(data.graph.nodesByType).length > 0 && (
        <div className="rounded-lg border bg-card p-4">
          <h2 className="text-sm font-semibold mb-3">Nodes by Type</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(data.graph.nodesByType).map(([type, count]) => (
              <div key={type}>
                <p className="text-xs text-muted-foreground">{type}</p>
                <p className="text-lg font-bold">{count}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}
      {lastUpdated && (
        <p className="text-xs text-muted-foreground">
          Last updated: {new Date(lastUpdated).toLocaleTimeString()}
        </p>
      )}
    </div>
  );
}
