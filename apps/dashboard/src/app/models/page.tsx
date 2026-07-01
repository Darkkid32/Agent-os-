'use client';

import { usePolling } from '../../dashboard/hooks/usePolling';
import type { DashboardEnvelope, ModelsDTO } from '../../dashboard/api/types';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? '/v1';

async function fetchModels(): Promise<DashboardEnvelope<ModelsDTO>> {
  const res = await fetch(`${API_BASE}/models`);
  const body = (await res.json()) as {
    ok: boolean;
    value?: ModelsDTO;
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

export default function ModelsPage() {
  const { data, loading, error, lastUpdated } = usePolling({
    fetcher: fetchModels,
    intervalMs: 10000,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Models</h1>
        {data && <span className="text-sm text-muted-foreground">{data.count} configured</span>}
      </div>
      <div className="rounded-lg border bg-card">
        {loading && !data && <p className="p-4 text-sm text-muted-foreground">Loading...</p>}
        {data && data.items.length === 0 && (
          <p className="p-4 text-sm text-muted-foreground">No models configured</p>
        )}
        {data &&
          data.items.map((model) => (
            <div key={model.id} className="border-b p-4 last:border-0">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-medium">{model.name}</p>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${model.status === 'configured' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}
                >
                  {model.status}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">Provider: {model.provider}</p>
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
