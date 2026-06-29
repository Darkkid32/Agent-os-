import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import './globals.css';
import { Nav } from '../dashboard/components/Nav';

export const metadata: Metadata = {
  title: 'Agent OS Dashboard',
  description: 'Operator dashboard for the Agent OS platform.',
};

export default function RootLayout({ children }: { readonly children: ReactNode }): JSX.Element {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans antialiased">
        <Nav />
        <main className="container py-8">{children}</main>
      </body>
    </html>
  );
}
