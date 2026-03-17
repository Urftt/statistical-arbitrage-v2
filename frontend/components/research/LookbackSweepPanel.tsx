'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import {
  Alert,
  Badge,
  Box,
  Button,
  Group,
  NumberInput,
  Paper,
  SimpleGrid,
  Skeleton,
  Stack,
  Table,
  Text,
  ThemeIcon,
  Title,
} from '@mantine/core';
import {
  IconAlertTriangle,
  IconArrowRight,
  IconBinaryTree2,
  IconBulb,
  IconChartHistogram,
  IconCheck,
  IconFlask2,
  IconRosetteDiscountCheck,
} from '@tabler/icons-react';
import PlotlyChart from '@/components/charts/PlotlyChart';
import {
  buildBacktestSearchParams,
  postLookbackSweep,
  toEurSymbol,
  type LookbackSweepResponse,
} from '@/lib/api';
import type { Data, Layout } from 'plotly.js';

interface LookbackSweepPanelProps {
  asset1: string;
  asset2: string;
  timeframe: string;
}

const TAKEAWAY_COLOR = {
  green: 'teal',
  yellow: 'yellow',
  red: 'red',
} as const;

function fmt(value: number, digits = 2): string {
  return value.toFixed(digits);
}

function buildRecommendationHref(result: LookbackSweepResponse): string {
  const params = buildBacktestSearchParams(result.recommended_backtest_params);
  params.set('source', 'research');
  params.set('module', result.module);
  params.set('recommended_window', String(result.recommended_result.window));
  return `/backtest?${params.toString()}`;
}

function buildSweepChart(result: LookbackSweepResponse): {
  data: Data[];
  layout: Partial<Layout>;
} {
  const recommendedWindow = result.recommended_result.window;
  const windows = result.results.map((row) => row.window);

  return {
    data: [
      {
        type: 'bar',
        x: windows,
        y: result.results.map((row) => row.crossings_2),
        name: '±2 crossings',
        marker: {
          color: result.results.map((row) =>
            row.window === recommendedWindow
              ? 'rgba(94, 234, 212, 0.92)'
              : 'rgba(51, 154, 240, 0.7)'
          ),
          line: {
            color: result.results.map((row) =>
              row.window === recommendedWindow
                ? 'rgba(148, 255, 238, 1)'
                : 'rgba(51, 154, 240, 1)'
            ),
            width: 1.2,
          },
        },
      } as Data,
      {
        type: 'scatter',
        mode: 'lines+markers',
        x: windows,
        y: result.results.map((row) => row.autocorrelation),
        name: 'Autocorrelation',
        yaxis: 'y2',
        line: { color: '#ffd166', width: 2 },
        marker: { size: 8, color: '#ffd166' },
      } as Data,
      {
        type: 'scatter',
        mode: 'lines+markers',
        x: windows,
        y: result.results.map((row) => row.zscore_std),
        name: 'Z-score σ',
        yaxis: 'y2',
        line: { color: '#ff6b6b', width: 2, dash: 'dot' },
        marker: { size: 7, color: '#ff6b6b' },
      } as Data,
    ],
    layout: {
      title: { text: 'Lookback quality sweep' },
      height: 360,
      barmode: 'group',
      hovermode: 'x unified',
      xaxis: { title: { text: 'Lookback window (bars)' } },
      yaxis: { title: { text: 'Threshold crossings' } },
      yaxis2: {
        title: { text: 'Signal quality diagnostics' },
        overlaying: 'y',
        side: 'right',
      },
      legend: { orientation: 'h', yanchor: 'bottom', y: 1.02 },
      shapes: [
        {
          type: 'line',
          x0: recommendedWindow,
          x1: recommendedWindow,
          y0: 0,
          y1: 1,
          yref: 'paper',
          line: { color: 'rgba(148, 255, 238, 0.95)', width: 2, dash: 'dash' },
        },
      ],
      annotations: [
        {
          x: recommendedWindow,
          y: 1,
          yref: 'paper',
          text: `Recommended ${recommendedWindow}`,
          showarrow: false,
          xanchor: 'left',
          xshift: 8,
          font: { color: '#94fff0', size: 12 },
        },
      ],
    },
  };
}

function LoadingState() {
  return (
    <Stack gap="lg">
      <SimpleGrid cols={{ base: 1, sm: 3 }}>
        {Array.from({ length: 3 }).map((_, idx) => (
          <Skeleton key={idx} height={96} radius="md" animate />
        ))}
      </SimpleGrid>
      <Skeleton height={360} radius="md" animate />
      <Skeleton height={240} radius="md" animate />
    </Stack>
  );
}

