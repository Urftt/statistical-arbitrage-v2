'use client';

import { useMemo, useState } from 'react';
import {
  Container,
  Title,
  Text,
  Badge,
  Group,
  Paper,
  SimpleGrid,
  Button,
  Alert,
  Stack,
  NumberInput,
  Skeleton,
} from '@mantine/core';
import {
  IconAlertTriangle,
  IconChartHistogram,
  IconChartScatter,
  IconChartLine,
  IconCheck,
  IconMicroscope,
} from '@tabler/icons-react';
import { usePairContext } from '@/contexts/PairContext';
import {
  fetchOHLCV,
  postCointegration,
  type CointegrationResponse,
  type OHLCVResponse,
} from '@/lib/api';
import PlotlyChart from '@/components/charts/PlotlyChart';
import { PLOTLY_DARK_TEMPLATE } from '@/lib/theme';
import type { Data, Layout, Shape } from 'plotly.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AlignedPriceData {
  timestamps: number[];
  asset1Close: number[];
  asset2Close: number[];
}

interface StatCardProps {
  title: string;
  value: string;
  subtitle: string;
  color: 'green' | 'red' | 'blue' | 'yellow' | 'gray';
}

// ---------------------------------------------------------------------------
// Plotly theme helpers
// ---------------------------------------------------------------------------

const DARK_X_AXIS_STYLE = PLOTLY_DARK_TEMPLATE.layout.xaxis;
const DARK_Y_AXIS_STYLE = PLOTLY_DARK_TEMPLATE.layout.yaxis;

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

function toISO(timestamps: number[]): string[] {
  return timestamps.map((ts) => new Date(ts).toISOString());
}

function fmt(value: number | null | undefined, decimals: number): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return value.toFixed(decimals);
}

function formatHalfLife(value: number | null): string {
  if (value === null || value === undefined || !Number.isFinite(value) || value > 10000) {
    return '∞';
  }
  return value.toFixed(1);
}

function computeZScore(
  spread: (number | null)[],
  window: number
): (number | null)[] {
  const len = spread.length;
  const zscore: (number | null)[] = new Array(len).fill(null);

  for (let i = window; i < len; i++) {
    const current = spread[i];
    if (current === null || current === undefined) continue;

    const valid: number[] = [];
    for (let j = i - window; j < i; j++) {
      const point = spread[j];
      if (point !== null && point !== undefined) {
        valid.push(point);
      }
    }

    if (valid.length < 2) continue;

    const mean = valid.reduce((sum, value) => sum + value, 0) / valid.length;
    const variance =
      valid.reduce((sum, value) => sum + (value - mean) ** 2, 0) / valid.length;
    const std = Math.sqrt(variance);

    if (std < 1e-10) continue;
    zscore[i] = (current - mean) / std;
  }

  return zscore;
}

function alignPricesToTimestamps(
  analysisTimestamps: number[],
  ohlcv1: OHLCVResponse,
  ohlcv2: OHLCVResponse
): AlignedPriceData {
  const close1ByTs = new Map<number, number>();
  const close2ByTs = new Map<number, number>();

  ohlcv1.timestamps.forEach((ts, idx) => {
    close1ByTs.set(ts, ohlcv1.close[idx]);
  });
  ohlcv2.timestamps.forEach((ts, idx) => {
    close2ByTs.set(ts, ohlcv2.close[idx]);
  });

  const timestamps: number[] = [];
  const asset1Close: number[] = [];
  const asset2Close: number[] = [];

  for (const ts of analysisTimestamps) {
    const p1 = close1ByTs.get(ts);
    const p2 = close2ByTs.get(ts);

    if (p1 === undefined || p2 === undefined) continue;

    timestamps.push(ts);
    asset1Close.push(p1);
    asset2Close.push(p2);
  }

  return { timestamps, asset1Close, asset2Close };
}

