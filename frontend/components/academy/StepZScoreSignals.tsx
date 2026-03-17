'use client';

import { useMemo, useState } from 'react';
import {
  Alert,
  Code,
  Group,
  List,
  Paper,
  SimpleGrid,
  Skeleton,
  Slider,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { IconAdjustments, IconInfoCircle } from '@tabler/icons-react';
import PlotlyChart from '@/components/charts/PlotlyChart';
import { GlossaryLink } from '@/components/glossary/GlossaryLink';
import { EducationalPanel } from './EducationalPanel';
import type { CointegrationResponse } from '@/lib/api';
import type { Data, Layout, Shape } from 'plotly.js';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface StepZScoreSignalsProps {
  cointegrationData: CointegrationResponse | null;
  loading: boolean;
  asset1: string;
  asset2: string;
}

// ---------------------------------------------------------------------------
// Signal types
// ---------------------------------------------------------------------------

type SignalType =
  | 'long_entry'
  | 'short_entry'
  | 'long_exit'
  | 'short_exit'
  | 'stop_loss';

interface Signal {
  index: number;
  type: SignalType;
  zscore: number;
}

interface SignalSummary {
  signals: Signal[];
  totalTrades: number;
  longEntries: number;
  shortEntries: number;
  exits: number;
  stopLosses: number;
}

// ---------------------------------------------------------------------------
// Z-Score Computation — pure function
// ---------------------------------------------------------------------------

/**
 * Compute z-score from a spread array using a rolling window.
 *
 * For each index `i >= window`, computes rolling mean and std of
 * `spread[i-window : i]` (skipping nulls), then `zscore[i] = (spread[i] - mean) / std`.
 * Returns null for positions < window or when std ≈ 0.
 */
function computeZScore(
  spread: (number | null)[],
  window: number,
): (number | null)[] {
  const len = spread.length;
  const zscore: (number | null)[] = new Array(len).fill(null);

  for (let i = window; i < len; i++) {
    const val = spread[i];
    if (val === null || val === undefined) continue;

    // Collect valid values in [i-window, i)
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

    if (std < 1e-10) continue;

    zscore[i] = (val - mean) / std;
  }

  return zscore;
}

// ---------------------------------------------------------------------------
// Signal Generation State Machine
// ---------------------------------------------------------------------------

/**
 * Generate trading signals from a z-score series.
 *
 * State machine ported from Dash `_generate_signals()`:
 * - Flat (0): z <= -entry → long_entry (1), z >= entry → short_entry (-1)
 * - Long (1): z >= -exitThreshold → long_exit (0), z <= -stop → stop_loss (0)
 * - Short (-1): z <= exitThreshold → short_exit (0), z >= stop → stop_loss (0)
 */
function generateSignals(
  zscore: (number | null)[],
  entry: number,
  exitThreshold: number,
  stop: number,
): SignalSummary {
  const signals: Signal[] = [];
  let position = 0; // 0 = flat, 1 = long spread, -1 = short spread

  for (let i = 0; i < zscore.length; i++) {
    const z = zscore[i];
    if (z === null || z === undefined) continue;

    if (position === 0) {
      if (z <= -entry) {
        signals.push({ index: i, type: 'long_entry', zscore: z });
        position = 1;
      } else if (z >= entry) {
        signals.push({ index: i, type: 'short_entry', zscore: z });
        position = -1;
      }
    } else if (position === 1) {
      if (z >= -exitThreshold) {
        signals.push({ index: i, type: 'long_exit', zscore: z });
        position = 0;
      } else if (z <= -stop) {
        signals.push({ index: i, type: 'stop_loss', zscore: z });
        position = 0;
      }
    } else if (position === -1) {
      if (z <= exitThreshold) {
        signals.push({ index: i, type: 'short_exit', zscore: z });
        position = 0;
      } else if (z >= stop) {
        signals.push({ index: i, type: 'stop_loss', zscore: z });
        position = 0;
      }
    }
  }

  const entries = signals.filter(
    (s) => s.type === 'long_entry' || s.type === 'short_entry',
  );

  return {
    signals,
    totalTrades: entries.length,
    longEntries: signals.filter((s) => s.type === 'long_entry').length,
    shortEntries: signals.filter((s) => s.type === 'short_entry').length,
    exits: signals.filter(
      (s) => s.type === 'long_exit' || s.type === 'short_exit',
    ).length,
    stopLosses: signals.filter((s) => s.type === 'stop_loss').length,
  };
}

// ---------------------------------------------------------------------------
// Signal marker config
// ---------------------------------------------------------------------------

const SIGNAL_COLORS: Record<SignalType, string> = {
  long_entry: '#51CF66',
  short_entry: '#FF6B6B',
  long_exit: '#FCC419',
  short_exit: '#FCC419',
  stop_loss: '#FF922B',
};

const SIGNAL_SYMBOLS: Record<SignalType, string> = {
  long_entry: 'triangle-up',
  short_entry: 'triangle-down',
  long_exit: 'circle',
  short_exit: 'circle',
  stop_loss: 'x',
};

// ---------------------------------------------------------------------------
// Z-Score Chart Hook
// ---------------------------------------------------------------------------

function useZScoreChart(
  cointData: CointegrationResponse | null,
  entryThreshold: number,
  exitThreshold: number,
  stopThreshold: number,
) {
  return useMemo(() => {
    if (!cointData) return null;

    // Compute z-score client-side from spread (window = 60)
    const zscore = computeZScore(cointData.spread, 60);
    const timestamps = cointData.timestamps.map((ts) =>
      new Date(ts).toISOString(),
    );

    // Generate signals
    const sigData = generateSignals(
      zscore,
      entryThreshold,
      exitThreshold,
      stopThreshold,
    );

    // ── Threshold zone shapes ────────────────────────────────────────────

    const shapes: Array<Partial<Shape>> = [
      // Positive entry-to-stop zone (short territory)
      {
        type: 'rect',
        xref: 'paper',
        x0: 0,
        x1: 1,
        yref: 'y',
        y0: entryThreshold,
        y1: stopThreshold,
        fillcolor: 'rgba(255,107,107,0.08)',
        line: { width: 0 },
      } as Partial<Shape>,
      // Negative entry-to-stop zone (long territory)
      {
        type: 'rect',
        xref: 'paper',
        x0: 0,
        x1: 1,
        yref: 'y',
        y0: -stopThreshold,
        y1: -entryThreshold,
        fillcolor: 'rgba(81,207,102,0.08)',
        line: { width: 0 },
      } as Partial<Shape>,
      // Exit zone (center)
      {
        type: 'rect',
        xref: 'paper',
        x0: 0,
        x1: 1,
        yref: 'y',
        y0: -exitThreshold,
        y1: exitThreshold,
        fillcolor: 'rgba(252,196,25,0.06)',
        line: { width: 0 },
      } as Partial<Shape>,
    ];

    // ── Threshold lines ──────────────────────────────────────────────────

    const thresholdLines: Array<{
      y: number;
      label: string;
      color: string;
      dash: string;
    }> = [
      { y: entryThreshold, label: `Entry (+${entryThreshold.toFixed(1)})`, color: '#FF6B6B', dash: 'dash' },
      { y: -entryThreshold, label: `Entry (−${entryThreshold.toFixed(1)})`, color: '#51CF66', dash: 'dash' },
      { y: exitThreshold, label: `Exit (+${exitThreshold.toFixed(1)})`, color: '#FCC419', dash: 'dot' },
      { y: -exitThreshold, label: `Exit (−${exitThreshold.toFixed(1)})`, color: '#FCC419', dash: 'dot' },
      { y: stopThreshold, label: `Stop (+${stopThreshold.toFixed(1)})`, color: '#FF6B6B', dash: 'solid' },
      { y: -stopThreshold, label: `Stop (−${stopThreshold.toFixed(1)})`, color: '#51CF66', dash: 'solid' },
    ];

    for (const tl of thresholdLines) {
      shapes.push({
        type: 'line',
        xref: 'paper',
        x0: 0,
        x1: 1,
        yref: 'y',
        y0: tl.y,
        y1: tl.y,
        line: { dash: tl.dash, color: tl.color, width: 1 },
        opacity: 0.5,
      } as Partial<Shape>);
    }

    // Zero line
    shapes.push({
      type: 'line',
      xref: 'paper',
      x0: 0,
      x1: 1,
      yref: 'y',
      y0: 0,
      y1: 0,
      line: { color: 'rgba(255,255,255,0.3)', width: 1 },
    } as Partial<Shape>);

    // ── Annotations (right-side labels) ──────────────────────────────────

    const annotations = thresholdLines.map((tl) => ({
      xref: 'paper' as const,
      x: 1.02,
      yref: 'y' as const,
      y: tl.y,
      text: tl.label,
      showarrow: false,
      font: { size: 10, color: tl.color },
      xanchor: 'left' as const,
    }));

    // ── Traces ───────────────────────────────────────────────────────────

    const data: Data[] = [];

    // Z-score line
    data.push({
      x: timestamps,
      y: zscore,
      type: 'scatter' as const,
      mode: 'lines' as const,
      name: 'Z-Score',
      line: { color: '#339AF0', width: 1.5 },
    });

    // Signal markers — batch by type for efficiency
    const signalsByType = new Map<SignalType, Signal[]>();
    for (const sig of sigData.signals) {
      if (sig.index >= timestamps.length) continue;
      const existing = signalsByType.get(sig.type) ?? [];
      existing.push(sig);
      signalsByType.set(sig.type, existing);
    }

    for (const [sigType, sigs] of signalsByType) {
      data.push({
        x: sigs.map((s) => timestamps[s.index]),
        y: sigs.map((s) => s.zscore),
        type: 'scatter' as const,
        mode: 'markers' as const,
        showlegend: false,
        marker: {
          size: 10,
          color: SIGNAL_COLORS[sigType],
          symbol: SIGNAL_SYMBOLS[sigType],
          line: { width: 1, color: 'white' },
        },
        hovertext: sigs.map(() =>
          sigType.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
        ),
        hoverinfo: 'text' as const,
      });
    }

    // ── Layout ───────────────────────────────────────────────────────────

    const layout: Partial<Layout> = {
      title: { text: 'Z-Score with Trading Signals' },
      height: 420,
      hovermode: 'x unified' as const,
      yaxis: { title: { text: 'Z-Score' } },
      shapes,
      annotations,
      margin: { r: 80 }, // room for right-side annotations
    };

    return { data, layout, sigData };
  }, [cointData, entryThreshold, exitThreshold, stopThreshold]);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function StepZScoreSignals({
  cointegrationData,
  loading,
  asset1,
  asset2,
}: StepZScoreSignalsProps) {
  // Local slider state — NOT lifted to page level
  const [entryThreshold, setEntryThreshold] = useState(2.0);
  const [exitThreshold, setExitThreshold] = useState(0.5);
  const [stopThreshold, setStopThreshold] = useState(3.0);

  const chartResult = useZScoreChart(
    cointegrationData,
    entryThreshold,
    exitThreshold,
    stopThreshold,
  );

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
            Select a pair using the dropdowns above to see z-score analysis and
            trading signals.
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
          <Skeleton height={60} radius="md" animate />
          <Skeleton height={420} radius="md" animate />
          <Skeleton height={100} radius="md" animate />
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

  const sigData = chartResult?.sigData;
  const hedge = cointegrationData.hedge_ratio;

  // Frequency assessment for educational panel
  const tradeCount = sigData?.totalTrades ?? 0;
  const frequencyText =
    tradeCount < 3
      ? 'Very few signals — consider lowering the entry threshold.'
      : tradeCount > 30
        ? 'Many signals — the threshold may be too loose.'
        : 'This is a reasonable frequency for a real strategy.';

  // Slider marks
  const entryMarks = [
    { value: 1.5, label: '1.5' },
    { value: 2.0, label: '2.0' },
    { value: 2.5, label: '2.5' },
  ];
  const exitMarks = [
    { value: 0.0, label: '0' },
    { value: 0.5, label: '0.5' },
    { value: 1.0, label: '1.0' },
  ];
  const stopMarks = [
    { value: 2.5, label: '2.5' },
    { value: 3.0, label: '3.0' },
    { value: 4.0, label: '4.0' },
  ];

  return (
    <Paper shadow="sm" p="xl" radius="md" withBorder>
      <Stack gap="lg">
        <StepHeader />

        {/* Three parameter sliders */}
        <SimpleGrid cols={{ base: 1, sm: 3 }}>
          <Stack gap={4}>
            <Text size="sm" fw={500}>
              Entry: ±{entryThreshold.toFixed(1)}σ
            </Text>
            <Slider
              value={entryThreshold}
              onChange={setEntryThreshold}
              min={1.0}
              max={3.0}
              step={0.1}
              marks={entryMarks}
              color="red"
            />
          </Stack>
          <Stack gap={4}>
            <Text size="sm" fw={500}>
              Exit: ±{exitThreshold.toFixed(1)}σ
            </Text>
            <Slider
              value={exitThreshold}
              onChange={setExitThreshold}
              min={0.0}
              max={1.5}
              step={0.1}
              marks={exitMarks}
              color="yellow"
            />
          </Stack>
          <Stack gap={4}>
            <Text size="sm" fw={500}>
              Stop Loss: ±{stopThreshold.toFixed(1)}σ
            </Text>
            <Slider
              value={stopThreshold}
              onChange={setStopThreshold}
              min={2.0}
              max={5.0}
              step={0.1}
              marks={stopMarks}
              color="orange"
            />
          </Stack>
        </SimpleGrid>

        {/* Z-Score chart with threshold zones and signal markers */}
        {chartResult && (
          <>
            <PlotlyChart data={chartResult.data} layout={chartResult.layout} />
            <Text size="sm" c="dimmed">
              The z-score standardizes the spread to show how many standard
              deviations it is from normal. ▲ green triangles = long entries
              (spread is unusually low, expect it to rise). ▼ red triangles =
              short entries (spread is unusually high, expect it to drop). ●
              yellow circles = exits (spread returned to normal). ✕ orange =
              stop-loss.
            </Text>
          </>
        )}

        {/* Signal summary panel */}
        {sigData && (
          <Paper p="md" radius="md" withBorder>
            <Stack gap="sm">
              <Title order={5}>Signal Summary</Title>
              <SimpleGrid cols={{ base: 2, sm: 4 }}>
                <Stack gap={2} align="center">
                  <Text size="xl" fw={700} c="blue">
                    {sigData.totalTrades}
                  </Text>
                  <Text size="xs" c="dimmed">
                    Total Trades
                  </Text>
                </Stack>
                <Stack gap={2} align="center">
                  <Text size="xl" fw={700} c="green">
                    {sigData.longEntries}
                  </Text>
                  <Text size="xs" c="dimmed">
                    Long Entries
                  </Text>
                </Stack>
                <Stack gap={2} align="center">
                  <Text size="xl" fw={700} c="red">
                    {sigData.shortEntries}
                  </Text>
                  <Text size="xs" c="dimmed">
                    Short Entries
                  </Text>
                </Stack>
                <Stack gap={2} align="center">
                  <Text size="xl" fw={700} c="orange">
                    {sigData.stopLosses}
                  </Text>
                  <Text size="xs" c="dimmed">
                    Stop Losses
                  </Text>
                </Stack>
              </SimpleGrid>
              <Text size="sm" c="dimmed">
                With entry at ±{entryThreshold.toFixed(1)}σ, exit at ±
                {exitThreshold.toFixed(1)}σ, and stop at ±
                {stopThreshold.toFixed(1)}σ, this pair generates{' '}
                {sigData.totalTrades} trades over the period.{' '}
                {sigData.totalTrades > 0
                  ? 'Adjust the sliders to see how thresholds affect trade frequency.'
                  : 'Try lowering the entry threshold to generate more signals.'}
              </Text>
            </Stack>
          </Paper>
        )}

        {/* Educational panel */}
        <EducationalPanel
          intuition={
            <Text size="sm">
              The z-score is like a thermostat reading. It tells you how far
              from &quot;normal&quot; the spread is right now. When the reading
              hits +2 (the spread is unusually wide), it&apos;s like the room
              being too hot — you expect it to cool back down. That
              &quot;cooling down&quot; expectation is your trade.
              <br />
              <br />
              The <strong>entry threshold</strong> is your trigger point
              (&quot;it&apos;s hot enough to turn on the AC&quot;). The{' '}
              <strong>exit threshold</strong> is when conditions are back to
              normal. The <strong>stop-loss</strong> is your &quot;something is
              broken&quot; level — the AC isn&apos;t working, get out.
            </Text>
          }
          mechanics={
            <Stack gap="xs">
              <Text size="sm">
                The <GlossaryLink term="z-score" /> standardizes the{' '}
                <GlossaryLink term="spread" />:
              </Text>
              <Code block>
                {`z-score = (spread − rolling_mean) / rolling_std\n\nspread = ${asset1} − (${hedge.toFixed(4)} × ${asset2})`}
              </Code>
              <Text size="sm">Trading rules:</Text>
              <List size="sm" spacing="xs">
                <List.Item>
                  <Code>z &lt; −entry</Code> → go <strong>long</strong> (spread
                  is unusually tight, expect widening)
                </List.Item>
                <List.Item>
                  <Code>z &gt; +entry</Code> → go <strong>short</strong>{' '}
                  (spread is unusually wide, expect tightening)
                </List.Item>
                <List.Item>
                  <Code>|z| &lt; exit</Code> → <strong>close</strong> position
                  (spread is back to normal)
                </List.Item>
                <List.Item>
                  <Code>|z| &gt; stop</Code> → <strong>stop loss</strong>{' '}
                  (spread is moving against you too much)
                </List.Item>
              </List>
              <Text size="sm" c="dimmed">
                The trade-off: lower entry thresholds generate more signals but
                more false positives. Higher thresholds are more selective but
                you miss opportunities.
              </Text>
            </Stack>
          }
          pairSpecific={
            <Stack gap="xs">
              <Text size="sm" fw={500}>
                With current thresholds (entry ±{entryThreshold.toFixed(1)}σ,
                exit ±{exitThreshold.toFixed(1)}σ, stop ±
                {stopThreshold.toFixed(1)}σ), this pair generates {tradeCount}{' '}
                trade signals. {frequencyText}
              </Text>
              <Text size="sm" c="dimmed">
                Try moving the sliders to build intuition about the trade-off
                between selectivity and trade frequency.
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
      <IconAdjustments
        size={28}
        stroke={1.5}
        color="var(--mantine-color-blue-5)"
      />
      <div>
        <Title order={3}>Z-Score &amp; Signals</Title>
        <Text c="dimmed" size="sm">
          Standardize the spread and generate trading signals with adjustable
          thresholds
        </Text>
      </div>
    </Group>
  );
}
