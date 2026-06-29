import { fetchDashboardData } from '../../dashboard/hooks/fetchDashboardData';
import { StatusCard } from '../../dashboard/components/StatusCard';
import { ErrorPanel } from '../../dashboard/components/ErrorPanel';

export const dynamic = 'force-dynamic';

export default async function StatusPage(): Promise<JSX.Element> {
  const env = await fetchDashboardData((c) => c.status());
  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight">System Status</h1>
        <p className="text-sm text-muted-foreground">
          Current kernel phase, uptime, and module count.
        </p>
      </header>
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
    </div>
  );
}