function buildPriceChart(
  alignedPrices: AlignedPriceData,
  asset1: string,
  asset2: string
): { data: Data[]; layout: Partial<Layout> } {
  const x = toISO(alignedPrices.timestamps);

  const data: Data[] = [
    {
      x,
      y: alignedPrices.asset1Close,
      type: 'scatter' as const,
      mode: 'lines' as const,
      name: asset1,
      line: { width: 2, color: '#339AF0' },
      yaxis: 'y',
    },
    {
      x,
      y: alignedPrices.asset2Close,
      type: 'scatter' as const,
      mode: 'lines' as const,
      name: asset2,
      line: { width: 2, color: '#51CF66' },
      yaxis: 'y2',
    },
  ];

  const layout: Partial<Layout> = {
    title: { text: `Price Comparison: ${asset1} vs ${asset2}` },
    xaxis: { title: { text: 'Time' } },
    yaxis: { title: { text: `${asset1} (EUR)` }, side: 'left' },
    yaxis2: {
      ...DARK_Y_AXIS_STYLE,
      title: {
        text: `${asset2} (EUR)`,
        font: { ...DARK_Y_AXIS_STYLE.title.font },
      },
      side: 'right',
      overlaying: 'y',
    },
    height: 350,
    hovermode: 'x unified',
    legend: { orientation: 'h', yanchor: 'bottom', y: 1.02 },
  };

  return { data, layout };
}

function buildSpreadZScoreChart(
  analysis: CointegrationResponse,
  computedZScore: (number | null)[],
  zScoreWindow: number
): { data: Data[]; layout: Partial<Layout> } {
  const spreadX = toISO(analysis.timestamps);
  const zScorePoints = analysis.timestamps.reduce<{
    x: string[];
    y: number[];
  }>(
    (acc, ts, idx) => {
      const z = computedZScore[idx];
      if (z === null || z === undefined) return acc;
      acc.x.push(new Date(ts).toISOString());
      acc.y.push(z);
      return acc;
    },
    { x: [], y: [] }
  );

  const shapes: Array<Partial<Shape>> = [
    {
      type: 'rect',
      xref: 'paper',
      x0: 0,
      x1: 1,
      yref: 'y2',
      y0: 2.0,
      y1: 4.0,
      fillcolor: 'rgba(81, 207, 102, 0.08)',
      line: { width: 0 },
    },
    {
      type: 'rect',
      xref: 'paper',
      x0: 0,
      x1: 1,
      yref: 'y2',
      y0: -4.0,
      y1: -2.0,
      fillcolor: 'rgba(81, 207, 102, 0.08)',
      line: { width: 0 },
    },
    ...[
      { y: 2.0, color: '#51CF66', dash: 'dash' },
      { y: -2.0, color: '#51CF66', dash: 'dash' },
      { y: 0.5, color: '#FF922B', dash: 'dot' },
      { y: -0.5, color: '#FF922B', dash: 'dot' },
      { y: 0, color: 'rgba(255,255,255,0.28)', dash: 'solid' },
    ].map(
      ({ y, color, dash }) =>
        ({
          type: 'line',
          xref: 'paper',
          x0: 0,
          x1: 1,
          yref: 'y2',
          y0: y,
          y1: y,
          line: { color, width: 1.2, dash },
        }) as Partial<Shape>
    ),
  ];

  const data: Data[] = [
    {
      x: spreadX,
      y: analysis.spread,
      type: 'scatter' as const,
      mode: 'lines' as const,
      name: 'Spread',
      line: { color: '#339AF0', width: 1.6 },
      xaxis: 'x',
      yaxis: 'y',
    },
    {
      x: zScorePoints.x,
      y: zScorePoints.y,
      type: 'scatter' as const,
      mode: 'lines' as const,
      name: 'Z-Score',
      line: { color: '#FF6B6B', width: 1.6 },
      xaxis: 'x2',
      yaxis: 'y2',
    },
  ];

  const layout: Partial<Layout> = {
    title: { text: `Spread & Z-Score (window=${zScoreWindow})` },
    height: 500,
    hovermode: 'x unified',
    legend: { orientation: 'h', yanchor: 'bottom', y: 1.02 },
    xaxis: {
      title: { text: '' },
      domain: [0, 1],
      anchor: 'y',
      showticklabels: false,
    },
    xaxis2: {
      ...DARK_X_AXIS_STYLE,
      domain: [0, 1],
      anchor: 'y2',
      title: {
        text: 'Time',
        font: { ...DARK_X_AXIS_STYLE.title.font },
      },
    },
    yaxis: {
      title: { text: 'Spread' },
      domain: [0.6, 1.0],
      anchor: 'x',
    },
    yaxis2: {
      ...DARK_Y_AXIS_STYLE,
      domain: [0, 0.55],
      anchor: 'x2',
      title: {
        text: 'Z-Score',
        font: { ...DARK_Y_AXIS_STYLE.title.font },
      },
    },
    shapes,
  };

  return { data, layout };
}

