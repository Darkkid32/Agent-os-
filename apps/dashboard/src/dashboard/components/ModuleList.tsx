import { Pill } from './Pill';
import type { HermesModulesDTO } from '../api/types';

export function ModuleList(props: { readonly modules: HermesModulesDTO }): JSX.Element {
  const { modules } = props;
  return (
    <div className="space-y-3 rounded-md border bg-card p-4">
      <div>
        <div className="text-xs uppercase tracking-wide text-muted-foreground">
          Registered modules
        </div>
        <div className="mt-2 text-2xl font-semibold">{modules.count}</div>
      </div>
      {modules.items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No module details reported.</p>
      ) : (
        <ul className="divide-y rounded-md border">
          {modules.items.map((module) => (
            <li key={module.name} className="flex items-center justify-between gap-3 p-3">
              <div>
                <div className="text-sm font-medium">{module.name}</div>
                {module.detail ? (
                  <div className="text-xs text-muted-foreground">{module.detail}</div>
                ) : null}
              </div>
              <Pill value={module.status} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
