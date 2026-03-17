'use client';

import {
  Badge,
  Group,
  List,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { IconCoin } from '@tabler/icons-react';
import { usePairContext } from '@/contexts/PairContext';
import { EducationalPanel } from './EducationalPanel';

// ---------------------------------------------------------------------------
// Curated pair suggestions
// ---------------------------------------------------------------------------

interface PairSuggestion {
  asset1: string;
  asset2: string;
  label: string;
  badge: string;
  badgeColor: string;
  description: string;
}

const CURATED_PAIRS: PairSuggestion[] = [
  {
    asset1: 'BTC',
    asset2: 'ETH',
    label: 'BTC/EUR × ETH/EUR',
    badge: 'Cointegrated',
    badgeColor: 'green',
    description:
      'The two largest crypto assets. Strongly correlated, often cointegrated at 4h timeframe. A good first pair.',
  },
  {
    asset1: 'SOL',
    asset2: 'AVAX',
    label: 'SOL/EUR × AVAX/EUR',
    badge: 'Try it',
    badgeColor: 'blue',
    description:
      'Layer-1 competitors. Similar market dynamics but less established relationship — may or may not be cointegrated.',
  },
  {
    asset1: 'BTC',
    asset2: 'DOGE',
    label: 'BTC/EUR × DOGE/EUR',
    badge: 'Likely fails',
    badgeColor: 'orange',
    description:
      'Very different assets — BTC is a store of value, DOGE is a meme coin. Expect the cointegration test to fail. That\'s educational too!',
  },
];

// ---------------------------------------------------------------------------
// Timeframe cards
// ---------------------------------------------------------------------------

interface TimeframeInfo {
  value: string;
  variant: 'outline' | 'filled';
  description: string;
}

const TIMEFRAMES: TimeframeInfo[] = [
  {
    value: '15m',
    variant: 'outline',
    description: 'Intraday scalping. Many data points, noisy signals.',
  },
  {
    value: '1h',
    variant: 'outline',
    description: 'Short-term trading. Good balance of data and noise.',
  },
  {
    value: '4h',
    variant: 'filled',
    description:
      'Recommended start. Enough data for reliable stats, practical for swing trading.',
  },
  {
    value: '1d',
    variant: 'outline',
    description: 'Position trading. Fewer data points, smoother signals.',
  },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Step 1 of the Academy — static pair selection guidance.
 *
 * Shows curated pair suggestion cards that set the global PairContext on click,
 * timeframe guidance, a learning roadmap, and a 3-layer educational panel.
 * No API data dependency — entirely static content.
 */
export function StepPairSelector() {
  const { setAsset1, setAsset2 } = usePairContext();

  const handlePairSelect = (pair: PairSuggestion) => {
    setAsset1(pair.asset1);
    setAsset2(pair.asset2);
  };

  return (
    <Paper shadow="sm" p="xl" radius="md" withBorder>
      <Stack gap="lg">
        {/* ── Intro ── */}
        <Group gap="sm">
          <IconCoin size={28} stroke={1.5} color="var(--mantine-color-blue-5)" />
          <div>
            <Title order={3}>Select Your Pair</Title>
            <Text c="dimmed" size="sm">
              Choose two assets to analyze
            </Text>
          </div>
        </Group>

        <Text size="sm">
          Statistical arbitrage starts with finding two assets whose prices are
          linked. This flow walks you through the full pipeline: from picking a
          pair to understanding when to trade.
        </Text>

        {/* ── Curated pair cards ── */}
        <div>
          <Title order={5} mb="xs">
            Suggested starting pairs
          </Title>
          <Text size="sm" c="dimmed" mb="sm">
            Use the dropdowns above to select a pair, or try one of these:
          </Text>

          <SimpleGrid cols={{ base: 1, sm: 3 }}>
            {CURATED_PAIRS.map((pair) => (
              <Paper
                key={pair.label}
                p="sm"
                radius="md"
                withBorder
                bg="dark.7"
                style={{ cursor: 'pointer' }}
                onClick={() => handlePairSelect(pair)}
              >
                <Text size="sm" fw={600}>
                  {pair.label}
                </Text>
                <Badge
                  color={pair.badgeColor}
                  variant="light"
                  size="sm"
                  mt={4}
                >
                  {pair.badge}
                </Badge>
                <Text size="xs" c="dimmed" mt={4}>
                  {pair.description}
                </Text>
              </Paper>
            ))}
          </SimpleGrid>
        </div>

        {/* ── Timeframe guidance ── */}
        <div>
          <Title order={5} mb="xs">
            Choosing a timeframe
          </Title>
          <Text size="sm" mb="sm">
            The timeframe controls the candle size of your price data. It affects
            how many data points you have and what kind of trading strategy would
            be practical:
          </Text>

          <SimpleGrid cols={{ base: 2, sm: 4 }}>
            {TIMEFRAMES.map((tf) => (
              <Stack key={tf.value} gap={4} align="center">
                <Badge
                  color="blue"
                  variant={tf.variant}
                  size="lg"
                  fullWidth
                >
                  {tf.value}
                </Badge>
                <Text size="xs" c="dimmed" ta="center">
                  {tf.description}
                </Text>
              </Stack>
            ))}
          </SimpleGrid>
        </div>

        {/* ── Learning roadmap ── */}
        <div>
          <Title order={5} mb="sm">
            What you&apos;ll learn
          </Title>
          <List size="sm" spacing="xs">
            <List.Item>How to visually compare two asset prices</List.Item>
            <List.Item>
              How to test whether prices are statistically linked (cointegration)
            </List.Item>
            <List.Item>
              How to construct and analyze the spread between them
            </List.Item>
            <List.Item>
              How to use z-scores to generate trading signals
            </List.Item>
          </List>
        </div>

        {/* ── Educational panel ── */}
        <EducationalPanel
          intuition={
            <Text size="sm">
              Imagine two dogs on leashes held by the same person walking down the
              street. They wander around individually, but they can&apos;t get too
              far apart. That&apos;s what we&apos;re looking for — two asset
              prices that may wander but stay tethered.
            </Text>
          }
          mechanics={
            <Text size="sm">
              Price comparison normalizes both assets to a common base (100) so
              you can see how they move relative to each other, regardless of their
              actual price levels. We also compute the Pearson correlation
              coefficient.
            </Text>
          }
          pairSpecific={
            <Text size="sm" c="dimmed">
              Select a pair above to see how your chosen assets move together.
            </Text>
          }
        />
      </Stack>
    </Paper>
  );
}