function buildScatterChart(
  alignedPrices: AlignedPriceData,
  analysis: CointegrationResponse,
  asset1: string,
  asset2: string
): { data: Data[]; layout: Partial<Layout> } {
  const xValues = alignedPrices.asset2Close;
  const yValues = alignedPrices.asset1Close;

  const minX = Math.min(...xValues);
  const maxX = Math.max(...xValues);
  const regressionX = [minX, maxX];
  const regressionY = regressionX.map(
    (x) => analysis.hedge_ratio * x + analysis.intercept
  );

  const data: Data[] = [
    {
      x: xValues,
      y: yValues,
      type: 'scatter' as const,
      mode: 'markers' as const,
      name: 'Observed prices',
      marker: {
        size: 3,
        color: 'rgba(51, 154, 240, 0.45)',
      },
    },
    {
      x: regressionX,
      y: regressionY,
      type: 'scatter' as const,
      mode: 'lines' as const,
      name: `Regression (β=${analysis.hedge_ratio.toFixed(4)})`,
      line: { color: '#FF6B6B', width: 2, dash: 'dash' },
    },
  ];

  const layout: Partial<Layout> = {
    title: { text: `${asset1} vs ${asset2} Scatter + Regression` },
    xaxis: { title: { text: `${asset2} Close (EUR)` } },
    yaxis: { title: { text: `${asset1} Close (EUR)` } },
    height: 350,
    hovermode: 'closest',
    legend: { orientation: 'h', yanchor: 'bottom', y: 1.02 },
  };

  return { data, layout };
}

function buildDistributionChart(
  analysis: CointegrationResponse,
  computedZScore: (number | null)[]
): { data: Data[]; layout: Partial<Layout> } {
  const zScoreValues = computedZScore.filter(
    (value): value is number => value !== null && value !== undefined
  );
  const spreadValues = analysis.spread.filter(
    (value): value is number => value !== null && value !== undefined
  );

  const data: Data[] = [
    {
      x: spreadValues,
      type: 'histogram' as const,
      name: 'Spread',
      marker: {
        color: 'rgba(51, 154, 240, 0.72)',
        line: { color: 'rgba(51, 154, 240, 1)', width: 1 },
      },
      xaxis: 'x',
      yaxis: 'y',
      nbinsx: 50,
      showlegend: false,
    } as Data,
    {
      x: zScoreValues,
      type: 'histogram' as const,
      name: 'Z-Score',
      marker: {
        color: 'rgba(255, 107, 107, 0.72)',
        line: { color: 'rgba(255, 107, 107, 1)', width: 1 },
      },
      xaxis: 'x2',
      yaxis: 'y2',
      nbinsx: 50,
      showlegend: false,
    } as Data,
  ];

  const layout: Partial<Layout> = {
    title: { text: 'Distribution Histograms' },
    height: 350,
    bargap: 0.08,
    xaxis: {
      domain: [0, 0.45],
      title: { text: 'Spread' },
    },
    xaxis2: {
      ...DARK_X_AXIS_STYLE,
      domain: [0.55, 1.0],
      title: {
        text: 'Z-Score',
        font: { ...DARK_X_AXIS_STYLE.title.font },
      },
      anchor: 'y2',
    },
    yaxis: {
      title: { text: 'Count' },
      anchor: 'x',
    },
    yaxis2: {
      ...DARK_Y_AXIS_STYLE,
      title: {
        text: 'Count',
        font: { ...DARK_Y_AXIS_STYLE.title.font },
      },
      anchor: 'x2',
    },
    annotations: [
      {
        text: '<b>Spread Distribution</b>',
        xref: 'paper',
        yref: 'paper',
        x: 0.225,
        y: 1.12,
        showarrow: false,
        font: { size: 13, color: '#C1C2C5' },
      },
      {
        text: '<b>Z-Score Distribution</b>',
        xref: 'paper',
        yref: 'paper',
        x: 0.775,
        y: 1.12,
        showarrow: false,
        font: { size: 13, color: '#C1C2C5' },
      },
    ],
  };

  return { data, layout };
}

