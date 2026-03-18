'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Box, Divider, NavLink, Stack, Text } from '@mantine/core';
import {
  IconAdjustments,
  IconChartHistogram,
  IconChartLine,
  IconMicroscope,
  IconSchool,
  IconSearch,
  IconVocabulary,
} from '@tabler/icons-react';

/** Sidebar navigation items matching the Dash app layout plus M002 flows. */
const NAV_ITEMS = [
  {
    label: 'Pair Scanner',
    href: '/scanner',
    icon: IconSearch,
    description: 'Batch cointegration scan',
  },
  {
    label: 'Pair Deep Dive',
    href: '/deep-dive',
    icon: IconMicroscope,
    description: 'Single pair analysis',
  },
  {
    label: 'Research',
    href: '/research',
    icon: IconChartHistogram,
    description: 'Live module + handoff',
  },
  {
    label: 'Backtest',
    href: '/backtest',
    icon: IconChartLine,
    description: 'Real engine results',
  },
  {
    label: 'Optimize',
    href: '/optimize',
    icon: IconAdjustments,
    description: 'Grid search & walk-forward',
  },
] as const;

const ACADEMY_ITEMS = [
  {
    label: 'Academy',
    href: '/academy',
    icon: IconSchool,
    description: 'Step-by-step guide',
  },
  {
    label: 'Glossary',
    href: '/glossary',
    icon: IconVocabulary,
    description: 'Stat arb terms',
  },
] as const;

export function Sidebar() {
  const pathname = usePathname();

  return (
    <Stack gap={0} p="sm" style={{ height: '100%' }}>
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.href}
          component={Link}
          href={item.href}
          label={item.label}
          description={item.description}
          leftSection={<item.icon size={18} stroke={1.5} />}
          active={pathname === item.href}
          variant="light"
        />
      ))}

      <Divider my="xs" />

      {ACADEMY_ITEMS.map((item) => (
        <NavLink
          key={item.href}
          component={Link}
          href={item.href}
          label={item.label}
          description={item.description}
          leftSection={<item.icon size={18} stroke={1.5} />}
          active={pathname === item.href}
          variant="light"
        />
      ))}

      <Box style={{ flex: 1 }} />

      <Divider my="xs" />

      <Text size="xs" c="dimmed" ta="center" py="xs">
        StatArb Research v0.2
      </Text>
    </Stack>
  );
}
