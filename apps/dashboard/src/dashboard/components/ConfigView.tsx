import type { HermesConfigDTO } from '../api/types';

export function ConfigView(props: { readonly config: HermesConfigDTO }): JSX.Element {
  const { config } = props;
  const rows: ReadonlyArray<readonly [string, string]> = [
    ['NODE_ENV', config.nodeEnv],
    ['LOG_LEVEL', config.logLevel],
    ['OPENROUTER_API_KEY', config.openrouterApiKey],
    ['DATABASE_URL', config.databaseUrl],
    ['REDIS_URL', config.redisUrl],
    ['OTEL_ENABLED', String(config.otelEnabled)],
    ['OTEL_EXPORTER_ENDPOINT', config.otelExporterEndpoint ?? '—'],
    ['HERMES_MODULES_DIR', config.hermesModulesDir],
    ['HERMES_SHUTDOWN_TIMEOUT_MS', String(config.hermesShutdownTimeoutMs)],
  ];

  return (
    <div className="overflow-hidden rounded-md border bg-card">
      <table className="w-full text-sm">
        <tbody>
          {rows.map(([k, v]) => (
            <tr key={k} className="border-b last:border-b-0">
              <td className="w-64 px-4 py-2 font-mono text-xs text-muted-foreground">{k}</td>
              <td className="px-4 py-2 font-mono text-xs">{v}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