// ---------------------------------------------------------------------------
// UI helpers
// ---------------------------------------------------------------------------

function StatCard({ title, value, subtitle, color }: StatCardProps) {
  return (
    <Paper
      p="sm"
      radius="md"
      withBorder
      style={{ borderLeft: `3px solid var(--mantine-color-${color}-6)` }}
    >
      <Text c="dimmed" size="xs">
        {title}
      </Text>
      <Title order={4}>{value}</Title>
      <Text c="dimmed" size="xs">
        {subtitle}
      </Text>
    </Paper>
  );
}

function LoadingSection() {
  return (
    <Stack gap="lg">
      <SimpleGrid cols={{ base: 2, sm: 4, lg: 8 }} spacing="sm">
        {Array.from({ length: 8 }).map((_, idx) => (
          <Skeleton key={idx} height={84} radius="md" animate />
        ))}
      </SimpleGrid>
      <Skeleton height={350} radius="md" animate />
      <Skeleton height={500} radius="md" animate />
      <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="lg">
        <Skeleton height={350} radius="md" animate />
        <Skeleton height={350} radius="md" animate />
      </SimpleGrid>
    </Stack>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function DeepDivePage() {
  const { asset1, asset2, timeframe } = usePairContext();

  const [daysBack, setDaysBack] = useState<number>(90);
  const [zScoreWindow, setZScoreWindow] = useState<number>(60);

  const [analysis, setAnalysis] = useState<CointegrationResponse | null>(null);
  const [ohlcv1, setOhlcv1] = useState<OHLCVResponse | null>(null);
  const [ohlcv2, setOhlcv2] = useState<OHLCVResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const safeDaysBack = Number.isFinite(daysBack) ? Math.round(daysBack) : 90;
  const safeZScoreWindow = Number.isFinite(zScoreWindow)
    ? Math.round(zScoreWindow)
    : 60;

  const computedZScore = useMemo(() => {
    if (!analysis) return null;
    return computeZScore(analysis.spread, safeZScoreWindow);
  }, [analysis, safeZScoreWindow]);

  const alignedPrices = useMemo(() => {
    if (!analysis || !ohlcv1 || !ohlcv2) return null;
    return alignPricesToTimestamps(analysis.timestamps, ohlcv1, ohlcv2);
  }, [analysis, ohlcv1, ohlcv2]);

  const priceChart = useMemo(() => {
    if (!alignedPrices || !asset1 || !asset2) return null;
    return buildPriceChart(alignedPrices, asset1, asset2);
  }, [alignedPrices, asset1, asset2]);

  const spreadZScoreChart = useMemo(() => {
    if (!analysis || !computedZScore) return null;
    return buildSpreadZScoreChart(analysis, computedZScore, safeZScoreWindow);
  }, [analysis, computedZScore, safeZScoreWindow]);

  const scatterChart = useMemo(() => {
    if (!alignedPrices || !analysis || !asset1 || !asset2) return null;
    if (alignedPrices.asset1Close.length < 2 || alignedPrices.asset2Close.length < 2) {
      return null;
    }
    return buildScatterChart(alignedPrices, analysis, asset1, asset2);
  }, [alignedPrices, analysis, asset1, asset2]);

  const distributionChart = useMemo(() => {
    if (!analysis || !computedZScore) return null;
    return buildDistributionChart(analysis, computedZScore);
  }, [analysis, computedZScore]);

  async function handleAnalyze() {
    if (!asset1 || !asset2) {
      setValidationError('Select both assets in the header bar above.');
      return;
    }

    if (asset1 === asset2) {
      setValidationError('Select two different assets in the header bar above.');
      return;
    }

    setValidationError(null);
    setError(null);
    setAnalysis(null);
    setOhlcv1(null);
    setOhlcv2(null);
    setLoading(true);

    try {
      const symbol1 = `${asset1}/EUR`;
      const symbol2 = `${asset2}/EUR`;

      const [analysisResult, priceSeries1, priceSeries2] = await Promise.all([
        postCointegration({
          asset1: symbol1,
          asset2: symbol2,
          timeframe,
          days_back: safeDaysBack,
        }),
        fetchOHLCV(symbol1, timeframe, safeDaysBack),
        fetchOHLCV(symbol2, timeframe, safeDaysBack),
      ]);

      setAnalysis(analysisResult);
      setOhlcv1(priceSeries1);
      setOhlcv2(priceSeries2);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Deep Dive analysis failed';
      console.error(
        `Deep Dive: failed analysis for ${asset1}/${asset2} (${timeframe}, ${safeDaysBack}d):`,
        err
      );
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  const stats: StatCardProps[] =
    analysis && asset1 && asset2
      ? [
          {
            title: 'Cointegrated?',
            value: analysis.is_cointegrated ? '✅ Yes' : '❌ No',
            subtitle: `p = ${analysis.p_value.toFixed(4)}`,
            color: analysis.is_cointegrated ? 'green' : 'red',
          },
          {
            title: 'p-value',
            value: analysis.p_value.toFixed(4),
            subtitle: `Stat: ${analysis.cointegration_score.toFixed(2)}`,
            color: 'blue',
          },
          {
            title: 'Half-life',
            value: formatHalfLife(analysis.half_life),
            subtitle: 'periods',
            color: 'blue',
          },
          {
            title: 'Correlation',
            value: analysis.correlation.toFixed(3),
            subtitle: 'Pearson',
            color: 'blue',
          },
          {
            title: 'Hedge Ratio',
            value: analysis.hedge_ratio.toFixed(4),
            subtitle: `${asset1} = β × ${asset2}`,
            color: 'blue',
          },
          {
            title: 'Skewness',
            value: analysis.spread_properties.skewness.toFixed(2),
            subtitle: 'spread distribution',
            color:
              Math.abs(analysis.spread_properties.skewness) > 1 ? 'yellow' : 'blue',
          },
          {
            title: 'Kurtosis',
            value: analysis.spread_properties.kurtosis.toFixed(2),
            subtitle: 'excess (normal=0)',
            color: analysis.spread_properties.kurtosis > 3 ? 'yellow' : 'blue',
          },
          {
            title: 'Datapoints',
            value: String(analysis.timestamps.length),
            subtitle: 'overlapping candles',
            color: 'gray',
          },
        ]
      : [];

  return (
    <Container size="xl" py="md">
      <Stack gap="lg">
        <div>
          <Group gap="md" mb="xs">
            <Title order={2}>Pair Deep Dive</Title>
            <Badge variant="light" color="violet">
              Single Pair Analysis
            </Badge>
            {asset1 && asset2 ? (
              <Badge variant="outline" color="blue">
                {asset1} / {asset2} · {timeframe}
              </Badge>
            ) : null}
          </Group>
          <Text c="dimmed" size="sm">
            Complete analysis of one selected pair — cointegration, spread,
            z-scores, regression, and distribution diagnostics.
          </Text>
        </div>

        <Paper shadow="xs" p="lg" radius="md" withBorder>
          <Group align="flex-end" gap="md" wrap="wrap">
            <NumberInput
              label="History (days)"
              value={daysBack}
              onChange={(value) => {
                if (typeof value === 'number') setDaysBack(value);
              }}
              min={7}
              max={365}
              w={160}
            />
            <NumberInput
              label="Z-score window"
              value={zScoreWindow}
              onChange={(value) => {
                if (typeof value === 'number') setZScoreWindow(value);
              }}
              min={5}
              max={500}
              w={160}
            />
            <Button
              leftSection={<IconMicroscope size={16} />}
              onClick={handleAnalyze}
              loading={loading}
            >
              Analyze
            </Button>
            <Text c="dimmed" size="sm">
              Pair and timeframe are set in the header bar above.
            </Text>
          </Group>
        </Paper>

        {validationError ? (
          <Alert
            color="yellow"
            title="Invalid pair selection"
            icon={<IconAlertTriangle size={18} />}
          >
            {validationError}
          </Alert>
        ) : null}

        {error ? (
          <Alert
            color="red"
            title="Analysis failed"
            icon={<IconAlertTriangle size={18} />}
          >
            {error}
          </Alert>
        ) : null}

        {loading ? <LoadingSection /> : null}

        {!loading && analysis ? (
          <Stack gap="lg">
            <Alert
              color={analysis.is_cointegrated ? 'green' : 'blue'}
              title="Analysis complete"
              icon={analysis.is_cointegrated ? <IconCheck size={18} /> : <IconChartLine size={18} />}
            >
              {asset1} / {asset2} analyzed over the last {safeDaysBack} days at{' '}
              {timeframe}. p = {analysis.p_value.toFixed(4)}, correlation ={' '}
              {analysis.correlation.toFixed(3)}, half-life ={' '}
              {formatHalfLife(analysis.half_life)} periods.
            </Alert>

            <SimpleGrid cols={{ base: 2, sm: 4, lg: 8 }} spacing="sm">
              {stats.map((card) => (
                <StatCard
                  key={card.title}
                  title={card.title}
                  value={card.value}
                  subtitle={card.subtitle}
                  color={card.color}
                />
              ))}
            </SimpleGrid>

            {priceChart ? (
              <Paper p="md" radius="md" withBorder>
                <Group gap="sm" mb="xs">
                  <IconChartLine size={18} />
                  <Text fw={600}>Price Comparison</Text>
                </Group>
                <PlotlyChart data={priceChart.data} layout={priceChart.layout} />
              </Paper>
            ) : null}

            {spreadZScoreChart ? (
              <Paper p="md" radius="md" withBorder>
                <Group gap="sm" mb="xs">
                  <IconChartLine size={18} />
                  <Text fw={600}>Spread + Z-Score</Text>
                </Group>
                <PlotlyChart
                  data={spreadZScoreChart.data}
                  layout={spreadZScoreChart.layout}
                />
              </Paper>
            ) : null}

            <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="lg">
              {scatterChart ? (
                <Paper p="md" radius="md" withBorder>
                  <Group gap="sm" mb="xs">
                    <IconChartScatter size={18} />
                    <Text fw={600}>Scatter + Regression</Text>
                  </Group>
                  <PlotlyChart
                    data={scatterChart.data}
                    layout={scatterChart.layout}
                  />
                </Paper>
              ) : (
                <Paper p="md" radius="md" withBorder>
                  <Text fw={600} mb="xs">
                    Scatter + Regression
                  </Text>
                  <Alert color="yellow" icon={<IconAlertTriangle size={16} />}>
                    Not enough aligned price points to draw the regression view.
                  </Alert>
                </Paper>
              )}

              {distributionChart ? (
                <Paper p="md" radius="md" withBorder>
                  <Group gap="sm" mb="xs">
                    <IconChartHistogram size={18} />
                    <Text fw={600}>Distribution Histograms</Text>
                  </Group>
                  <PlotlyChart
                    data={distributionChart.data}
                    layout={distributionChart.layout}
                  />
                </Paper>
              ) : null}
            </SimpleGrid>
          </Stack>
        ) : null}

        {!loading && !analysis && !validationError && !error ? (
          <Paper p="xl" radius="md" withBorder>
            <Stack gap="xs" align="center">
              <IconMicroscope size={44} style={{ opacity: 0.35 }} />
              <Title order={4}>Ready to analyze a pair</Title>
              <Text c="dimmed" size="sm" ta="center">
                Choose asset 1, asset 2, and timeframe in the global header, then
                click Analyze to render summary stats and all four charts.
              </Text>
            </Stack>
          </Paper>
        ) : null}

        {!loading && analysis && computedZScore ? (
          <Text c="dimmed" size="xs">
            Z-score warm-up values are filtered until the first full {safeZScoreWindow}
            -period window is available, so the lower panel and histogram reflect
            only valid standardized spread values.
          </Text>
        ) : null}

        {!loading && analysis ? (
          <Text c="dimmed" size="xs">
            Diagnostics: API failures surface inline here and also log through{' '}
            <code>lib/api.ts</code> <code>apiFetch()</code>; the page additionally logs
            a pair/timeframe-specific Deep Dive error on fetch failure.
          </Text>
        ) : null}
      </Stack>
    </Container>
  );
}
