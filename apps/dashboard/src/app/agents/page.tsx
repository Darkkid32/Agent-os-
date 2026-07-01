'use client';

import { usePolling } from '../../dashboard/hooks/usePolling';
import type { DashboardEnvelope, AgentsDTO } from '../../dashboard/api/types';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? '/v1';

async function fetchAgents(): Promise<DashboardEnvelope<AgentsDTO>> {
  const res = await fetch(`${API_BASE}/agents`);
  const body = (await res.json()) as {
    ok: boolean;
    value?: AgentsDTO;
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
    status === 'healthy' || status === 'running'
      ? 'bg-green-500'
      : status === 'failed'
        ? 'bg-red-500'
        : 'bg-gray-400';
  return <span className={`inline-block h-2 w-2 rounded-full ${color}`} />;
}

export default function AgentsPage() {
  const { data, loading, error, lastUpdated } = usePolling({
    fetcher: fetchAgents,
    intervalMs: 3000,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Agents</h1>
        {data && <span className="text-sm text-muted-foreground">{data.count} registered</span>}
      </div>
      <div className="rounded-lg border bg-card">
        {loading && !data && <p className="p-4 text-sm text-muted-foreground">Loading...</p>}
        {data && data.items.length === 0 && (
          <p className="p-4 text-sm text-muted-foreground">No agents registered</p>
        )}
        {data &&
          data.items.map((agent) => (
            <div
              key={agent.id}
              className="flex items-center justify-between border-b p-4 last:border-0"
            >
              <div className="flex items-center gap-3">
                <StatusDot status={agent.status} />
                <div>
                  <p className="text-sm font-medium">{agent.name}</p>
                  <p className="text-xs text-muted-foreground">Type: {agent.type}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">{agent.status}</p>
                {agent.detail && <p className="text-xs text-muted-foreground">{agent.detail}</p>}
              </div>
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
