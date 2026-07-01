'use client';

import { usePolling } from '../../dashboard/hooks/usePolling';
import type { DashboardEnvelope, GraphDTO } from '../../dashboard/api/types';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? '/v1';

async function fetchGraph(): Promise<DashboardEnvelope<GraphDTO>> {
  const res = await fetch(`${API_BASE}/graph`);
  const body = (await res.json()) as {
    ok: boolean;
    value?: GraphDTO;
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

export default function KnowledgePage() {
  const { data, loading, error, lastUpdated } = usePolling({
    fetcher: fetchGraph,
    intervalMs: 5000,
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Knowledge Graph</h1>

      {data && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-lg border bg-card p-4">
            <p className="text-xs text-muted-foreground">Nodes</p>
            <p className="text-2xl font-bold">{data.stats.nodeCount}</p>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <p className="text-xs text-muted-foreground">Edges</p>
            <p className="text-2xl font-bold">{data.stats.edgeCount}</p>
          </div>
          {Object.entries(data.stats.nodesByType).map(([type, count]) => (
            <div key={type} className="rounded-lg border bg-card p-4">
              <p className="text-xs text-muted-foreground">{type}</p>
              <p className="text-2xl font-bold">{count}</p>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-lg border bg-card p-4">
        <h2 className="text-sm font-semibold mb-3">Graph Nodes</h2>
        {loading && !data && <p className="text-sm text-muted-foreground">Loading...</p>}
        {data && data.nodes.length === 0 && (
          <p className="text-sm text-muted-foreground">No nodes in graph</p>
        )}
        {data && (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {data.nodes.map((node) => (
              <div
                key={node.id}
                className="flex items-center justify-between border-b pb-2 last:border-0 text-sm"
              >
                <div>
                  <span className="font-medium">{node.label}</span>
                  <span className="ml-2 text-xs text-muted-foreground">({node.type})</span>
                </div>
                <span className="text-xs text-muted-foreground">{node.id.slice(0, 8)}</span>
              </div>
            ))}
          </div>
        )}
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
