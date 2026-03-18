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
  IconBulb,
  IconChartDots3,
  IconCheck,
  IconPlayerPlay,
  IconRosetteDiscountCheck,
  IconTarget,
} from '@tabler/icons-react';
import PlotlyChart from '@/components/charts/PlotlyChart';
import {
  buildBacktestSearchParams,
  postZScoreThreshold,
  toEurSymbol,
  type ZScoreThresholdResponse,
} from '@/lib/api';
import type { Data, Layout } from 'plotly.js';

interface Props {
  asset1: string;
  asset2: string;
  timeframe: string;
}

const TAKEAWAY_COLOR = { green: 'teal', yellow: 'yellow', red: 'red' } as const;

function fmt(value: number | null, digits = 2): string {
  if (value === null || value === undefined) return '—';
  return value.toFixed(digits);
}

function buildRecommendationHref(result: ZScoreThresholdResponse): string | null {
  if (!result.recommended_backtest_params) return null;
  const params = buildBacktestSearchParams(result.recommended_backtest_params);
  params.set('source', 'research');
  params.set('module', result.module);
  return `/backtest?${params.toString()}`;
}

function buildChart(result: ZScoreThresholdResponse): { data: Data[]; layout: Partial<Layout> } {
  const entries = result.results.map((r) => r.entry);
  const exits = result.results.map((r) => r.exit);
  const trades = result.results.map((r) => r.total_trades);
  const maxTrades = Math.max(...trades, 1);

  return {
    data: [
      {
        type: 'scatter',
        mode: 'markers',
        x: entries,
        y: exits,
        marker: {
          size: trades.map((t) => Math.max(8, (t / maxTrades) * 30)),
          color: trades,
          colorscale: 'Viridis',
          showscale: true,
          colorbar: { title: { text: 'Trades' }, tickfont: { color: '#909296' }, titlefont: { color: '#909296' } },
        },
        text: result.results.map((r) => `Entry: ${r.entry}σ, Exit: ${r.exit}σ, Trades: ${r.total_trades}`),
        hoverinfo: 'text',
        name: 'Threshold combos',
      } as Data,
    ],
    layout: {
      title: { text: 'Entry vs exit threshold — bubble = trade count' },
      height: 400,
      xaxis: { title: { text: 'Entry threshold (σ)' } },
      yaxis: { title: { text: 'Exit threshold (σ)' } },
    },
  };
}

function LoadingState() {
  return (
    <Stack gap="lg">
      <SimpleGrid cols={{ base: 1, sm: 3 }}>
        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} height={96} radius="md" animate />)}
      </SimpleGrid>
      <Skeleton height={400} radius="md" animate />
      <Skeleton height={240} radius="md" animate />
    </Stack>
  );
}

function StatCard({ title, value, subtitle }: { title: string; value: string; subtitle: string }) {
  return (
    <Paper p="md" radius="lg" withBorder style={{ background: 'linear-gradient(180deg, rgba(17,24,39,0.92) 0%, rgba(11,15,23,0.98) 100%)', borderColor: 'rgba(148,163,184,0.18)' }}>
      <Text size="xs" tt="uppercase" fw={700} c="dimmed">{title}</Text>
      <Title order={3} mt={6}>{value}</Title>
      <Text size="xs" c="dimmed" mt={6}>{subtitle}</Text>
    </Paper>
  );
}

