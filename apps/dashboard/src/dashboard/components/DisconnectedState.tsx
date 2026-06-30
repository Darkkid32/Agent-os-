export function DisconnectedState(props: {
  readonly message: string;
  readonly requestId?: string | undefined;
}): JSX.Element {
  return (
    <div className="rounded-md border border-amber-300 bg-amber-50 p-4 text-amber-950">
      <div className="text-sm font-semibold">Disconnected</div>
      <p className="mt-2 text-sm">{props.message}</p>
      {props.requestId ? (
        <p className="mt-2 text-xs text-amber-800">requestId: {props.requestId}</p>
      ) : null}
    </div>
  );
}
