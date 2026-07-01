'use client';

import { usePolling } from '../dashboard/hooks/usePolling';
import type {
  DashboardEnvelope,
  HermesStatusDTO,
  HermesHealthReportDTO,
  MetricsSummaryDTO,
} from '../dashboard/api/types';

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

function StatusBadge({ phase }: { readonly phase: string }) {
  const colors: Record<string, string> = {
    RUNNING: 'bg-green-100 text-green-800',
    STOPPED: 'bg-gray-100 text-gray-800',
    FAILED: 'bg-red-100 text-red-800',
    INITIALIZING: 'bg-yellow-100 text-yellow-800',
    STARTING: 'bg-blue-100 text-blue-800',
    STOPPING: 'bg-orange-100 text-orange-800',
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${colors[phase] ?? 'bg-gray-100 text-gray-800'}`}
    >
      {phase}
    </span>
  );
}

function MetricCard({
  label,
  value,
  sub,
}: {
  readonly label: string;
  readonly value: string | number;
  readonly sub?: string;
}) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </div>
  );
}

export default function OverviewPage() {
  const status = usePolling({ fetcher: fetchStatus, intervalMs: 3000 });
  const health = usePolling({ fetcher: fetchHealth, intervalMs: 5000 });
  const summary = usePolling({ fetcher: fetchMetricsSummary, intervalMs: 5000 });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Mission Control</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard label="Phase" value={status.data?.phase ?? '—'} />
        <MetricCard
          label="Uptime"
          value={status.data ? `${Math.floor(status.data.uptime / 1000)}s` : '—'}
        />
        <MetricCard label="Modules" value={status.data?.modules ?? '—'} />
        <MetricCard label="Graph Nodes" value={summary.data?.graph.nodeCount ?? '—'} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard label="Graph Edges" value={summary.data?.graph.edgeCount ?? '—'} />
        <MetricCard label="Agents" value={summary.data?.hermes.modules ?? '—'} />
        <MetricCard label="Hermes Phase" value={summary.data?.hermes.phase ?? '—'} />
        <MetricCard label="Uptime (ms)" value={summary.data?.hermes.uptime ?? '—'} />
      </div>

      <div className="rounded-lg border bg-card p-4">
        <h2 className="text-sm font-semibold mb-3">Module Health</h2>
        {health.data?.modules && health.data.modules.length > 0 ? (
          <div className="space-y-2">
            {health.data.modules.map(
              (m: { readonly name: string; readonly status: string; readonly detail?: string }) => (
                <div key={m.name} className="flex items-center justify-between text-sm">
                  <span>{m.name}</span>
                  <StatusBadge phase={m.status} />
                </div>
              ),
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No modules registered</p>
        )}
      </div>

      {status.error && <p className="text-sm text-destructive">Error: {status.error}</p>}
    </div>
  );
}
