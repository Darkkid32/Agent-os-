import { Pill } from './Pill';
import type { HermesStatusDTO } from '../api/types';

export function StatusCard(props: { readonly status: HermesStatusDTO }): JSX.Element {
  const { status } = props;
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <div className="rounded-md border bg-card p-4 text-card-foreground">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">Phase</div>
        <div className="mt-2 flex items-center gap-2">
          <Pill value={status.phase} />
        </div>
      </div>
      <div className="rounded-md border bg-card p-4 text-card-foreground">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">Uptime</div>
        <div className="mt-2 text-2xl font-semibold">{status.uptime} ms</div>
      </div>
      <div className="rounded-md border bg-card p-4 text-card-foreground">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">Modules</div>
        <div className="mt-2 text-2xl font-semibold">{status.modules}</div>
      </div>
    </div>
  );
}
