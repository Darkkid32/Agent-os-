import { cn } from '@agent-os/ui';

const VARIANTS: Record<string, string> = {
  healthy: 'bg-emerald-100 text-emerald-900',
  RUNNING: 'bg-emerald-100 text-emerald-900',
  healthy_module: 'bg-emerald-100 text-emerald-900',
  degraded: 'bg-amber-100 text-amber-900',
  FAILED: 'bg-rose-100 text-rose-900',
  failed: 'bg-rose-100 text-rose-900',
  unknown: 'bg-slate-100 text-slate-900',
  INITIALIZING: 'bg-slate-100 text-slate-900',
  STARTING: 'bg-amber-100 text-amber-900',
  STOPPING: 'bg-amber-100 text-amber-900',
  STOPPED: 'bg-slate-100 text-slate-900',
};

export function Pill(props: { readonly value: string }): JSX.Element {
  const { value } = props;
  const variant = VARIANTS[value] ?? 'bg-slate-100 text-slate-900';
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        variant,
      )}
    >
      {value}
    </span>
  );
}
