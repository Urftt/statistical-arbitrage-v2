'use client';

import { useMemo, useState } from 'react';
import {
  Alert,
  Badge,
  Code,
  Group,
  Paper,
  SegmentedControl,
  Skeleton,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { IconChartLine, IconInfoCircle } from '@tabler/icons-react';
import PlotlyChart from '@/components/charts/PlotlyChart';
import { GlossaryLink } from '@/components/glossary/GlossaryLink';
import { EducationalPanel } from './EducationalPanel';
import type { CointegrationResponse, OHLCVResponse } from '@/lib/api';
import type { Data, Layout, Shape } from 'plotly.js';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface StepPriceComparisonProps {
  cointegrationData: CointegrationResponse | null;
  ohlcv1: OHLCVResponse | null;
  ohlcv2: OHLCVResponse | null;
  loading: boolean;
  asset1: string;
  asset2: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Convert epoch-ms timestamps to ISO date strings for Plotly x-axis. */
function timestampsToISO(timestamps: number[]): string[] {
  return timestamps.map((t) => new Date(t).toISOString());
}

/** Normalize a price series to base 100. */
function normalize(prices: number[]): number[] {
  if (prices.length === 0) return [];
  const base = prices[0];
  if (base === 0) return prices;
  return prices.map((p) => (p / base) * 100);
}

/** Return a Mantine color name based on |r|. */
function correlationColor(r: number): string {
  const abs = Math.abs(r);
  if (abs >= 0.7) return 'green';
  if (abs >= 0.3) return 'yellow';
  return 'red';
}

/** Return a human-readable label for correlation strength. */
function correlationLabel(r: number): string {
  const abs = Math.abs(r);
  if (abs >= 0.9) return 'Very strong';
  if (abs >= 0.7) return 'Strong';
  if (abs >= 0.5) return 'Moderate';
  if (abs >= 0.3) return 'Weak';
  return 'Very weak';
}

/** Short description of what the correlation means for this pair. */
function correlationDescription(r: number): string {
  if (r > 0.9) return 'move very closely together';
  if (r > 0.7) return 'tend to move together';
  if (r > 0.5) return 'show some co-movement';
  return 'move somewhat independently';
}

/** Pair-specific educational text based on correlation strength. */
function pairSpecificText(
  asset1: string,
  asset2: string,
  r: number,
  label: string
): string {
  const base = `${asset1} and ${asset2} have a correlation of r = ${r.toFixed(3)} (${label.toLowerCase()}).`;
  if (r > 0.8) return `${base} They track each other closely — a promising start for pairs trading.`;
  if (r > 0.5) return `${base} They show some co-movement but the link is looser.`;
  return `${base} The correlation is weak, but cointegration can still exist with weak correlation.`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function StepPriceComparison({
  cointegrationData,
  ohlcv1,
  ohlcv2,
  loading,
  asset1,
  asset2,
}: StepPriceComparisonProps) {
  const [chartMode, setChartMode] = useState<'normalized' | 'raw'>('normalized');

  // ── No-pair state ──────────────────────────────────────────────────────

  if (!asset1 || !asset2) {
    return (
      <Paper shadow="sm" p="xl" radius="md" withBorder>
        <Stack gap="lg">
          <StepHeader />
          <Alert
            icon={<IconInfoCircle size={18} />}
            title="No pair selected"
            color="blue"
            variant="light"
            radius="md"
          >
            Select a pair using the dropdowns above to see how their prices
            compare over time.
          </Alert>
        </Stack>
      </Paper>
    );
  }

  // ── Loading state ──────────────────────────────────────────────────────

  if (loading) {
    return (
      <Paper shadow="sm" p="xl" radius="md" withBorder>
        <Stack gap="lg">
          <StepHeader />
          <Skeleton height={420} radius="md" animate />
          <Skeleton height={60} radius="md" animate />
        </Stack>
      </Paper>
    );
  }

  // ── Data-ready state ───────────────────────────────────────────────────

  const hasData = ohlcv1 && ohlcv2;
  const corr = cointegrationData?.correlation ?? null;

  return (
    <Paper shadow="sm" p="xl" radius="md" withBorder>
      <Stack gap="lg">
        <StepHeader />

        {hasData ? (
          <>
            {/* Chart toggle */}
            <SegmentedControl
              value={chartMode}
              onChange={(v) => setChartMode(v as 'normalized' | 'raw')}
              data={[
                { label: 'Normalized (Base 100)', value: 'normalized' },
                { label: 'Actual Prices', value: 'raw' },
              ]}
              size="sm"
            />

            {/* Charts — keep both in DOM, toggle visibility */}
            <div style={{ display: chartMode === 'normalized' ? 'block' : 'none' }}>
              <NormalizedChart ohlcv1={ohlcv1} ohlcv2={ohlcv2} asset1={asset1} asset2={asset2} />
            </div>
            <div style={{ display: chartMode === 'raw' ? 'block' : 'none' }}>
              <RawDualAxisChart ohlcv1={ohlcv1} ohlcv2={ohlcv2} asset1={asset1} asset2={asset2} />
            </div>
          </>
        ) : (
          <Alert color="yellow" variant="light" radius="md">
            OHLCV data not available for this pair.
          </Alert>
        )}

        {/* Correlation section */}
        {corr !== null && <CorrelationSection correlation={corr} />}

        {/* Educational panel */}
        <EducationalPanel
          intuition={
            <Text size="sm">
              Imagine two dogs on leashes held by the same walker. They wander
              individually — one sniffs a tree, the other chases a pigeon — but
              they can&apos;t get too far apart because the walker keeps them
              close. The actual price chart shows their raw positions; the
              normalized chart shows their movement relative to where they
              started, removing the scale difference.
            </Text>
          }
          mechanics={
            <Stack gap="xs">
              <Text size="sm">
                The actual price chart uses two y-axes since assets trade at very
                different levels (e.g. BTC at €80k vs ETH at €2k). This shows
                real price levels but makes visual comparison hard.
              </Text>
              <Text size="sm">
                Normalization rebases both prices to 100 at the start of the
                period. Now you can directly compare percentage moves — if one
                line goes to 110 and the other to 108, they&apos;ve gained 10%
                and 8% respectively.
              </Text>
              <Text size="sm">
                The Pearson <GlossaryLink term="correlation" /> coefficient
                (r) measures linear co-movement:
              </Text>
              <Code block>
                r = cov(returns₁, returns₂) / (σ₁ × σ₂)
              </Code>
              <Text size="sm" c="dimmed">
                • r ≈ 1.0: always move together &nbsp;•&nbsp; r ≈ 0: no
                relationship &nbsp;•&nbsp; r ≈ −1.0: always move opposite
              </Text>
            </Stack>
          }
          pairSpecific={
            corr !== null ? (
              <Text size="sm">
                {pairSpecificText(asset1, asset2, corr, correlationLabel(corr))}
              </Text>
            ) : (
              <Text size="sm" c="dimmed">
                Select a pair above to see how your chosen assets move together.
              </Text>
            )
          }
        />
      </Stack>
    </Paper>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Step header with icon and description. */
function StepHeader() {
  return (
    <Group gap="sm">
      <IconChartLine size={28} stroke={1.5} color="var(--mantine-color-blue-5)" />
      <div>
        <Title order={3}>Price Comparison</Title>
        <Text c="dimmed" size="sm">
          Compare how the two assets move over time
        </Text>
      </div>
    </Group>
  );
}

/** Normalized price chart (base 100). */
function NormalizedChart({
  ohlcv1,
  ohlcv2,
  asset1,
  asset2,
}: {
  ohlcv1: OHLCVResponse;
  ohlcv2: OHLCVResponse;
  asset1: string;
  asset2: string;
}) {
  const { data, layout } = useMemo(() => {
    const x1 = timestampsToISO(ohlcv1.timestamps);
    const x2 = timestampsToISO(ohlcv2.timestamps);
    const norm1 = normalize(ohlcv1.close);
    const norm2 = normalize(ohlcv2.close);

    const traces: Data[] = [
      {
        x: x1,
        y: norm1,
        type: 'scatter' as const,
        mode: 'lines' as const,
        name: asset1,
        line: { width: 2 },
      },
      {
        x: x2,
        y: norm2,
        type: 'scatter' as const,
        mode: 'lines' as const,
        name: asset2,
        line: { width: 2 },
      },
    ];

    const baselineShape: Partial<Shape> = {
      type: 'line',
      x0: 0,
      x1: 1,
      xref: 'paper',
      y0: 100,
      y1: 100,
      yref: 'y',
      line: { dash: 'dot', color: 'rgba(255,255,255,0.2)', width: 1 },
    };

    const chartLayout: Partial<Layout> = {
      title: { text: `Normalized Prices: ${asset1} vs ${asset2}` },
      yaxis: { title: { text: 'Normalized Price (Base = 100)' } },
      height: 420,
      hovermode: 'x unified',
      legend: { orientation: 'h', yanchor: 'bottom', y: 1.02 },
      shapes: [baselineShape as Partial<Shape>],
    };

    return { data: traces, layout: chartLayout };
  }, [ohlcv1, ohlcv2, asset1, asset2]);

  return <PlotlyChart data={data} layout={layout} />;
}

/** Raw dual-axis price chart. */
function RawDualAxisChart({
  ohlcv1,
  ohlcv2,
  asset1,
  asset2,
}: {
  ohlcv1: OHLCVResponse;
  ohlcv2: OHLCVResponse;
  asset1: string;
  asset2: string;
}) {
  const { data, layout } = useMemo(() => {
    const x1 = timestampsToISO(ohlcv1.timestamps);
    const x2 = timestampsToISO(ohlcv2.timestamps);

    const traces: Data[] = [
      {
        x: x1,
        y: ohlcv1.close,
        type: 'scatter' as const,
        mode: 'lines' as const,
        name: asset1,
        line: { width: 2 },
        yaxis: 'y',
      },
      {
        x: x2,
        y: ohlcv2.close,
        type: 'scatter' as const,
        mode: 'lines' as const,
        name: asset2,
        line: { width: 2 },
        yaxis: 'y2',
      },
    ];

    // yaxis2 must be passed explicitly — PlotlyChart deep-merges only yaxis
    const chartLayout: Partial<Layout> = {
      title: { text: `Actual Prices: ${asset1} vs ${asset2}` },
      yaxis: { title: { text: `${asset1} (EUR)` }, side: 'left' },
      yaxis2: {
        title: { text: `${asset2} (EUR)`, font: { color: '#909296' } },
        side: 'right',
        overlaying: 'y',
        gridcolor: 'rgba(55, 58, 64, 0.4)',
        zerolinecolor: 'rgba(55, 58, 64, 0.4)',
        tickfont: { color: '#909296' },
      },
      height: 420,
      hovermode: 'x unified',
      legend: { orientation: 'h', yanchor: 'bottom', y: 1.02 },
    };

    return { data: traces, layout: chartLayout };
  }, [ohlcv1, ohlcv2, asset1, asset2]);

  return <PlotlyChart data={data} layout={layout} />;
}

/** Correlation badge and explanation text. */
function CorrelationSection({ correlation }: { correlation: number }) {
  const color = correlationColor(correlation);
  const label = correlationLabel(correlation);

  return (
    <Stack gap="xs">
      <Group gap="sm">
        <Text size="sm" fw={500}>
          Pearson Correlation:
        </Text>
        <Badge color={color} variant="filled" size="lg">
          r = {correlation.toFixed(3)}
        </Badge>
        <Badge color={color} variant="light" size="lg">
          {label}
        </Badge>
      </Group>
      <Text size="sm" c="dimmed">
        Correlation measures how closely two prices move in the same direction.
        r = {correlation.toFixed(3)} means these assets{' '}
        {correlationDescription(correlation)}. A value of 1.0 would mean perfect
        lock-step; 0.0 means no relationship at all.
      </Text>
      <Text size="sm" c="dimmed" fs="italic">
        ⚠️ But correlation alone isn&apos;t enough for trading — prices can be
        correlated yet drift apart permanently. The next step tests whether the
        relationship is strong enough to mean-revert (cointegration).
      </Text>
    </Stack>
  );
}
