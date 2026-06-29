'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export interface NavItem {
  readonly href: string;
  readonly label: string;
}

const ITEMS: readonly NavItem[] = [
  { href: '/', label: 'Overview' },
  { href: '/status', label: 'Status' },
  { href: '/health', label: 'Health' },
  { href: '/modules', label: 'Modules' },
  { href: '/config', label: 'Configuration' },
  { href: '/version', label: 'Version' },
];

export function Nav(): JSX.Element {
  const pathname = usePathname();
  return (
    <nav className="border-b bg-background">
      <div className="container flex flex-wrap items-center gap-2 py-3">
        <Link href="/" className="mr-6 text-sm font-semibold tracking-tight">
          Agent OS
        </Link>
        {ITEMS.map((item) => {
          const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={
                active
                  ? 'rounded-md bg-primary px-3 py-1 text-sm text-primary-foreground'
                  : 'rounded-md px-3 py-1 text-sm text-muted-foreground hover:bg-muted'
              }
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
