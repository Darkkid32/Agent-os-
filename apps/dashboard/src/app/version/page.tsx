import { fetchDashboardData } from '../../dashboard/hooks/fetchDashboardData';
import { VersionFooter } from '../../dashboard/components/VersionFooter';
import { ErrorPanel } from '../../dashboard/components/ErrorPanel';

export const dynamic = 'force-dynamic';

export default async function VersionPage(): Promise<JSX.Element> {
  const env = await fetchDashboardData((c) => c.version());
  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight">Version</h1>
        <p className="text-sm text-muted-foreground">Hermes kernel identity.</p>
      </header>
      {env.ok ? (
        <div className="rounded-md border bg-card p-6">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Hermes</div>
          <div className="mt-2 font-mono text-sm">
            {env.data.name} @ {env.data.version}
          </div>
          <div className="mt-6">
            <VersionFooter version={env.data} />
          </div>
        </div>
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
