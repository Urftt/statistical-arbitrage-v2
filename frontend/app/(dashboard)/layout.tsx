'use client';

import { useEffect, useState } from 'react';
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
 *
 * Mantine generates runtime ids/classNames for several layout primitives.
 * Rendering the shell only after mount keeps the server and initial client tree
 * identical, which avoids hydration mismatch noise during local UAT.
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

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
