'use client';

import { useMemo, useState } from 'react';
import {
  Alert,
  Badge,
  Code,
  Group,
  List,
  Paper,
  Skeleton,
  Slider,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { IconChartAreaLine, IconInfoCircle } from '@tabler/icons-react';
import PlotlyChart from '@/components/charts/PlotlyChart';
import { GlossaryLink } from '@/components/glossary/GlossaryLink';
import { EducationalPanel } from './EducationalPanel';
import type { CointegrationResponse } from '@/lib/api';
import type { Data, Layout, Shape } from 'plotly.js';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface StepSpreadProps {
  cointegrationData: CointegrationResponse | null;
  loading: boolean;
  asset1: string;
  asset2: string;
}

// ---------------------------------------------------------------------------
// Rolling Statistics — pure function (no React hooks)
// ---------------------------------------------------------------------------

/**
 * Compute rolling mean and standard deviation over a spread array.
 *
 * For each index `i >= window`, computes mean/std of `spread[i-window : i]`,
 * skipping null values. Returns null for positions where fewer than 2 valid
 * values exist in the window.
 */
function computeRollingStats(
  spread: (number | null)[],
  window: number,
): { rollingMean: (number | null)[]; rollingStd: (number | null)[] } {
  const len = spread.length;
  const rollingMean: (number | null)[] = new Array(len).fill(null);
  const rollingStd: (number | null)[] = new Array(len).fill(null);

  for (let i = window; i < len; i++) {
    // Collect valid values in the window [i-window, i)
    const valid: number[] = [];
    for (let j = i - window; j < i; j++) {
      if (spread[j] !== null && spread[j] !== undefined) {
        valid.push(spread[j] as number);
      }
    }

    if (valid.length < 2) continue;

    const mean = valid.reduce((sum, v) => sum + v, 0) / valid.length;
    const variance =
      valid.reduce((sum, v) => sum + (v - mean) ** 2, 0) / valid.length;
    const std = Math.sqrt(variance);

    rollingMean[i] = mean;
    rollingStd[i] = std;
  }

  return { rollingMean, rollingStd };
}

// ---------------------------------------------------------------------------
// Spread Chart with σ Bands
// ---------------------------------------------------------------------------

function useSpreadChart(
  cointData: CointegrationResponse | null,
  window: number,
  asset1: string,
  asset2: string,
) {
  return useMemo(() => {
    if (!cointData) return null;

    const spread = cointData.spread;
    const timestamps = cointData.timestamps.map((ts) =>
      new Date(ts).toISOString(),
    );

    const { rollingMean, rollingStd } = computeRollingStats(spread, window);

    const data: Data[] = [];

    // σ bands (3σ → 2σ → 1σ): each band is upper line (no fill) + lower line (fill to previous)
    const bandConfigs: Array<{ n: number; opacity: number }> = [
      { n: 3, opacity: 0.06 },
      { n: 2, opacity: 0.10 },
      { n: 1, opacity: 0.15 },
    ];

    for (const { n, opacity } of bandConfigs) {
      const upper: (number | null)[] = rollingMean.map((m, i) => {
        const s = rollingStd[i];
        return m !== null && s !== null ? m + n * s : null;
      });
      const lower: (number | null)[] = rollingMean.map((m, i) => {
        const s = rollingStd[i];
        return m !== null && s !== null ? m - n * s : null;
      });

      // Upper boundary (no fill)
      data.push({
        x: timestamps,
        y: upper,
        type: 'scatter' as const,
        mode: 'lines' as const,
        line: { width: 0 },
        showlegend: false,
        hoverinfo: 'skip' as const,
      });

      // Lower boundary with fill to upper
      data.push({
        x: timestamps,
        y: lower,
        type: 'scatter' as const,
        mode: 'lines' as const,
        line: { width: 0 },
        fill: 'tonexty' as const,
        fillcolor: `rgba(51,154,240,${opacity})`,
        name: `±${n}σ`,
        hoverinfo: 'skip' as const,
      });
    }

    // Rolling mean — dashed yellow
    data.push({
      x: timestamps,
      y: rollingMean,
      type: 'scatter' as const,
      mode: 'lines' as const,
      name: 'Rolling Mean',
      line: { color: '#FCC419', width: 2, dash: 'dash' },
    });

    // Raw spread — solid blue
    data.push({
      x: timestamps,
      y: spread,
      type: 'scatter' as const,
      mode: 'lines' as const,
      name: 'Spread',
      line: { color: '#339AF0', width: 1.5 },
    });

    const layout: Partial<Layout> = {
      title: {
        text: `Spread: ${asset1} − β×${asset2} (window=${window})`,
      },
      height: 400,
      hovermode: 'x unified' as const,
      yaxis: { title: { text: 'Spread Value' } },
      legend: {
        orientation: 'h' as const,
        yanchor: 'bottom' as const,
        y: 1.02,
      },
    };

    return { data, layout };
  }, [cointData, window, asset1, asset2]);
}

// ---------------------------------------------------------------------------
// Spread Histogram
// ---------------------------------------------------------------------------

function useSpreadHistogram(cointData: CointegrationResponse | null) {
  return useMemo(() => {
    if (!cointData) return null;

    // Filter out null values
    const spreadValues = cointData.spread.filter(
      (v): v is number => v !== null && v !== undefined,
    );

    if (spreadValues.length === 0) return null;

    const mean =
      spreadValues.reduce((sum, v) => sum + v, 0) / spreadValues.length;

    const data: Data[] = [
      {
        x: spreadValues,
        type: 'histogram' as const,
        marker: { color: '#339AF0', opacity: 0.7 },
        name: 'Spread distribution',
        showlegend: false,
        nbinsx: 50,
      } as Data,
    ];

    // Mean line as a shape + annotation
    const shapes: Array<Partial<Shape>> = [
      {
        type: 'line',
        x0: mean,
        x1: mean,
        y0: 0,
        y1: 1,
        yref: 'paper',
        line: { dash: 'dash', color: '#FCC419', width: 2 },
      } as Partial<Shape>,
    ];

    const layout: Partial<Layout> = {
      title: { text: 'Spread Distribution (Stationarity Check)' },
      xaxis: { title: { text: 'Spread Value' } },
      yaxis: { title: { text: 'Frequency' } },
      height: 280,
      shapes,
      annotations: [
        {
          x: mean,
          y: 1,
          yref: 'paper' as const,
          text: `Mean: ${mean.toFixed(1)}`,
          showarrow: false,
          font: { size: 12, color: '#FCC419' },
          yanchor: 'bottom' as const,
        },
      ],
    };

    return { data, layout };
  }, [cointData]);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function StepSpread({
  cointegrationData,
  loading,
  asset1,
  asset2,
}: StepSpreadProps) {
  // Local slider state — NOT lifted to page level
  const [window, setWindow] = useState(60);

  const spreadChart = useSpreadChart(cointegrationData, window, asset1, asset2);
  const histogramChart = useSpreadHistogram(cointegrationData);

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
            Select a pair using the dropdowns above to see the spread analysis.
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
          <Skeleton height={40} radius="md" animate />
          <Skeleton height={400} radius="md" animate />
          <Skeleton height={280} radius="md" animate />
          <Skeleton height={100} radius="md" animate />
        </Stack>
      </Paper>
    );
  }

  // ── No data state ──────────────────────────────────────────────────────

  if (!cointegrationData) {
    return (
      <Paper shadow="sm" p="xl" radius="md" withBorder>
        <Stack gap="lg">
          <StepHeader />
          <Alert color="yellow" variant="light" radius="md">
            Cointegration data not available for this pair.
          </Alert>
        </Stack>
      </Paper>
    );
  }

  const hedge = cointegrationData.hedge_ratio;
  const halfLife = cointegrationData.half_life;
  const isCoint = cointegrationData.is_cointegrated;

  // Half-life classification
  const halfLifeIsGood =
    halfLife !== null &&
    halfLife !== undefined &&
    Number.isFinite(halfLife) &&
    halfLife > 0 &&
    halfLife < 100;

  const halfLifeText =
    halfLife !== null &&
    halfLife !== undefined &&
    Number.isFinite(halfLife) &&
    halfLife > 0
      ? `${Math.abs(halfLife).toFixed(1)} periods`
      : 'N/A';

  // Slider marks
  const sliderMarks = [
    { value: 20, label: '20' },
    { value: 60, label: '60' },
    { value: 120, label: '120' },
    { value: 200, label: '200' },
  ];

  return (
    <Paper shadow="sm" p="xl" radius="md" withBorder>
      <Stack gap="lg">
        <StepHeader />

        {/* Rolling window slider */}
        <Stack gap={4}>
          <Text size="sm" fw={500}>
            Rolling Window: {window} periods
          </Text>
          <Slider
            value={window}
            onChange={setWindow}
            min={10}
            max={200}
            step={5}
            marks={sliderMarks}
            color="blue"
            mb="md"
          />
        </Stack>

        {/* Half-life badge */}
        <Group gap="sm">
          <Text size="sm">Half-life of mean reversion:</Text>
          <Badge
            color={halfLifeIsGood ? 'teal' : 'orange'}
            variant="light"
            size="lg"
          >
            {halfLifeText}
          </Badge>
          {halfLife !== null &&
            halfLife !== undefined &&
            Number.isFinite(halfLife) &&
            halfLife > 0 && (
              <Text size="sm" c="dimmed">
                (~{Math.abs(halfLife).toFixed(0)} candles)
              </Text>
            )}
        </Group>

        {/* Spread chart with σ bands */}
        {spreadChart && (
          <>
            <PlotlyChart data={spreadChart.data} layout={spreadChart.layout} />
            <Text size="sm" c="dimmed">
              The blue line is the spread: {asset1} − {hedge.toFixed(2)} ×{' '}
              {asset2}. The dashed yellow line is the rolling average, and the
              shaded bands show ±1σ, ±2σ, and ±3σ. When the spread moves
              outside the bands, it&apos;s statistically unusual.
            </Text>
          </>
        )}

        {/* Spread histogram */}
        {histogramChart && (
          <>
            <PlotlyChart
              data={histogramChart.data}
              layout={histogramChart.layout}
            />
            <Text size="sm" c="dimmed">
              A roughly bell-shaped, centered distribution suggests the spread
              is stationary — it oscillates around a stable mean. Skewed or
              fat-tailed distributions warn that the spread may not behave as
              expected.
            </Text>
          </>
        )}

        {/* Educational panel */}
        <EducationalPanel
          intuition={
            <Text size="sm">
              The spread is like measuring the length of the leash between two
              dogs at every moment. When the leash stretches too far (spread
              moves away from the mean), you expect it to snap back. The σ bands
              show you what &quot;too far&quot; looks like statistically — when
              the spread crosses the ±2σ band, it&apos;s in unusual territory.
              <br />
              <br />
              Try moving the rolling window slider — a shorter window makes the
              bands tighter and more reactive, while a longer window smooths
              things out but reacts more slowly.
            </Text>
          }
          mechanics={
            <Stack gap="xs">
              <Text size="sm">
                The <GlossaryLink term="spread" /> is constructed from the
                cointegration regression:
              </Text>
              <Code block>
                {`spread = ${asset1} − (${hedge.toFixed(4)} × ${asset2})`}
              </Code>
              <Text size="sm">
                The rolling mean and standard deviation create dynamic bands. A
                stationary spread oscillates around a stable mean — this is{' '}
                <GlossaryLink term="mean reversion">mean reversion</GlossaryLink>{' '}
                in action. The rolling window controls how much history is used
                for the bands:
              </Text>
              <List size="sm" spacing="xs">
                <List.Item>
                  <strong>Shorter window</strong> (20-40): Reacts faster to
                  recent changes, but noisier — more false signals.
                </List.Item>
                <List.Item>
                  <strong>Longer window</strong> (100-200): Smoother bands, but
                  lags behind regime changes — slower to adapt.
                </List.Item>
              </List>
              <Text size="sm" c="dimmed">
                The histogram should look roughly bell-shaped (normal) and
                centered — this is a visual check for{' '}
                <GlossaryLink term="stationarity">stationarity</GlossaryLink>.
                A skewed or fat-tailed distribution warns that the spread may
                not behave as expected.
              </Text>
            </Stack>
          }
          pairSpecific={
            <Stack gap="xs">
              <Text size="sm" fw={500}>
                Spread = {asset1} − {hedge.toFixed(2)} × {asset2}
              </Text>
              <Text size="sm">
                {isCoint
                  ? 'The spread looks mean-reverting — good for trading.'
                  : 'The spread may drift — use caution.'}
                {halfLife !== null &&
                  halfLife !== undefined &&
                  Number.isFinite(halfLife) &&
                  halfLife > 0 &&
                  ` Half-life: ${halfLife.toFixed(1)} periods.`}
              </Text>
              <Text size="sm" c="dimmed">
                Try adjusting the rolling window slider to see how the bands
                change. A window matching the half-life often gives the best
                signals.
              </Text>
            </Stack>
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
      <IconChartAreaLine
        size={28}
        stroke={1.5}
        color="var(--mantine-color-blue-5)"
      />
      <div>
        <Title order={3}>The Spread</Title>
        <Text c="dimmed" size="sm">
          Visualize the spread between two assets with rolling statistics
        </Text>
      </div>
    </Group>
  );
}
