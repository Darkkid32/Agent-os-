'use client';

import { usePolling } from '../../dashboard/hooks/usePolling';
import type { DashboardEnvelope, MemoryDTO } from '../../dashboard/api/types';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? '/v1';

async function fetchMemory(): Promise<DashboardEnvelope<MemoryDTO>> {
  const res = await fetch(`${API_BASE}/memory?limit=50`);
  const body = (await res.json()) as {
    ok: boolean;
    value?: MemoryDTO;
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

export default function MemoryPage() {
  const { data, loading, error, lastUpdated } = usePolling({
    fetcher: fetchMemory,
    intervalMs: 5000,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Memory</h1>
        {data && <span className="text-sm text-muted-foreground">{data.count} entries</span>}
      </div>
      <div className="rounded-lg border bg-card">
        {loading && !data && <p className="p-4 text-sm text-muted-foreground">Loading...</p>}
        {data && data.items.length === 0 && (
          <p className="p-4 text-sm text-muted-foreground">No memory entries</p>
        )}
        {data &&
          data.items.map((entry) => (
            <div key={entry.id} className="border-b p-4 last:border-0">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-medium truncate max-w-[80%]">{entry.content}</p>
                <span className="text-xs text-muted-foreground">{entry.scope}</span>
              </div>
              <p className="text-xs text-muted-foreground">Source: {entry.source}</p>
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
