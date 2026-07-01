'use client';

import { usePolling } from '../../dashboard/hooks/usePolling';
import type { DashboardEnvelope, PlansDTO } from '../../dashboard/api/types';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? '/v1';

async function fetchPlans(): Promise<DashboardEnvelope<PlansDTO>> {
  const res = await fetch(`${API_BASE}/plans`);
  const body = (await res.json()) as {
    ok: boolean;
    value?: PlansDTO;
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

function StatusBadge({ status }: { readonly status: string }) {
  const colors: Record<string, string> = {
    active: 'bg-blue-100 text-blue-800',
    completed: 'bg-green-100 text-green-800',
    failed: 'bg-red-100 text-red-800',
    pending: 'bg-gray-100 text-gray-800',
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${colors[status] ?? colors.pending}`}
    >
      {status}
    </span>
  );
}

export default function PlansPage() {
  const { data, loading, error, lastUpdated } = usePolling({
    fetcher: fetchPlans,
    intervalMs: 3000,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Plans</h1>
        {data && <span className="text-sm text-muted-foreground">{data.count} total</span>}
      </div>
      <div className="rounded-lg border bg-card">
        {loading && !data && <p className="p-4 text-sm text-muted-foreground">Loading...</p>}
        {data && data.items.length === 0 && (
          <p className="p-4 text-sm text-muted-foreground">No plans</p>
        )}
        {data &&
          data.items.map((plan) => (
            <div key={plan.id} className="border-b p-4 last:border-0">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-medium">{plan.name}</p>
                <StatusBadge status={plan.status} />
              </div>
              {plan.goal && <p className="text-xs text-muted-foreground">Goal: {plan.goal}</p>}
              <p className="text-xs text-muted-foreground mt-1">Steps: {plan.stepCount}</p>
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