export default function ZScoreThresholdPanel({ asset1, asset2, timeframe }: Props) {
  const [daysBack, setDaysBack] = useState(365);
  const [lookbackWindow, setLookbackWindow] = useState(60);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ZScoreThresholdResponse | null>(null);

  const chart = useMemo(() => (result ? buildChart(result) : null), [result]);
  const recommendationHref = useMemo(() => (result ? buildRecommendationHref(result) : null), [result]);

  async function handleRun() {
    if (!asset1 || !asset2) {
      setError('Select both assets in the global header before running research.');
      return;
    }
    if (asset1 === asset2) {
      setError('Select two different assets.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await postZScoreThreshold({
        asset1: toEurSymbol(asset1),
        asset2: toEurSymbol(asset2),
        timeframe,
        days_back: daysBack,
        lookback_window: lookbackWindow,
      });
      setResult(res);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Z-score threshold sweep failed';
      console.error('Research z-score threshold sweep failed:', err);
      setError(msg);
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  const bestCombo = result
    ? (() => {
        const withTrades = result.results.filter((r) => r.total_trades > 0);
        if (withTrades.length === 0) return null;
        return withTrades.reduce((a, b) => (a.total_trades > b.total_trades ? a : b));
      })()
    : null;

  return (
    <Stack gap="lg">
      <Paper
        p="lg" radius="xl" withBorder
        style={{
          background: 'radial-gradient(circle at top left, rgba(34,197,94,0.12), transparent 35%), linear-gradient(135deg, rgba(10,14,22,0.98), rgba(15,23,42,0.96))',
          borderColor: 'rgba(34, 197, 94, 0.18)',
        }}
      >
        <Stack gap="md">
          <Group justify="space-between" align="flex-start">
            <Box maw={720}>
              <Group gap="xs" mb="sm">
                <Badge variant="light" color="green">Handoff module</Badge>
              </Group>
              <Title order={3}>Z-Score Threshold Sweep</Title>
              <Text c="dimmed" mt={6}>
                Sweep entry and exit z-score thresholds to find the combination that generates
                the most trading signals. The best combo feeds directly into the backtester.
              </Text>
            </Box>
            <ThemeIcon size={54} radius="xl" variant="light" color="green" style={{ boxShadow: '0 0 40px rgba(34,197,94,0.16)' }}>
              <IconTarget size={28} stroke={1.6} />
            </ThemeIcon>
          </Group>
          <Group align="flex-end" gap="md" wrap="wrap">
            <NumberInput label="History (days)" value={daysBack} onChange={(v) => { if (typeof v === 'number') setDaysBack(v); }} min={30} max={3650} step={30} w={140} />
            <NumberInput label="Lookback window" value={lookbackWindow} onChange={(v) => { if (typeof v === 'number') setLookbackWindow(v); }} min={10} max={500} step={5} w={150} />
            <Button leftSection={<IconPlayerPlay size={16} />} onClick={handleRun} loading={loading} size="md" radius="xl" styles={{ root: { background: 'linear-gradient(135deg, rgba(16,185,129,0.95), rgba(6,182,212,0.95))' } }}>
              Sweep thresholds
            </Button>
          </Group>
        </Stack>
      </Paper>

      {error && <Alert color="red" title="Research request failed" icon={<IconAlertTriangle size={18} />}>{error}</Alert>}
      {loading && <LoadingState />}

      {!loading && !result && (
        <Paper p="xl" radius="xl" withBorder>
          <Stack align="center" gap="xs">
            <IconChartDots3 size={44} style={{ opacity: 0.35 }} />
            <Title order={4}>No results yet</Title>
            <Text c="dimmed" ta="center" maw={560}>
              Run the sweep to test all entry/exit threshold combinations and discover
              which produces the most tradeable signals.
            </Text>
          </Stack>
        </Paper>
      )}

      {!loading && result && (
        <Stack gap="lg">
          <Alert color={TAKEAWAY_COLOR[result.takeaway.severity]} variant="light" radius="lg" title="Research takeaway" icon={<IconBulb size={18} />}>
            {result.takeaway.text}
          </Alert>

          <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
            <StatCard
              title="Best combo"
              value={bestCombo ? `${bestCombo.entry}σ / ${bestCombo.exit}σ` : '—'}
              subtitle={bestCombo ? `${bestCombo.total_trades} trades generated` : 'No trades found'}
            />
            <StatCard title="Combos tested" value={String(result.results.length)} subtitle="Entry × exit combinations" />
            <StatCard
              title="Max trades"
              value={bestCombo ? String(bestCombo.total_trades) : '0'}
              subtitle="Most trades from any combo"
            />
          </SimpleGrid>

          {chart && (
            <Paper p="md" radius="xl" withBorder>
              <Group gap="sm" mb="xs"><IconChartDots3 size={18} /><Text fw={600}>Threshold sweep bubble chart</Text></Group>
              <PlotlyChart data={chart.data} layout={chart.layout} />
            </Paper>
          )}

          {recommendationHref && result.recommended_backtest_params && (
            <Paper p="lg" radius="xl" withBorder>
              <Group justify="space-between" mb="sm" gap="md">
                <div>
                  <Group gap="xs" mb={4}>
                    <IconRosetteDiscountCheck size={18} />
                    <Text fw={700}>Recommended thresholds</Text>
                  </Group>
                  <Text c="dimmed" size="sm">
                    Entry {fmt(result.recommended_backtest_params.strategy.entry_threshold, 1)}σ,
                    exit {fmt(result.recommended_backtest_params.strategy.exit_threshold, 1)}σ
                    produced the most trading signals. The link carries the full preset.
                  </Text>
                </div>
                <Button component={Link} href={recommendationHref} rightSection={<IconArrowRight size={16} />} radius="xl" size="md">
                  Use recommended thresholds
                </Button>
              </Group>
              <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
                <Alert color="teal" variant="outline" title="Why these thresholds" icon={<IconCheck size={16} />}>
                  Entry {fmt(result.recommended_backtest_params.strategy.entry_threshold, 1)}σ /
                  exit {fmt(result.recommended_backtest_params.strategy.exit_threshold, 1)}σ
                  generated {bestCombo?.total_trades ?? 0} trades with avg duration {fmt(bestCombo?.avg_duration ?? null, 1)} bars.
                </Alert>
                <Alert color="blue" variant="outline" title="Backtest preset" icon={<IconArrowRight size={16} />}>
                  Lookback {result.recommended_backtest_params.strategy.lookback_window} bars,
                  stop-loss {fmt(result.recommended_backtest_params.strategy.stop_loss, 1)}σ,
                  capital €{fmt(result.recommended_backtest_params.strategy.initial_capital, 0)}.
                </Alert>
              </SimpleGrid>
            </Paper>
          )}

          <Paper p="md" radius="xl" withBorder>
            <Table.ScrollContainer minWidth={700}>
              <Table striped highlightOnHover withTableBorder withColumnBorders>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Entry (σ)</Table.Th>
                    <Table.Th>Exit (σ)</Table.Th>
                    <Table.Th>Total trades</Table.Th>
                    <Table.Th>Avg duration</Table.Th>
                    <Table.Th>Max duration</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {result.results.map((row, i) => (
                    <Table.Tr
                      key={i}
                      style={
                        bestCombo && row.entry === bestCombo.entry && row.exit === bestCombo.exit
                          ? { backgroundColor: 'rgba(94, 234, 212, 0.08)' }
                          : undefined
                      }
                    >
                      <Table.Td>
                        <Group gap="xs">
                          <Text fw={700}>{row.entry}</Text>
                          {bestCombo && row.entry === bestCombo.entry && row.exit === bestCombo.exit && (
                            <Badge size="xs" color="teal" variant="light">Best</Badge>
                          )}
                        </Group>
                      </Table.Td>
                      <Table.Td>{row.exit}</Table.Td>
                      <Table.Td>{row.total_trades}</Table.Td>
                      <Table.Td>{fmt(row.avg_duration, 1)}</Table.Td>
                      <Table.Td>{row.max_duration ?? '—'}</Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Table.ScrollContainer>
          </Paper>
        </Stack>
      )}
    </Stack>
  );
}
