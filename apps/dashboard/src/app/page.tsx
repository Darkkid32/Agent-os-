import { fetchDashboardSnapshot } from '../dashboard/api/snapshot';
import { LiveDashboard } from '../dashboard/components/LiveDashboard';

export const dynamic = 'force-dynamic';

export default async function DashboardOverviewPage(): Promise<JSX.Element> {
  const snapshot = await fetchDashboardSnapshot();
  return <LiveDashboard initialSnapshot={snapshot} />;
}
