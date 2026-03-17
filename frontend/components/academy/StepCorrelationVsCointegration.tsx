'use client';

import { useMemo } from 'react';
import {
  Alert,
  Badge,
  Divider,
  Group,
  List,
  Paper,
  Skeleton,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { IconArrowsShuffle, IconInfoCircle } from '@tabler/icons-react';
import PlotlyChart from '@/components/charts/PlotlyChart';
import { GlossaryLink } from '@/components/glossary/GlossaryLink';
import { EducationalPanel } from './EducationalPanel';
import type { CointegrationResponse } from '@/lib/api';
import type { Data, Layout } from 'plotly.js';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface StepCorrelationVsCointegrationProps {
  cointegrationData: CointegrationResponse | null;
  loading: boolean;
  asset1: string;
  asset2: string;
}

// ---------------------------------------------------------------------------
// Deterministic PRNG — avoids Math.random() hydration mismatches in SSR
// ---------------------------------------------------------------------------

function seededRandom(seedStr: string) {
  let seed = 0;
  for (let i = 0; i < seedStr.length; i++) {
    seed = (seed * 31 + seedStr.charCodeAt(i)) | 0;
  }
  return () => {
    seed = (seed * 16807 + 12345) & 0x7fffffff;
    return (seed / 0x7fffffff) * 2 - 1;
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Return a Mantine color name based on |r| correlation strength. */
function correlationColor(r: number): string {
  const abs = Math.abs(r);
  if (abs >= 0.7) return 'green';
  if (abs >= 0.3) return 'yellow';
  return 'red';
}

// ---------------------------------------------------------------------------
// Dark template axis styles (PlotlyChart only merges xaxis/yaxis, not xaxis2/yaxis2)
// ---------------------------------------------------------------------------

const DARK_AXIS_STYLE = {
  gridcolor: 'rgba(55, 58, 64, 0.8)',
  zerolinecolor: 'rgba(55, 58, 64, 0.8)',
  title: { font: { color: '#909296' } },
  tickfont: { color: '#909296' },
} as const;

// ---------------------------------------------------------------------------
// Concept chart — synthetic data, always deterministic
// ---------------------------------------------------------------------------

function useConceptChart() {
  return useMemo(() => {
    const n = 300;
    const x = Array.from({ length: n }, (_, i) => i);

    // ── Left subplot: Correlated random walks that drift apart ──────────
    const rng1a = seededRandom('concept-walk-a');
    const rng1b = seededRandom('concept-walk-b');
    const rngShared = seededRandom('concept-shared');

    const walkA: number[] = [100];
    const walkB: number[] = [100];
    for (let i = 1; i < n; i++) {
      // Shared component creates correlation; independent components create divergence
      const shared = rngShared() * 0.005;
      const returnA = 0.0002 + shared + rng1a() * 0.008;
      const returnB = 0.0002 + shared + rng1b() * 0.008;
      walkA.push(walkA[i - 1] * (1 + returnA));
      walkB.push(walkB[i - 1] * (1 + returnB));
    }

    // ── Right subplot: Cointegrated pair (shared trend + mean-reverting spread) ──
    const rngTrend = seededRandom('concept-trend');
    const rngNoiseA = seededRandom('concept-noise-a');
    const rngNoiseB = seededRandom('concept-noise-b');

    const trend: number[] = [0];
    for (let i = 1; i < n; i++) {
      trend.push(trend[i - 1] + 0.001 + rngTrend() * 0.02);
    }

    const cointARaw: number[] = [];
    const cointBRaw: number[] = [];
    for (let i = 0; i < n; i++) {
      cointARaw.push(100 + trend[i] + rngNoiseA() * 0.3);
      cointBRaw.push(50 + 0.5 * trend[i] + rngNoiseB() * 0.3);
    }

    // Normalize both to base 100
    const baseA = cointARaw[0];
    const baseB = cointBRaw[0];
    const cointA = cointARaw.map((v) => (v / baseA) * 100);
    const cointB = cointBRaw.map((v) => (v / baseB) * 100);

    // ── Traces ───────────────────────────────────────────────────────────

    const traces: Data[] = [
      // Left subplot — correlated walks
      {
        x,
        y: walkA,
        type: 'scatter' as const,
        mode: 'lines' as const,
        name: 'Asset A',
        line: { width: 1.5, color: '#339AF0' },
        xaxis: 'x',
        yaxis: 'y',
        showlegend: false,
      },
      {
        x,
        y: walkB,
        type: 'scatter' as const,
        mode: 'lines' as const,
        name: 'Asset B',
        line: { width: 1.5, color: '#51CF66' },
        xaxis: 'x',
        yaxis: 'y',
        showlegend: false,
      },
      // Right subplot — cointegrated pair
      {
        x,
        y: cointA,
        type: 'scatter' as const,
        mode: 'lines' as const,
        name: 'Asset C',
        line: { width: 1.5, color: '#339AF0' },
        xaxis: 'x2',
        yaxis: 'y2',
        showlegend: false,
      },
      {
        x,
        y: cointB,
        type: 'scatter' as const,
        mode: 'lines' as const,
        name: 'Asset D',
        line: { width: 1.5, color: '#51CF66' },
        xaxis: 'x2',
        yaxis: 'y2',
        showlegend: false,
      },
    ];

    // ── Layout with manual dual-axis positioning ─────────────────────────

    const subplotLayout: Partial<Layout> = {
      height: 350,
      margin: { t: 60, b: 40, l: 56, r: 24 },
      xaxis: {
        domain: [0, 0.45],
        title: { text: 'Time' },
      },
      xaxis2: {
        ...DARK_AXIS_STYLE,
        domain: [0.55, 1],
        title: { text: 'Time', font: { color: '#909296' } },
      },
      yaxis: {
        title: { text: 'Normalized Price' },
        anchor: 'x' as const,
      },
      yaxis2: {
        anchor: 'x2' as const,
        ...DARK_AXIS_STYLE,
      },
      annotations: [
        {
          text: '<b>Correlated but NOT Cointegrated</b>',
          xref: 'paper',
          yref: 'paper',
          x: 0.225,
          y: 1.12,
          showarrow: false,
          font: { size: 13, color: '#C1C2C5' },
        },
        {
          text: '<b>Cointegrated</b>',
          xref: 'paper',
          yref: 'paper',
          x: 0.775,
          y: 1.12,
          showarrow: false,
          font: { size: 13, color: '#C1C2C5' },
        },
      ],
    };

    return { traces, subplotLayout };
  }, []);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function StepCorrelationVsCointegration({
  cointegrationData,
  loading,
  asset1,
  asset2,
}: StepCorrelationVsCointegrationProps) {
  const { traces, subplotLayout } = useConceptChart();

  const hasPair = Boolean(asset1 && asset2);
  const corr = cointegrationData?.correlation ?? null;
  const isCoint = cointegrationData?.is_cointegrated ?? null;
  const pVal = cointegrationData?.p_value ?? null;

  return (
    <Paper shadow="sm" p="xl" radius="md" withBorder>
      <Stack gap="lg">
        {/* Step header */}
        <Group gap="sm">
          <IconArrowsShuffle
            size={28}
            stroke={1.5}
            color="var(--mantine-color-blue-5)"
          />
          <div>
            <Title order={3}>Correlation vs Cointegration</Title>
            <Text c="dimmed" size="sm">
              Why correlation isn&apos;t enough — and what cointegration adds
            </Text>
          </div>
        </Group>

        {/* Concept chart — always rendered with synthetic data */}
        <PlotlyChart data={traces} layout={subplotLayout} />

        {/* Pair comparison section */}
        <PairComparisonSection
          hasPair={hasPair}
          loading={loading}
          cointegrationData={cointegrationData}
          corr={corr}
          isCoint={isCoint}
          pVal={pVal}
          asset1={asset1}
          asset2={asset2}
        />

        {/* Educational panel */}
        <EducationalPanel
          intuition={
            <Text size="sm">
              Two people might both go to the same restaurant every Friday —
              that&apos;s correlation. But if they always split the bill evenly,
              there&apos;s a structural link between their tabs — that&apos;s
              cointegration. The bill-splitting constraint means their
              individual tabs can&apos;t drift too far apart, even though each
              person orders different things.
              <br />
              <br />
              For trading: correlated assets move in the same direction, but the
              gap between them can grow forever. Cointegrated assets have a gap
              that snaps back — and that snap-back is your trade.
            </Text>
          }
          mechanics={
            <Stack gap="xs">
              <Text size="sm">
                <GlossaryLink term="correlation">Correlation</GlossaryLink>{' '}
                measures co-movement of returns (short-term direction).{' '}
                <GlossaryLink term="cointegration">Cointegration</GlossaryLink>{' '}
                measures whether a linear combination of prices is stationary
                (long-term equilibrium).
              </Text>
              <Text size="sm" fw={500}>
                Key differences:
              </Text>
              <List size="sm" spacing="xs">
                <List.Item>
                  Correlation can change over time; cointegration is a
                  structural property
                </List.Item>
                <List.Item>
                  High correlation ≠ cointegration (random walks can be
                  correlated)
                </List.Item>
                <List.Item>
                  Low correlation ≠ no cointegration (mean-reverting spreads
                  can have low return correlation)
                </List.Item>
                <List.Item>
                  Cointegration gives you a tradeable spread; correlation alone
                  does not
                </List.Item>
              </List>
              <Text size="sm" c="dimmed">
                The Engle-Granger test (next step) formally tests whether the
                spread between two assets is stationary — i.e., whether it
                always reverts to a mean.
              </Text>
            </Stack>
          }
          pairSpecific={
            corr !== null && isCoint !== null && pVal !== null ? (
              <Stack gap="xs">
                <Text size="sm">
                  {asset1} × {asset2}: correlation = {corr.toFixed(3)},
                  cointegrated = {isCoint ? 'Yes' : 'No'} (p ={' '}
                  {pVal.toFixed(4)})
                </Text>
                <Text size="sm" c="dimmed">
                  {corr > 0.5 && !isCoint
                    ? 'A high correlation with no cointegration means these assets move together in the short term but can drift apart permanently — risky for pairs trading. Cointegration means the gap always snaps back — that\'s the edge.'
                    : isCoint
                      ? 'This pair passes both tests — strong correlation AND cointegration. The spread between them is statistically mean-reverting.'
                      : 'The next step dives into the actual cointegration test mechanics.'}
                </Text>
              </Stack>
            ) : (
              <Text size="sm" c="dimmed">
                Select a pair to see the comparison.
              </Text>
            )
          }
        />
      </Stack>
    </Paper>
  );
}

// ---------------------------------------------------------------------------
// Pair comparison sub-component
// ---------------------------------------------------------------------------

function PairComparisonSection({
  hasPair,
  loading,
  cointegrationData,
  corr,
  isCoint,
  pVal,
  asset1,
  asset2,
}: {
  hasPair: boolean;
  loading: boolean;
  cointegrationData: CointegrationResponse | null;
  corr: number | null;
  isCoint: boolean | null;
  pVal: number | null;
  asset1: string;
  asset2: string;
}) {
  if (!hasPair) {
    return (
      <Alert
        icon={<IconInfoCircle size={18} />}
        title="No pair selected"
        color="blue"
        variant="light"
        radius="md"
      >
        Select a pair using the dropdowns above to see how your chosen assets
        compare on correlation and cointegration.
      </Alert>
    );
  }

  if (loading) {
    return <Skeleton height={100} radius="md" animate />;
  }

  if (!cointegrationData || corr === null || isCoint === null || pVal === null) {
    return (
      <Alert color="yellow" variant="light" radius="md">
        Cointegration data not available for this pair.
      </Alert>
    );
  }

  return (
    <Stack gap="sm">
      <Title order={5}>Your Pair</Title>

      <Group gap="xl" justify="center">
        {/* Correlation */}
        <Stack gap={4} align="center">
          <Text size="sm" c="dimmed">
            Correlation
          </Text>
          <Badge
            color={correlationColor(corr)}
            variant="filled"
            size="xl"
          >
            r = {corr.toFixed(3)}
          </Badge>
        </Stack>

        <Divider orientation="vertical" size="sm" />

        {/* Cointegration */}
        <Stack gap={4} align="center">
          <Text size="sm" c="dimmed">
            Cointegration
          </Text>
          <Badge
            color={isCoint ? 'green' : 'orange'}
            variant="filled"
            size="xl"
          >
            {isCoint ? 'Cointegrated' : 'Not Cointegrated'}
          </Badge>
        </Stack>

        <Divider orientation="vertical" size="sm" />

        {/* p-value */}
        <Stack gap={4} align="center">
          <Text size="sm" c="dimmed">
            p-value
          </Text>
          <Badge
            color={pVal < 0.05 ? 'green' : 'orange'}
            variant="light"
            size="xl"
          >
            p = {pVal.toFixed(4)}
          </Badge>
        </Stack>
      </Group>

      {/* Interpretation */}
      <Text size="sm" mt="sm">
        {isCoint
          ? `✓ Good news: ${asset1} and ${asset2} are cointegrated (p=${pVal.toFixed(4)} < 0.05). The spread is statistically mean-reverting — this is what we need for pairs trading.`
          : `⚠ ${asset1} and ${asset2} are NOT cointegrated (p=${pVal.toFixed(4)} ≥ 0.05). Their prices may move together but the gap drifts without reverting.`}
      </Text>
    </Stack>
  );
}
