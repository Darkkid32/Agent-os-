'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export interface NavItem {
  readonly href: string;
  readonly label: string;
  readonly group: string;
}

const ITEMS: readonly NavItem[] = [
  { href: '/', label: 'Overview', group: 'control' },
  { href: '/status', label: 'Status', group: 'control' },
  { href: '/health', label: 'Health', group: 'control' },
  { href: '/agents', label: 'Agents', group: 'operations' },
  { href: '/missions', label: 'Missions', group: 'operations' },
  { href: '/plans', label: 'Plans', group: 'operations' },
  { href: '/memory', label: 'Memory', group: 'knowledge' },
  { href: '/knowledge', label: 'Knowledge', group: 'knowledge' },
  { href: '/tools', label: 'Tools', group: 'capabilities' },
  { href: '/skills', label: 'Skills', group: 'capabilities' },
  { href: '/models', label: 'Models', group: 'capabilities' },
  { href: '/plugins', label: 'Plugins', group: 'system' },
  { href: '/logs', label: 'Logs', group: 'system' },
  { href: '/metrics', label: 'Metrics', group: 'system' },
  { href: '/config', label: 'Config', group: 'system' },
  { href: '/version', label: 'Version', group: 'system' },
];

const GROUPS: readonly { readonly key: string; readonly label: string }[] = [
  { key: 'control', label: 'Control' },
  { key: 'operations', label: 'Operations' },
  { key: 'knowledge', label: 'Knowledge' },
  { key: 'capabilities', label: 'Capabilities' },
  { key: 'system', label: 'System' },
];

export function Nav(): JSX.Element {
  const pathname = usePathname();
  return (
    <nav className="border-b bg-background">
      <div className="container flex flex-wrap items-center gap-1 py-3">
        <Link href="/" className="mr-4 text-sm font-semibold tracking-tight">
          Mission Control
        </Link>
        {GROUPS.map((group) => {
          const groupItems = ITEMS.filter((item) => item.group === group.key);
          if (groupItems.length === 0) return null;
          return (
            <div key={group.key} className="flex items-center gap-1">
              <span className="text-xs text-muted-foreground px-1">{group.label}</span>
              {groupItems.map((item) => {
                const active =
                  item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={
                      active
                        ? 'rounded-md bg-primary px-2 py-1 text-xs text-primary-foreground'
                        : 'rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-muted'
                    }
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          );
        })}
      </div>
    </nav>
  );
}
