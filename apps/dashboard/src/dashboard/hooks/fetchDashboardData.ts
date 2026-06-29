import { getDashboardClient } from '../api/provider';
import type { DashboardEnvelope } from '../api/types';

export async function fetchDashboardData<T>(
  load: (client: ReturnType<typeof getDashboardClient>) => Promise<DashboardEnvelope<T>>,
): Promise<DashboardEnvelope<T>> {
  const client = getDashboardClient();
  return load(client);
}
