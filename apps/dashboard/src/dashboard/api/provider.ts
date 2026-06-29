import { FetchDashboardClient, type DashboardApiClient } from './client';
import { MockDashboardClient } from './mock';

let cached: DashboardApiClient | undefined;

export const getDashboardClient = (): DashboardApiClient => {
  if (cached) return cached;
  const useMock =
    typeof process !== 'undefined' && process.env['NEXT_PUBLIC_DASHBOARD_MOCK'] === '1';
  cached = useMock ? new MockDashboardClient() : new FetchDashboardClient();
  return cached;
};
