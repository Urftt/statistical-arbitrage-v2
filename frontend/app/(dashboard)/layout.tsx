'use client';

import { AppShell } from '@mantine/core';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { PairProvider } from '@/contexts/PairContext';

/**
 * Dashboard layout wrapping all pages in a Mantine AppShell.
 *
 * Matches the existing Dash app: 60px header, 240px navbar, "lg" padding.
 * The `(dashboard)` route group maps to `/` without adding a URL segment.
 *
 * `PairProvider` wraps the entire shell so header selects and all pages
 * share the same global pair/timeframe state.
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PairProvider>
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
    </PairProvider>
  );
}
