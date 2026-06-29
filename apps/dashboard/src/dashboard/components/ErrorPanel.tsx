export interface ErrorViewModel {
  readonly code: string;
  readonly message: string;
  readonly requestId?: string;
  readonly detail?: unknown;
}

export function ErrorPanel(props: { readonly error: ErrorViewModel }): JSX.Element {
  const { error } = props;
  return (
    <div className="rounded-md border border-rose-200 bg-rose-50 p-4 text-rose-900">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <span>Error</span>
        <code className="rounded bg-rose-100 px-2 py-0.5 text-xs">{error.code}</code>
      </div>
      <p className="mt-2 text-sm">{error.message}</p>
      {error.requestId ? (
        <p className="mt-2 text-xs text-rose-700">requestId: {error.requestId}</p>
      ) : null}
    </div>
  );
}
