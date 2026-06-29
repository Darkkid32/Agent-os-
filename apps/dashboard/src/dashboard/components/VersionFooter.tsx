import type { HermesVersionDTO } from '../api/types';

export function VersionFooter(props: { readonly version: HermesVersionDTO }): JSX.Element {
  const { version } = props;
  return (
    <footer className="border-t py-6 text-xs text-muted-foreground">
      <div className="container flex flex-wrap items-center justify-between gap-2">
        <span>
          {version.name} @ {version.version}
        </span>
        <span>Agent OS — read-only dashboard.</span>
      </div>
    </footer>
  );
}
