'use client';

import { useEffect, useState } from 'react';
import { fetchDashboardSnapshot } from '../api/snapshot';
import type {
  DashboardEnvelope,
  DashboardSnapshot,
  HermesMetricsDTO,
  HermesModulesDTO,
} from '../api/types';
import { DisconnectedState } from './DisconnectedState';
import { ErrorPanel } from './ErrorPanel';
import { HealthGrid } from './HealthGrid';
import { ModuleList } from './ModuleList';
import { Pill } from './Pill';
import { StatusCard } from './StatusCard';

const POLL_INTERVAL_MS = 3000;

const errorFrom = <T,>(
  env: DashboardEnvelope<T>,
): { code: string; message: string; requestId: string } | undefined =>
  env.ok
    ? undefined
    : { code: env.error.code, message: env.error.message, requestId: env.requestId };

const isDisconnected = (snapshot: DashboardSnapshot): boolean => {
  const envelopes = [
    snapshot.status,
    snapshot.health,
    snapshot.modules,
    snapshot.version,
    snapshot.plugins,
    snapshot.metrics,
  ];
  return (
    envelopes.every((env) => !env.ok) ||
    (!snapshot.status.ok && snapshot.status.error.code === 'NETWORK_ERROR')
  );
};

interface AdapterSummary {
  readonly adapter: string;
  readonly requests: number;
  readonly errors: number;
  readonly activeRequests: number;
}

const metricValue = (metrics: HermesMetricsDTO, adapter: string, name: string): number =>
  metrics.items.find((metric) => metric.name === name && metric.labels.adapter === adapter)
    ?.value ?? 0;

const adapterSummaries = (metrics: HermesMetricsDTO): readonly AdapterSummary[] => {
  const adapters = Array.from(
    new Set(
      metrics.items
        .map((metric) => metric.labels.adapter)
        .filter((adapter): adapter is string => typeof adapter === 'string'),
    ),
  );

  return adapters.map((adapter) => ({
    adapter,
    requests: metricValue(metrics, adapter, 'requests_total'),
    errors: metricValue(metrics, adapter, 'errors_total'),
    activeRequests: metricValue(metrics, adapter, 'active_requests'),
  }));
};