function StatCard({
  title,
  value,
  subtitle,
}: {
  title: string;
  value: string;
  subtitle: string;
}) {
  return (
    <Paper
      p="md"
      radius="lg"
      withBorder
      style={{
        background:
          'linear-gradient(180deg, rgba(17,24,39,0.92) 0%, rgba(11,15,23,0.98) 100%)',
        borderColor: 'rgba(148, 163, 184, 0.18)',
      }}
    >
      <Text size="xs" tt="uppercase" fw={700} c="dimmed">
        {title}
      </Text>
      <Title order={3} mt={6}>
        {value}
      </Title>
      <Text size="xs" c="dimmed" mt={6}>
        {subtitle}
      </Text>
    </Paper>
  );
}

export default function LookbackSweepPanel({
  asset1,
  asset2,
  timeframe,
}: LookbackSweepPanelProps) {
  const [daysBack, setDaysBack] = useState<number>(365);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<LookbackSweepResponse | null>(null);

  const chart = useMemo(() => (result ? buildSweepChart(result) : null), [result]);
  const pairLabel = asset1 && asset2 ? `${asset1}/EUR × ${asset2}/EUR` : null;

  async function handleRun() {
    if (!asset1 || !asset2) {
      setError('Select both assets in the global header before running research.');
      return;
    }

    if (asset1 === asset2) {
      setError('Select two different assets so the sweep compares a real pair.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await postLookbackSweep({
        asset1: toEurSymbol(asset1),
        asset2: toEurSymbol(asset2),
        timeframe,
        days_back: daysBack,
      });
      setResult(response);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Lookback sweep request failed';
      console.error('Research lookback sweep failed:', err);
      setError(message);
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Stack gap="lg">
      <Paper
        p="lg"
        radius="xl"
        withBorder
        style={{
          background:
            'radial-gradient(circle at top left, rgba(34,197,94,0.12), transparent 35%), linear-gradient(135deg, rgba(10,14,22,0.98), rgba(15,23,42,0.96))',
          borderColor: 'rgba(45, 212, 191, 0.18)',
          overflow: 'hidden',
        }}
      >
        <Stack gap="md">
          <Group justify="space-between" align="flex-start">
            <Box maw={720}>
              <Group gap="xs" mb="sm">
                <Badge variant="light" color="teal">
                  First live research module
                </Badge>
                {pairLabel ? (
                  <Badge variant="outline" color="blue">
                    {pairLabel} · {timeframe}
                  </Badge>
                ) : null}
              </Group>
              <Title order={3}>Evidence first, execution second</Title>
              <Text c="dimmed" mt={6}>
                Sweep the rolling lookback window on the currently selected pair,
                inspect the diagnostics, then hand the best preset straight into the
                real backtester without retyping anything.
              </Text>
            </Box>

            <ThemeIcon
              size={54}
              radius="xl"
              variant="light"
              color="teal"
              style={{ boxShadow: '0 0 40px rgba(45, 212, 191, 0.16)' }}
            >
              <IconFlask2 size={28} stroke={1.6} />
            </ThemeIcon>
          </Group>

          <Group align="flex-end" gap="md" wrap="wrap">
            <NumberInput
              label="History window (days)"
              description="Same sample window used for both research and the handoff preset"
              value={daysBack}
              onChange={(value) => {
                if (typeof value === 'number') setDaysBack(value);
              }}
              min={30}
              max={3650}
              step={30}
              w={220}
            />
            <Button
              leftSection={<IconBinaryTree2 size={16} />}
              onClick={handleRun}
              loading={loading}
              size="md"
              radius="xl"
              styles={{
                root: {
                  background:
                    'linear-gradient(135deg, rgba(16,185,129,0.95), rgba(6,182,212,0.95))',
                },
              }}
            >
              Run lookback sweep
            </Button>
            <Text c="dimmed" size="sm">
              Pair and timeframe stay synced to the global dashboard header.
            </Text>
          </Group>
        </Stack>
      </Paper>

      {error ? (
        <Alert color="red" title="Research request failed" icon={<IconAlertTriangle size={18} />}>
          {error}
        </Alert>
      ) : null}

      {loading ? <LoadingState /> : null}

      {!loading && !result ? (
        <Paper p="xl" radius="xl" withBorder>
          <Stack align="center" gap="xs">
            <IconChartHistogram size={44} style={{ opacity: 0.35 }} />
            <Title order={4}>No sweep results yet</Title>
            <Text c="dimmed" ta="center" maw={560}>
              Choose a pair in the header, run the live lookback-window sweep, and
              this page will expose the research takeaway plus a ready-to-use
              backtest preset.
            </Text>
          </Stack>
        </Paper>
      ) : null}

      {!loading && result ? (
        <Stack gap="lg">
          <Alert
            color={TAKEAWAY_COLOR[result.takeaway.severity]}
            variant="light"
            radius="lg"
            title="Research takeaway"
            icon={<IconBulb size={18} />}
          >
            {result.takeaway.text}
          </Alert>

          <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
            <StatCard
              title="Recommended lookback"
              value={`${result.recommended_result.window} bars`}
              subtitle={`${result.recommended_result.crossings_2} threshold crossings at ±2`}
            />
            <StatCard
              title="Observations analyzed"
              value={String(result.observations)}
              subtitle={`${result.days_back} trailing days on ${result.timeframe} candles`}
            />
            <StatCard
              title="Full-sample hedge ratio"
              value={fmt(result.hedge_ratio, 4)}
              subtitle="Used to build the research spread during the sweep"
            />
          </SimpleGrid>

          {chart ? (
            <Paper p="md" radius="xl" withBorder>
              <Group gap="sm" mb="xs">
                <IconChartHistogram size={18} />
                <Text fw={600}>Sweep diagnostics</Text>
              </Group>
              <PlotlyChart data={chart.data} layout={chart.layout} />
            </Paper>
          ) : null}

          <Paper p="lg" radius="xl" withBorder>
            <Group justify="space-between" mb="sm" gap="md">
              <div>
                <Group gap="xs" mb={4}>
                  <IconRosetteDiscountCheck size={18} />
                  <Text fw={700}>Recommended preset</Text>
                </Group>
                <Text c="dimmed" size="sm">
                  The strongest candidate for this sample is a {result.recommended_result.window}
                  -bar z-score window. The deep link below carries the full backtest
                  preset — pair, timeframe, history window, and strategy parameters.
                </Text>
              </div>
              <Button
                component={Link}
                href={buildRecommendationHref(result)}
                rightSection={<IconArrowRight size={16} />}
                radius="xl"
                size="md"
              >
                Use recommended settings
              </Button>
            </Group>

            <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md" mb="md">
              <Alert color="teal" variant="outline" title="Why this preset" icon={<IconCheck size={16} />}>
                {result.asset1} vs {result.asset2} showed {result.recommended_result.crossings_2}{' '}
                usable ±2 crossings with autocorrelation {fmt(result.recommended_result.autocorrelation, 3)}
                {' '}and z-score standard deviation {fmt(result.recommended_result.zscore_std, 3)}.
              </Alert>
              <Alert color="blue" variant="outline" title="What gets handed off" icon={<IconArrowRight size={16} />}>
                Entry {fmt(result.recommended_backtest_params.strategy.entry_threshold, 1)}σ,
                exit {fmt(result.recommended_backtest_params.strategy.exit_threshold, 1)}σ,
                stop-loss {fmt(result.recommended_backtest_params.strategy.stop_loss, 1)}σ,
                capital €{fmt(result.recommended_backtest_params.strategy.initial_capital, 0)},
                position size {fmt(result.recommended_backtest_params.strategy.position_size * 100, 0)}%.
              </Alert>
            </SimpleGrid>

            <Table.ScrollContainer minWidth={760}>
              <Table striped highlightOnHover withTableBorder withColumnBorders>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Window</Table.Th>
                    <Table.Th>±2 Crossings</Table.Th>
                    <Table.Th>Autocorr</Table.Th>
                    <Table.Th>Skewness</Table.Th>
                    <Table.Th>Kurtosis</Table.Th>
                    <Table.Th>Z-score σ</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {result.results.map((row) => (
                    <Table.Tr
                      key={row.window}
                      style={
                        row.window === result.recommended_result.window
                          ? { backgroundColor: 'rgba(94, 234, 212, 0.08)' }
                          : undefined
                      }
                    >
                      <Table.Td>
                        <Group gap="xs">
                          <Text fw={700}>{row.window}</Text>
                          {row.window === result.recommended_result.window ? (
                            <Badge size="xs" color="teal" variant="light">
                              Recommended
                            </Badge>
                          ) : null}
                        </Group>
                      </Table.Td>
                      <Table.Td>{row.crossings_2}</Table.Td>
                      <Table.Td>{fmt(row.autocorrelation, 3)}</Table.Td>
                      <Table.Td>{fmt(row.skewness, 3)}</Table.Td>
                      <Table.Td>{fmt(row.kurtosis, 3)}</Table.Td>
                      <Table.Td>{fmt(row.zscore_std, 3)}</Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Table.ScrollContainer>
          </Paper>
        </Stack>
      ) : null}
    </Stack>
  );
}
