import { Pill } from './Pill';
import type { HermesHealthReportDTO } from '../api/types';

export function HealthGrid(props: { readonly report: HermesHealthReportDTO }): JSX.Element {
  const { report } = props;
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Aggregate</span>
        <Pill value={report.status} />
      </div>
      {report.modules.length === 0 ? (
        <div className="rounded-md border bg-card p-4 text-sm text-muted-foreground">
          No modules registered.
        </div>
      ) : (
        <ul className="divide-y rounded-md border bg-card">
          {report.modules.map((m) => (
            <li key={m.name} className="flex items-center justify-between gap-3 p-3">
              <div>
                <div className="text-sm font-medium">{m.name}</div>
                {m.detail ? <div className="text-xs text-muted-foreground">{m.detail}</div> : null}
              </div>
              <Pill value={m.status} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