function InventoryCard(props: {
  readonly title: string;
  readonly inventory: HermesModulesDTO;
}): JSX.Element {
  return (
    <div className="space-y-3 rounded-md border bg-card p-4">
      <div>
        <div className="text-xs uppercase tracking-wide text-muted-foreground">{props.title}</div>
        <div className="mt-2 text-2xl font-semibold">{props.inventory.count}</div>
      </div>
      {props.inventory.items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No entries reported.</p>
      ) : (
        <ul className="divide-y rounded-md border">
          {props.inventory.items.map((item) => (
            <li key={item.name} className="flex items-center justify-between gap-3 p-3">
              <div>
                <div className="text-sm font-medium">{item.name}</div>
                {item.detail ? (
                  <div className="text-xs text-muted-foreground">{item.detail}</div>
                ) : null}
              </div>
              <Pill value={item.status} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function AdapterStatus(props: { readonly metrics: HermesMetricsDTO }): JSX.Element {
  const summaries = adapterSummaries(props.metrics);
  return (
    <div className="space-y-3 rounded-md border bg-card p-4">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">Adapter status</div>
      {summaries.length === 0 ? (
        <p className="text-sm text-muted-foreground">No adapter metrics reported.</p>
      ) : (
        <ul className="divide-y rounded-md border">
          {summaries.map((summary) => (
            <li key={summary.adapter} className="grid gap-2 p-3 text-sm sm:grid-cols-4">
              <span className="font-medium">{summary.adapter}</span>
              <span>requests: {summary.requests}</span>
              <span>errors: {summary.errors}</span>
              <span>active: {summary.activeRequests}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function MetricsPreview(props: { readonly metrics: HermesMetricsDTO }): JSX.Element {
  return (
    <div className="space-y-3 rounded-md border bg-card p-4">
      <div>
        <div className="text-xs uppercase tracking-wide text-muted-foreground">Metrics</div>
        <div className="mt-2 text-2xl font-semibold">{props.metrics.count}</div>
      </div>
      {props.metrics.items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No metrics available.</p>
      ) : (
        <div className="overflow-hidden rounded-md border">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Name</th>
                <th className="px-3 py-2 font-medium">Adapter</th>
                <th className="px-3 py-2 font-medium">Type</th>
                <th className="px-3 py-2 font-medium">Value</th>
              </tr>
            </thead>
            <tbody>
              {props.metrics.items.slice(0, 8).map((metric) => (
                <tr key={`${metric.name}:${metric.labels.adapter ?? ''}`} className="border-t">
                  <td className="px-3 py-2 font-mono">{metric.name}</td>
                  <td className="px-3 py-2">{metric.labels.adapter ?? 'system'}</td>
                  <td className="px-3 py-2">{metric.type}</td>
                  <td className="px-3 py-2 font-mono">{metric.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function LiveDashboard(props: { readonly initialSnapshot: DashboardSnapshot }): JSX.Element {
  const [snapshot, setSnapshot] = useState(props.initialSnapshot);
  const [lastUpdatedAt, setLastUpdatedAt] = useState(new Date().toISOString());
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    let active = true;

    const refresh = async (): Promise<void> => {
      setRefreshing(true);
      const next = await fetchDashboardSnapshot();
      if (active) {
        setSnapshot(next);
        setLastUpdatedAt(new Date().toISOString());
        setRefreshing(false);
      }
    };

    const interval = window.setInterval(() => {
      void refresh();
    }, POLL_INTERVAL_MS);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, []);

  const disconnected = isDisconnected(snapshot);
  const statusError = errorFrom(snapshot.status);

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
            <p className="text-sm text-muted-foreground">
              Live read-only view of the Hermes kernel via the API-owned runtime.
            </p>
          </div>
          <div className="rounded-md border bg-card px-3 py-2 text-xs text-muted-foreground">
            {refreshing ? 'Refreshing' : 'Live polling'} every {POLL_INTERVAL_MS / 1000}s · last
            update {lastUpdatedAt}
          </div>
        </div>
      </header>

      {disconnected ? (
        <DisconnectedState
          message={statusError?.message ?? 'Unable to reach the Agent OS API.'}
          requestId={statusError?.requestId}
        />
      ) : null}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Hermes Status</h2>
        {snapshot.status.ok ? (
          <StatusCard status={snapshot.status.data} />
        ) : (
          <ErrorPanel error={snapshot.status.error} />
        )}
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Version</h2>
          {snapshot.version.ok ? (
            <div className="rounded-md border bg-card p-4 text-sm">
              <span className="font-mono">
                {snapshot.version.data.name} @ {snapshot.version.data.version}
              </span>
            </div>
          ) : (
            <ErrorPanel error={snapshot.version.error} />
          )}
        </div>
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Health</h2>
          {snapshot.health.ok ? (
            <HealthGrid report={snapshot.health.data} />
          ) : (
            <ErrorPanel error={snapshot.health.error} />
          )}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Loaded Modules</h2>
          {snapshot.modules.ok ? (
            <ModuleList modules={snapshot.modules.data} />
          ) : (
            <ErrorPanel error={snapshot.modules.error} />
          )}
        </div>
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Loaded Plugins</h2>
          {snapshot.plugins.ok ? (
            <InventoryCard title="Loaded plugins" inventory={snapshot.plugins.data} />
          ) : (
            <ErrorPanel error={snapshot.plugins.error} />
          )}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Adapter Status</h2>
          {snapshot.metrics.ok ? (
            <AdapterStatus metrics={snapshot.metrics.data} />
          ) : (
            <ErrorPanel error={snapshot.metrics.error} />
          )}
        </div>
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Metrics</h2>
          {snapshot.metrics.ok ? (
            <MetricsPreview metrics={snapshot.metrics.data} />
          ) : (
            <ErrorPanel error={snapshot.metrics.error} />
          )}
        </div>
      </section>
    </div>
  );
}
