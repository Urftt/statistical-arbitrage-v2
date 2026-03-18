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
  IconBinaryTree2,
  IconChartDots3,
  IconClock,
  IconCoinBitcoin,
  IconFlask2,
  IconLayersLinked,
  IconScale,
  IconTarget,
  IconTestPipe,
  IconTimeline,
} from '@tabler/icons-react';
import { usePairContext } from '@/contexts/PairContext';
import type { ComponentType } from 'react';

// ---------------------------------------------------------------------------
// Module definitions
// ---------------------------------------------------------------------------

interface ResearchModule {
  id: string;
  label: string;
  description: string;
  icon: ComponentType<{ size?: number; stroke?: number }>;
  Panel: ComponentType<{ asset1: string; asset2: string; timeframe: string }>;
}

function PanelSkeleton() {
  return (
    <Stack gap="lg" pt="md">
      <Skeleton height={180} radius="xl" animate />
      <Skeleton height={96} radius="md" animate />
      <Skeleton height={360} radius="md" animate />
    </Stack>
  );
}

const RESEARCH_MODULES: ResearchModule[] = [
  {
    id: 'lookback-window',
    label: 'Lookback Window',
    description: 'Sweep rolling lookback windows to find the best z-score calibration.',
    icon: IconBinaryTree2,
    Panel: dynamic(() => import('@/components/research/LookbackSweepPanel'), {
      ssr: false,
      loading: PanelSkeleton,
    }),
  },
  {
    id: 'rolling-stability',
    label: 'Rolling Stability',
    description: 'Track cointegration p-value through time with a sliding window.',
    icon: IconTimeline,
    Panel: dynamic(() => import('@/components/research/RollingStabilityPanel'), {
      ssr: false,
      loading: PanelSkeleton,
    }),
  },
  {
    id: 'oos-validation',
    label: 'OOS Validation',
    description: 'Test whether in-sample cointegration holds on unseen trading data.',
    icon: IconTestPipe,
    Panel: dynamic(() => import('@/components/research/OOSValidationPanel'), {
      ssr: false,
      loading: PanelSkeleton,
    }),
  },
  {
    id: 'timeframe',
    label: 'Timeframe',
    description: 'Compare cointegration strength across 15m, 1h, 4h, and 1d candles.',
    icon: IconClock,
    Panel: dynamic(() => import('@/components/research/TimeframePanel'), {
      ssr: false,
      loading: PanelSkeleton,
    }),
  },
  {
    id: 'spread-method',
    label: 'Spread Method',
    description: 'Evaluate OLS vs ratio spread construction by ADF stationarity.',
    icon: IconLayersLinked,
    Panel: dynamic(() => import('@/components/research/SpreadMethodPanel'), {
      ssr: false,
      loading: PanelSkeleton,
    }),
  },
  {
    id: 'zscore-threshold',
    label: 'Z-Score Threshold',
    description: 'Sweep entry/exit thresholds and hand off the best combo to the backtester.',
    icon: IconTarget,
    Panel: dynamic(() => import('@/components/research/ZScoreThresholdPanel'), {
      ssr: false,
      loading: PanelSkeleton,
    }),
  },
  {
    id: 'tx-cost',
    label: 'Transaction Cost',
    description: 'See how fee levels erode profitability — with the Bitvavo fee marked.',
    icon: IconCoinBitcoin,
    Panel: dynamic(() => import('@/components/research/TxCostPanel'), {
      ssr: false,
      loading: PanelSkeleton,
    }),
  },
  {
    id: 'coint-method',
    label: 'Coint. Method',
    description: 'Compare Engle-Granger and Johansen for unanimous cointegration verdict.',
    icon: IconScale,
    Panel: dynamic(() => import('@/components/research/CointMethodPanel'), {
      ssr: false,
      loading: PanelSkeleton,
    }),
  },
];

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default function ResearchPage() {
  const { asset1, asset2, timeframe, error: pairError } = usePairContext();

  return (
    <Container size="xl" py="md">
      <Stack gap="lg">
        {/* Header */}
        <div>
          <Group gap="md" mb="xs">
            <Title order={2}>Research Hub</Title>
            <Badge variant="light" color="teal">
              8 modules
            </Badge>
            {asset1 && asset2 ? (
              <Badge variant="outline" color="blue">
                {asset1}/EUR × {asset2}/EUR · {timeframe}
              </Badge>
            ) : null}
          </Group>
          <Text c="dimmed" size="sm">
            Run diagnostic and handoff research modules, read takeaways, and jump
            into the backtester with shareable presets.
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
            unlock live research modules.
          </Alert>
        ) : null}

        {/* Tabbed module picker */}
        <Tabs defaultValue="lookback-window" keepMounted={false}>
          <Tabs.List mb="md" style={{ overflowX: 'auto' }}>
            {RESEARCH_MODULES.map((mod) => (
              <Tabs.Tab
                key={mod.id}
                value={mod.id}
                leftSection={<mod.icon size={16} stroke={1.5} />}
                data-research-tab={mod.id}
              >
                {mod.label}
              </Tabs.Tab>
            ))}
          </Tabs.List>

          {RESEARCH_MODULES.map((mod) => (
            <Tabs.Panel
              key={mod.id}
              value={mod.id}
              data-research-module={mod.id}
            >
              <mod.Panel
                asset1={asset1}
                asset2={asset2}
                timeframe={timeframe}
              />
            </Tabs.Panel>
          ))}
        </Tabs>
      </Stack>
    </Container>
  );
}
