import { fetchDashboardData } from '../../dashboard/hooks/fetchDashboardData';
import { ConfigView } from '../../dashboard/components/ConfigView';
import { ErrorPanel } from '../../dashboard/components/ErrorPanel';

export const dynamic = 'force-dynamic';

export default async function ConfigPage(): Promise<JSX.Element> {
  const env = await fetchDashboardData((c) => c.config());
  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight">Configuration</h1>
        <p className="text-sm text-muted-foreground">
          Active Hermes configuration. Secret values are redacted.
        </p>
      </header>
      {env.ok ? (
        <ConfigView config={env.data} />
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
