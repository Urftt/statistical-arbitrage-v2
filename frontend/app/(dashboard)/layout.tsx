'use client';

import { AppShell } from '@mantine/core';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';

/**
 * Dashboard layout wrapping all pages in a Mantine AppShell.
 *
 * Matches the existing Dash app: 60px header, 240px navbar, "lg" padding.
 * The `(dashboard)` route group maps to `/` without adding a URL segment.
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{ width: 240, breakpoint: 0 }}
      padding="lg"
    >
      <AppShell.Header>
        <Header />
      </AppShell.Header>
      <AppShell.Navbar>
        <Sidebar />
      </AppShell.Navbar>
      <AppShell.Main>{children}</AppShell.Main>
    </AppShell>
  );
}
