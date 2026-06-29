import { fetchDashboardData } from '../dashboard/hooks/fetchDashboardData';
import { StatusCard } from '../dashboard/components/StatusCard';
import { ErrorPanel } from '../dashboard/components/ErrorPanel';
import { getDashboardClient } from '../dashboard/api/provider';

export const dynamic = 'force-dynamic';

export default async function DashboardOverviewPage(): Promise<JSX.Element> {
  const env = await fetchDashboardData((c) => c.status());
  const version = await fetchDashboardData((c) => c.version());

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Read-only view of the Hermes kernel via the REST adapter. Refresh by reloading the page;
          refresh intervals are owned by this view.
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">System Status</h2>
        {env.ok ? (
          <StatusCard status={env.data} />
        ) : (
          <ErrorPanel
            error={{
              code: env.error.code,
              message: env.error.message,
              requestId: env.requestId,
            }}
          />
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Kernel Version</h2>
        {version.ok ? (
          <div className="rounded-md border bg-card p-4 text-sm">
            <span className="font-mono">
              {version.data.name} @ {version.data.version}
            </span>
          </div>
        ) : (
          <ErrorPanel
            error={{
              code: version.error.code,
              message: version.error.message,
              requestId: version.requestId,
            }}
          />
        )}
      </section>

      <p className="text-xs text-muted-foreground">
        Data source: {getDashboardClient().constructor.name}
      </p>
    </div>
  );
}
