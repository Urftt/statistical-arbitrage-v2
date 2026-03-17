'use client';

import { useMemo } from 'react';
import {
  Alert,
  Badge,
  Code,
  Group,
  List,
  Paper,
  SimpleGrid,
  Skeleton,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { IconFlask, IconInfoCircle } from '@tabler/icons-react';
import PlotlyChart from '@/components/charts/PlotlyChart';
import { GlossaryLink } from '@/components/glossary/GlossaryLink';
import { EducationalPanel } from './EducationalPanel';
import type { CointegrationResponse, OHLCVResponse } from '@/lib/api';
import type { Data, Layout, Shape } from 'plotly.js';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface StepCointegrationTestProps {
  cointegrationData: CointegrationResponse | null;
  ohlcv1: OHLCVResponse | null;
  ohlcv2: OHLCVResponse | null;
  loading: boolean;
  asset1: string;
  asset2: string;
}

// ---------------------------------------------------------------------------
// ADF Number Line Chart
// ---------------------------------------------------------------------------

function useADFNumberLine(cointData: CointegrationResponse | null) {
  return useMemo(() => {
    if (!cointData) return null;

    const testStat = cointData.cointegration_score;
    const cv1 = cointData.critical_values.one_pct;
    const cv5 = cointData.critical_values.five_pct;
    const cv10 = cointData.critical_values.ten_pct;
    const isCoint = cointData.is_cointegrated;

    const allVals = [testStat, cv1, cv5, cv10];
    const xMin = Math.min(...allVals) - 1.0;
    const xMax = Math.max(...allVals) + 1.5;

    // Colored significance zones
    const shapes: Array<Partial<Shape>> = [
      // Reject at 1% (green)
      {
        type: 'rect',
        xref: 'x',
        yref: 'paper',
        x0: xMin,
        x1: cv1,
        y0: 0,
        y1: 1,
        fillcolor: 'rgba(81,207,102,0.15)',
        line: { width: 0 },
      } as Partial<Shape>,
      // Reject at 5% (yellow)
      {
        type: 'rect',
        xref: 'x',
        yref: 'paper',
        x0: cv1,
        x1: cv5,
        y0: 0,
        y1: 1,
        fillcolor: 'rgba(252,196,25,0.12)',
        line: { width: 0 },
      } as Partial<Shape>,
      // Reject at 10% (faint red)
      {
        type: 'rect',
        xref: 'x',
        yref: 'paper',
        x0: cv5,
        x1: cv10,
        y0: 0,
        y1: 1,
        fillcolor: 'rgba(255,107,107,0.10)',
        line: { width: 0 },
      } as Partial<Shape>,
      // Fail to reject (very faint red)
      {
        type: 'rect',
        xref: 'x',
        yref: 'paper',
        x0: cv10,
        x1: xMax,
        y0: 0,
        y1: 1,
        fillcolor: 'rgba(255,107,107,0.05)',
        line: { width: 0 },
      } as Partial<Shape>,
      // Critical value vertical lines
      {
        type: 'line',
        x0: cv1,
        x1: cv1,
        y0: 0,
        y1: 1,
        yref: 'paper',
        line: { dash: 'solid', color: 'rgba(255,255,255,0.4)', width: 1 },
      } as Partial<Shape>,
      {
        type: 'line',
        x0: cv5,
        x1: cv5,
        y0: 0,
        y1: 1,
        yref: 'paper',
        line: { dash: 'dash', color: 'rgba(255,255,255,0.4)', width: 1 },
      } as Partial<Shape>,
      {
        type: 'line',
        x0: cv10,
        x1: cv10,
        y0: 0,
        y1: 1,
        yref: 'paper',
        line: { dash: 'dot', color: 'rgba(255,255,255,0.4)', width: 1 },
      } as Partial<Shape>,
    ];

    // Zone labels + critical value annotations
    const annotations = [
      {
        x: (xMin + cv1) / 2,
        y: 0.92,
        yref: 'paper' as const,
        text: 'Reject at 1%',
        showarrow: false,
        font: { size: 10, color: '#51CF66' },
      },
      {
        x: (cv1 + cv5) / 2,
        y: 0.92,
        yref: 'paper' as const,
        text: 'Reject at 5%',
        showarrow: false,
        font: { size: 10, color: '#FCC419' },
      },
      {
        x: (cv5 + cv10) / 2,
        y: 0.92,
        yref: 'paper' as const,
        text: 'Reject at 10%',
        showarrow: false,
        font: { size: 10, color: '#FF6B6B' },
      },
      {
        x: (cv10 + xMax) / 2,
        y: 0.92,
        yref: 'paper' as const,
        text: 'Fail to reject',
        showarrow: false,
        font: { size: 10, color: 'rgba(255,107,107,0.6)' },
      },
      // Critical value labels
      {
        x: cv1,
        y: 0.15,
        yref: 'paper' as const,
        text: `1%: ${cv1.toFixed(2)}`,
        showarrow: false,
        font: { size: 11, color: '#909296' },
      },
      {
        x: cv5,
        y: 0.15,
        yref: 'paper' as const,
        text: `5%: ${cv5.toFixed(2)}`,
        showarrow: false,
        font: { size: 11, color: '#909296' },
      },
      {
        x: cv10,
        y: 0.15,
        yref: 'paper' as const,
        text: `10%: ${cv10.toFixed(2)}`,
        showarrow: false,
        font: { size: 11, color: '#909296' },
      },
    ];

    // Test statistic diamond marker trace
    const data: Data[] = [
      {
        x: [testStat],
        y: [0.5],
        type: 'scatter' as const,
        mode: 'text+markers' as const,
        marker: {
          size: 18,
          color: isCoint ? '#51CF66' : '#FF6B6B',
          symbol: 'diamond',
          line: { width: 2, color: 'white' },
        },
        text: [`ADF = ${testStat.toFixed(3)}`],
        textposition: 'top center' as const,
        textfont: { size: 13, color: 'white' },
        showlegend: false,
        hoverinfo: 'text' as const,
        hovertext: `ADF statistic: ${testStat.toFixed(4)}`,
      },
    ];

    const layout: Partial<Layout> = {
      title: { text: 'ADF Test Statistic vs Critical Values' },
      height: 200,
      yaxis: { visible: false, range: [0, 1] },
      xaxis: {
        title: { text: '← More negative = stronger evidence against unit root' },
        range: [xMin, xMax],
      },
      margin: { t: 40, b: 50, l: 40, r: 40 },
      shapes,
      annotations,
    };

    return { data, layout };
  }, [cointData]);
}

// ---------------------------------------------------------------------------
// Regression Scatter Plot
// ---------------------------------------------------------------------------

function useRegressionScatter(
  cointData: CointegrationResponse | null,
  ohlcv1: OHLCVResponse | null,
  ohlcv2: OHLCVResponse | null,
  asset1: string,
  asset2: string,
) {
  return useMemo(() => {
    if (!cointData || !ohlcv1 || !ohlcv2) return null;

    const hedge = cointData.hedge_ratio;
    const intercept = cointData.intercept;
    const prices1 = ohlcv1.close;
    const prices2 = ohlcv2.close;

    // Use the shorter series length
    const len = Math.min(prices1.length, prices2.length);

    // Compute fitted values and create sorted pairs for the OLS line
    const pairs: Array<{ x: number; y: number; fitted: number }> = [];
    for (let i = 0; i < len; i++) {
      pairs.push({
        x: prices2[i],
        y: prices1[i],
        fitted: hedge * prices2[i] + intercept,
      });
    }

    // Sort by x for a clean regression line
    const sorted = [...pairs].sort((a, b) => a.x - b.x);

    const data: Data[] = [
      {
        x: pairs.map((p) => p.x),
        y: pairs.map((p) => p.y),
        type: 'scatter' as const,
        mode: 'markers' as const,
        marker: { size: 4, opacity: 0.4 },
        name: 'Price pairs',
      },
      {
        x: sorted.map((p) => p.x),
        y: sorted.map((p) => p.fitted),
        type: 'scatter' as const,
        mode: 'lines' as const,
        line: { color: '#FF6B6B', width: 3 },
        name: `OLS: ${asset1} = ${hedge.toFixed(2)} × ${asset2} + ${intercept.toFixed(0)}`,
      },
    ];

    const layout: Partial<Layout> = {
      title: { text: `Regression: ${asset1} vs ${asset2}` },
      xaxis: { title: { text: `${asset2} (EUR)` } },
      yaxis: { title: { text: `${asset1} (EUR)` } },
      height: 380,
      hovermode: 'closest' as const,
      legend: { orientation: 'h' as const, yanchor: 'bottom' as const, y: 1.02 },
    };

    return { data, layout };
  }, [cointData, ohlcv1, ohlcv2, asset1, asset2]);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function StepCointegrationTest({
  cointegrationData,
  ohlcv1,
  ohlcv2,
  loading,
  asset1,
  asset2,
}: StepCointegrationTestProps) {
  const adfChart = useADFNumberLine(cointegrationData);
  const regressionChart = useRegressionScatter(
    cointegrationData, ohlcv1, ohlcv2, asset1, asset2,
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
            Select a pair using the dropdowns above to see the cointegration
            test results.
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
          <Skeleton height={80} radius="md" animate />
          <Skeleton height={200} radius="md" animate />
          <Skeleton height={380} radius="md" animate />
          <Skeleton height={100} radius="md" animate />
        </Stack>
      </Paper>
    );
  }

  // ── Data state ─────────────────────────────────────────────────────────

  const coint = cointegrationData;
  if (!coint) {
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

  const isCoint = coint.is_cointegrated;
  const pVal = coint.p_value;
  const testStat = coint.cointegration_score;
  const hedge = coint.hedge_ratio;

  return (
    <Paper shadow="sm" p="xl" radius="md" withBorder>
      <Stack gap="lg">
        <StepHeader />

        {/* Traffic light pass/fail alert */}
        <Alert
          color={isCoint ? 'green' : 'orange'}
          variant="light"
          radius="md"
        >
          <Group gap="sm" wrap="wrap">
            <Text fw={600} size="md">
              {isCoint ? '✓ PASS' : '✗ FAIL'}:{' '}
              {asset1} × {asset2}{' '}
              {isCoint ? 'are' : 'are NOT'} cointegrated
            </Text>
            <Badge
              variant="light"
              color={isCoint ? 'green' : 'red'}
              size="lg"
            >
              p = {pVal.toFixed(4)}
            </Badge>
          </Group>
          <Text size="sm" c="dimmed" mt={4}>
            The p-value of {pVal.toFixed(4)} is{' '}
            {pVal < 0.05 ? 'below' : 'above'} 0.05.{' '}
            {pVal < 0.05
              ? 'This means there is strong statistical evidence that the spread between these assets reverts to its mean — the foundation of pairs trading.'
              : 'This means we cannot confidently say the spread mean-reverts. The relationship may exist but is not statistically significant at the 5% level.'}
          </Text>
        </Alert>

        {/* Fail note for non-cointegrated pairs */}
        {!isCoint && (
          <Alert
            icon={<IconInfoCircle size={20} />}
            color="blue"
            variant="light"
            radius="md"
          >
            This pair didn&apos;t pass the cointegration test — but that&apos;s
            fine. Understanding why a pair fails is just as educational as
            understanding why one passes. The charts below still show you what
            the test looks for.
          </Alert>
        )}

        {/* ADF number line chart */}
        {adfChart && (
          <>
            <PlotlyChart data={adfChart.data} layout={adfChart.layout} />
            <Text size="sm" c="dimmed">
              The ADF test statistic ({testStat.toFixed(3)}) shows how strongly
              the spread is pulled back toward its mean. More negative = stronger
              pull. The colored zones show the critical values —{' '}
              {isCoint
                ? 'the diamond falls in the green zone, confirming stationarity.'
                : 'the diamond is in the red zone, meaning the evidence is not strong enough.'}
            </Text>
          </>
        )}

        {/* Regression scatter plot */}
        {regressionChart && (
          <>
            <PlotlyChart data={regressionChart.data} layout={regressionChart.layout} />
            <Text size="sm" c="dimmed">
              Each dot is one point in time where {asset2} was at price X and{' '}
              {asset1} was at price Y. The red line is the best fit — its slope (
              {hedge.toFixed(2)}) is the hedge ratio used to construct the spread.
            </Text>
          </>
        )}

        {/* Hedge ratio card */}
        <Paper p="md" radius="md" withBorder style={{ backgroundColor: 'var(--mantine-color-dark-7)' }}>
          <Stack gap="xs">
            <Title order={5}>Hedge Ratio</Title>
            <Group gap="md">
              <Badge color="violet" variant="filled" size="xl">
                β = {hedge.toFixed(4)}
              </Badge>
              <Text size="sm">
                For every 1 unit of {asset2}, hold {hedge.toFixed(2)} units of{' '}
                {asset1}.
              </Text>
            </Group>
            <Text size="sm" c="dimmed">
              The hedge ratio comes from the OLS regression slope. It tells you
              how to size your positions so the spread between them is as
              stationary as possible. If the hedge ratio is 20, you&apos;d need
              €20 of the first asset for every €1 of the second.
            </Text>
          </Stack>
        </Paper>

        {/* Educational panel */}
        <EducationalPanel
          intuition={
            <Text size="sm">
              Imagine a drunk person and their dog walking home. The person
              staggers randomly, but the dog — attached by a leash — can only
              wander so far before being pulled back. The cointegration test
              checks whether the &quot;leash&quot; between two asset prices is
              real: does the gap between them always snap back, or can it stretch
              forever?
              <br />
              <br />
              The ADF test looks for this &quot;snap-back&quot; force. A strongly
              negative test statistic means there&apos;s a strong pull back
              toward the mean — like a short, tight leash.
            </Text>
          }
          mechanics={
            <Stack gap="xs">
              <Text size="sm" fw={500}>
                The Engle-Granger <GlossaryLink term="cointegration" /> test
                works in two steps:
              </Text>
              <List size="sm" spacing="xs">
                <List.Item>
                  <Text size="sm" fw={500} span>Step 1: Regression</Text>
                  <Text size="sm" span>
                    {' '}— Regress {asset1} on {asset2} to find the{' '}
                    <GlossaryLink term="hedge ratio" /> (β = {hedge.toFixed(4)}). The
                    regression line shows the long-run equilibrium
                    relationship.
                  </Text>
                </List.Item>
                <List.Item>
                  <Text size="sm" fw={500} span>Step 2: </Text>
                  <GlossaryLink term="ADF test" />
                  <Text size="sm" span>
                    {' '}on residuals — The residuals (spread) from step 1 are
                    tested for stationarity. If the spread is stationary, the
                    pair is cointegrated.
                  </Text>
                </List.Item>
              </List>
              <Code block>
{`spread_t = ${asset1}_t − β × ${asset2}_t − α
H₀: spread has a unit root (non-stationary)
H₁: spread is stationary (mean-reverting)`}
              </Code>
              <Text size="sm" c="dimmed">
                The ADF test null hypothesis is &quot;the spread has a unit
                root&quot; (i.e., it&apos;s non-stationary). We want to REJECT
                this — a p-value &lt; 0.05 means the spread is stationary.
              </Text>
            </Stack>
          }
          pairSpecific={
            <Stack gap="xs">
              <Text size="sm" fw={500}>
                Test statistic: {testStat.toFixed(4)} | p-value:{' '}
                {pVal.toFixed(4)} | Hedge ratio: {hedge.toFixed(4)}
              </Text>
              <Text size="sm" c="dimmed">
                {isCoint
                  ? `The test statistic (${testStat.toFixed(3)}) is more negative than the 5% critical value — strong evidence that the spread is stationary. The hedge ratio of ${hedge.toFixed(2)} means for position sizing, you'd hold ~${hedge.toFixed(1)}× as much ${asset1} as ${asset2}.`
                  : `The test statistic (${testStat.toFixed(3)}) is not negative enough to reject the null. The spread may drift without reverting — pairs trading on this pair carries higher risk. Try different timeframes or asset combinations.`}
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
      <IconFlask size={28} stroke={1.5} color="var(--mantine-color-blue-5)" />
      <div>
        <Title order={3}>Cointegration Test</Title>
        <Text c="dimmed" size="sm">
          Test whether the spread between two assets is stationary
        </Text>
      </div>
    </Group>
  );
}
