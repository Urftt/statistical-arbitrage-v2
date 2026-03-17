'use client';

import {
  Group,
  Select,
  Text,
  ThemeIcon,
} from '@mantine/core';
import {
  IconChartCandle,
  IconCoin,
  IconClock,
} from '@tabler/icons-react';

const TIMEFRAME_OPTIONS = ['15m', '1h', '4h', '1d'];

/**
 * Dashboard header with logo and placeholder pair selectors.
 *
 * The selectors are inert placeholders — T03 wires them to PairContext
 * and populates asset lists from the FastAPI /api/pairs endpoint.
 */
export function Header() {
  return (
    <Group justify="space-between" h="100%" px="md">
      {/* Logo */}
      <Group gap="sm">
        <ThemeIcon
          size="lg"
          radius="md"
          variant="gradient"
          gradient={{ from: 'blue', to: 'cyan', deg: 45 }}
        >
          <IconChartCandle size={22} stroke={1.5} />
        </ThemeIcon>
        <Text fw={700} size="lg" style={{ letterSpacing: '-0.3px' }}>
          StatArb Research
        </Text>
      </Group>

      {/* Pair selectors (placeholder — wired in T03) */}
      <Group gap="xs">
        <Select
          placeholder="Asset 1"
          searchable
          w={160}
          size="sm"
          leftSection={<IconCoin size={16} stroke={1.5} />}
          data={[]}
        />
        <Text c="dimmed" size="lg">
          ×
        </Text>
        <Select
          placeholder="Asset 2"
          searchable
          w={160}
          size="sm"
          leftSection={<IconCoin size={16} stroke={1.5} />}
          data={[]}
        />
        <Select
          placeholder="Timeframe"
          w={100}
          size="sm"
          leftSection={<IconClock size={16} stroke={1.5} />}
          data={TIMEFRAME_OPTIONS}
          defaultValue="1h"
        />
      </Group>
    </Group>
  );
}
