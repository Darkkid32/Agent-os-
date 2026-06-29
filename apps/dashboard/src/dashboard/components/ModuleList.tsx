export interface ModuleListViewModel {
  readonly count: number;
}

export function ModuleList(props: { readonly modules: ModuleListViewModel }): JSX.Element {
  const { modules } = props;
  return (
    <div className="rounded-md border bg-card p-4">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">
        Registered modules
      </div>
      <div className="mt-2 text-2xl font-semibold">{modules.count}</div>
      <p className="mt-2 text-sm text-muted-foreground">
        Module detail view lands when the kernel exposes a module-readout port.
      </p>
    </div>
  );
}
