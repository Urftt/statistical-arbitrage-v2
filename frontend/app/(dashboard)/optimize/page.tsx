'use client';

import dynamic from 'next/dynamic';
import {
  Alert,
  Badge,
  Container,
  Group,
  Skeleton,
  Stack,
  Tabs,
  Text,
  Title,
} from '@mantine/core';
import {
  IconAlertTriangle,
  IconFlask2,
  IconGridDots,
  IconTimeline,
} from '@tabler/icons-react';
import { usePairContext } from '@/contexts/PairContext';

// ---------------------------------------------------------------------------
// Lazy-load panels (Plotly requires SSR=false)
// ---------------------------------------------------------------------------

function PanelSkeleton() {
  return (
    <Stack gap="lg" pt="md">
      <Skeleton height={200} radius="xl" animate />
      <Skeleton height={96} radius="md" animate />
      <Skeleton height={400} radius="md" animate />
    </Stack>
  );
}

const GridSearchPanel = dynamic(
  () => import('@/components/optimize/GridSearchPanel'),
  { ssr: false, loading: PanelSkeleton }
);

const WalkForwardPanel = dynamic(
  () => import('@/components/optimize/WalkForwardPanel'),
  { ssr: false, loading: PanelSkeleton }
);

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function OptimizePage() {
  const { asset1, asset2, timeframe, error: pairError } = usePairContext();

  return (
    <Container size="xl" py="md">
      <Stack gap="lg">
        {/* Header */}
        <div>
          <Group gap="md" mb="xs">
            <Title order={2}>Optimize</Title>
            <Badge variant="light" color="indigo">
              2 modes
            </Badge>
            {asset1 && asset2 ? (
              <Badge variant="outline" color="blue">
                {asset1}/EUR × {asset2}/EUR · {timeframe}
              </Badge>
            ) : null}
          </Group>
          <Text c="dimmed" size="sm">
            Search the strategy parameter space with bounded grid search, then
            validate robustness with rolling walk-forward analysis. Both modes
            surface overfitting and fragility warnings inline.
          </Text>
        </div>

        {pairError ? (
          <Alert
            color="red"
            title="Pair metadata failed to load"
            icon={<IconAlertTriangle size={18} />}
          >
            {pairError}
          </Alert>
        ) : null}

        {!asset1 || !asset2 ? (
          <Alert
            color="blue"
            variant="light"
            radius="lg"
            icon={<IconFlask2 size={18} />}
          >
            Select asset 1, asset 2, and timeframe in the dashboard header to
            unlock optimization modules.
          </Alert>
        ) : null}

        {/* Tabbed panel picker */}
        <Tabs defaultValue="grid-search" keepMounted={false}>
          <Tabs.List mb="md">
            <Tabs.Tab
              value="grid-search"
              leftSection={<IconGridDots size={16} stroke={1.5} />}
              data-optimize-tab="grid-search"
            >
              Grid Search
            </Tabs.Tab>
            <Tabs.Tab
              value="walk-forward"
              leftSection={<IconTimeline size={16} stroke={1.5} />}
              data-optimize-tab="walk-forward"
            >
              Walk-Forward
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="grid-search" data-optimize-panel="grid-search">
            <GridSearchPanel />
          </Tabs.Panel>

          <Tabs.Panel value="walk-forward" data-optimize-panel="walk-forward">
            <WalkForwardPanel />
          </Tabs.Panel>
        </Tabs>
      </Stack>
    </Container>
  );
}
