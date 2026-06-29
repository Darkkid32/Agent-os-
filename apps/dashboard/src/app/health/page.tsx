import { fetchDashboardData } from '../../dashboard/hooks/fetchDashboardData';
import { HealthGrid } from '../../dashboard/components/HealthGrid';
import { ErrorPanel } from '../../dashboard/components/ErrorPanel';

export const dynamic = 'force-dynamic';

export default async function HealthPage(): Promise<JSX.Element> {
  const env = await fetchDashboardData((c) => c.health());
  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight">Health</h1>
        <p className="text-sm text-muted-foreground">Aggregate and per-module health.</p>
      </header>
      {env.ok ? (
        <HealthGrid report={env.data} />
      ) : (
        <ErrorPanel
          error={{
            code: env.error.code,
            message: env.error.message,
            requestId: env.requestId,
          }}
        />
      )}
    </div>
  );
}
