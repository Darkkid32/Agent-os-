import { fetchDashboardData } from '../../dashboard/hooks/fetchDashboardData';
import { ModuleList } from '../../dashboard/components/ModuleList';
import { ErrorPanel } from '../../dashboard/components/ErrorPanel';

export const dynamic = 'force-dynamic';

export default async function ModulesPage(): Promise<JSX.Element> {
  const env = await fetchDashboardData((c) => c.modules());
  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight">Modules</h1>
        <p className="text-sm text-muted-foreground">Modules registered with the Hermes kernel.</p>
      </header>
      {env.ok ? (
        <ModuleList modules={env.data} />
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
