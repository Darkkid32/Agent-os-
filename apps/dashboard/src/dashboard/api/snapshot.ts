import { getDashboardClient } from './provider';
import type { DashboardApiClient } from './client';
import type { DashboardSnapshot } from './types';

export async function fetchDashboardSnapshot(
  client: DashboardApiClient = getDashboardClient(),
): Promise<DashboardSnapshot> {
  const [status, health, modules, version, plugins, metrics] = await Promise.all([
    client.status(),
    client.health(),
    client.modules(),
    client.version(),
    client.plugins(),
    client.metrics(),
  ]);

  return { status, health, modules, version, plugins, metrics };
}
