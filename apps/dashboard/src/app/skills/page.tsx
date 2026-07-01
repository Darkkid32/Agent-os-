'use client';

import { usePolling } from '../../dashboard/hooks/usePolling';
import type { DashboardEnvelope, SkillsDTO } from '../../dashboard/api/types';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? '/v1';

async function fetchSkills(): Promise<DashboardEnvelope<SkillsDTO>> {
  const res = await fetch(`${API_BASE}/skills`);
  const body = (await res.json()) as {
    ok: boolean;
    value?: SkillsDTO;
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

export default function SkillsPage() {
  const { data, loading, error, lastUpdated } = usePolling({
    fetcher: fetchSkills,
    intervalMs: 5000,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Skills</h1>
        {data && <span className="text-sm text-muted-foreground">{data.count} registered</span>}
      </div>
      <div className="rounded-lg border bg-card">
        {loading && !data && <p className="p-4 text-sm text-muted-foreground">Loading...</p>}
        {data && data.items.length === 0 && (
          <p className="p-4 text-sm text-muted-foreground">No skills registered</p>
        )}
        {data &&
          data.items.map((skill) => (
            <div key={skill.id} className="border-b p-4 last:border-0">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-medium">{skill.name}</p>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${skill.status === 'available' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}
                >
                  {skill.status}
                </span>
              </div>
              {skill.description && (
                <p className="text-xs text-muted-foreground">{skill.description}</p>
              )}
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
