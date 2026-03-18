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
  IconChartLine,
  IconCheck,
  IconCoinBitcoin,
  IconPlayerPlay,
  IconRosetteDiscountCheck,
} from '@tabler/icons-react';
import PlotlyChart from '@/components/charts/PlotlyChart';
import {
  buildBacktestSearchParams,
  postTxCost,
  toEurSymbol,
  type TxCostResponse,
} from '@/lib/api';
import type { Data, Layout } from 'plotly.js';

interface Props {
  asset1: string;
  asset2: string;
  timeframe: string;
}

const TAKEAWAY_COLOR = { green: 'teal', yellow: 'yellow', red: 'red' } as const;
const BITVAVO_FEE = 0.25; // 0.25% one-way

function fmt(value: number, digits = 2): string {
  return value.toFixed(digits);
}

function buildRecommendationHref(result: TxCostResponse): string | null {
  if (!result.recommended_backtest_params) return null;
  const params = buildBacktestSearchParams(result.recommended_backtest_params);
  params.set('source', 'research');
  params.set('module', result.module);
  return `/backtest?${params.toString()}`;
}

function buildChart(result: TxCostResponse): { data: Data[]; layout: Partial<Layout> } {
  const feePcts = result.results.map((r) => r.fee_pct);
  const netProfPcts = result.results.map((r) => r.net_profitable_pct);

  return {
    data: [
      {
        type: 'scatter',
        mode: 'lines+markers',
        x: feePcts,
        y: netProfPcts,
        name: 'Net profitable %',
        line: { color: '#339AF0', width: 2.5 },
        marker: {
          size: feePcts.map((f) => (Math.abs(f - BITVAVO_FEE) < 0.001 ? 14 : 8)),
          color: feePcts.map((f) => (Math.abs(f - BITVAVO_FEE) < 0.001 ? '#5eead4' : '#339AF0')),
          line: {
            color: feePcts.map((f) => (Math.abs(f - BITVAVO_FEE) < 0.001 ? '#94fff0' : '#339AF0')),
            width: feePcts.map((f) => (Math.abs(f - BITVAVO_FEE) < 0.001 ? 2 : 1)),
          },
        },
        fill: 'tozeroy',
        fillcolor: 'rgba(51, 154, 240, 0.06)',
      } as Data,
    ],
    layout: {
      title: { text: 'Net profitable trades vs fee level' },
      height: 380,
      hovermode: 'x unified',
      xaxis: { title: { text: 'One-way fee (%)' } },
      yaxis: { title: { text: 'Net profitable (%)' }, range: [0, 105] },
      shapes: [
        {
          type: 'line',
          x0: BITVAVO_FEE,
          x1: BITVAVO_FEE,
          y0: 0,
          y1: 1,
          yref: 'paper',
          line: { color: 'rgba(148, 255, 238, 0.9)', width: 2, dash: 'dash' },
        },
      ],
      annotations: [
        {
          x: BITVAVO_FEE,
          y: 1,
          yref: 'paper',
          text: 'Bitvavo 0.25%',
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
        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} height={96} radius="md" animate />)}
      </SimpleGrid>
      <Skeleton height={380} radius="md" animate />
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

export default function TxCostPanel({ asset1, asset2, timeframe }: Props) {
  const [daysBack, setDaysBack] = useState(365);
  const [entryThreshold, setEntryThreshold] = useState(2.0);
  const [exitThreshold, setExitThreshold] = useState(0.5);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TxCostResponse | null>(null);

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
      const res = await postTxCost({
        asset1: toEurSymbol(asset1),
        asset2: toEurSymbol(asset2),
        timeframe,
        days_back: daysBack,
        entry_threshold: entryThreshold,
        exit_threshold: exitThreshold,
      });
      setResult(res);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Transaction cost analysis failed';
      console.error('Research tx cost analysis failed:', err);
      setError(msg);
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  const bitvavoRow = result
    ? result.results.find((r) => Math.abs(r.fee_pct - BITVAVO_FEE) < 0.001)
    : null;

  return (
    <Stack gap="lg">
      <Paper
        p="lg" radius="xl" withBorder
        style={{
          background: 'radial-gradient(circle at top left, rgba(32,201,151,0.12), transparent 35%), linear-gradient(135deg, rgba(10,14,22,0.98), rgba(15,23,42,0.96))',
          borderColor: 'rgba(32, 201, 151, 0.18)',
        }}
      >
        <Stack gap="md">
          <Group justify="space-between" align="flex-start">
            <Box maw={720}>
              <Group gap="xs" mb="sm"><Badge variant="light" color="teal">Handoff module</Badge></Group>
              <Title order={3}>Transaction Cost Impact</Title>
              <Text c="dimmed" mt={6}>
                See how different fee levels erode profitability. The Bitvavo fee (0.25%)
                is marked on the chart so you can see exactly where your exchange sits.
              </Text>
            </Box>
            <ThemeIcon size={54} radius="xl" variant="light" color="teal" style={{ boxShadow: '0 0 40px rgba(32,201,151,0.16)' }}>
              <IconCoinBitcoin size={28} stroke={1.6} />
            </ThemeIcon>
          </Group>
          <Group align="flex-end" gap="md" wrap="wrap">
            <NumberInput label="History (days)" value={daysBack} onChange={(v) => { if (typeof v === 'number') setDaysBack(v); }} min={30} max={3650} step={30} w={130} />
            <NumberInput label="Entry σ" value={entryThreshold} onChange={(v) => { if (typeof v === 'number') setEntryThreshold(v); }} min={0.5} max={5} step={0.25} decimalScale={2} w={100} />
            <NumberInput label="Exit σ" value={exitThreshold} onChange={(v) => { if (typeof v === 'number') setExitThreshold(v); }} min={0.1} max={3} step={0.1} decimalScale={2} w={100} />
            <Button leftSection={<IconPlayerPlay size={16} />} onClick={handleRun} loading={loading} size="md" radius="xl" styles={{ root: { background: 'linear-gradient(135deg, rgba(16,185,129,0.95), rgba(6,182,212,0.95))' } }}>
              Analyze costs
            </Button>
          </Group>
        </Stack>
      </Paper>

      {error && <Alert color="red" title="Research request failed" icon={<IconAlertTriangle size={18} />}>{error}</Alert>}
      {loading && <LoadingState />}

      {!loading && !result && (
        <Paper p="xl" radius="xl" withBorder>
          <Stack align="center" gap="xs">
            <IconChartLine size={44} style={{ opacity: 0.35 }} />
            <Title order={4}>No results yet</Title>
            <Text c="dimmed" ta="center" maw={560}>
              Run the analysis to see how transaction costs at different fee levels
              affect the profitability of mean-reversion trades.
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
              title="Bitvavo profitability"
              value={bitvavoRow ? `${fmt(bitvavoRow.net_profitable_pct)}%` : '—'}
              subtitle="Net profitable trades at 0.25% fee"
            />
            <StatCard
              title="Total trades"
              value={bitvavoRow ? String(bitvavoRow.total_trades) : '—'}
              subtitle="Signals at current thresholds"
            />
            <StatCard
              title="Avg spread"
              value={bitvavoRow ? `${fmt(bitvavoRow.avg_spread_pct, 3)}%` : '—'}
              subtitle="Average spread capture per trade"
            />
          </SimpleGrid>

          {chart && (
            <Paper p="md" radius="xl" withBorder>
              <Group gap="sm" mb="xs"><IconChartLine size={18} /><Text fw={600}>Profitability vs fee level</Text></Group>
              <PlotlyChart data={chart.data} layout={chart.layout} />
            </Paper>
          )}

          {recommendationHref && result.recommended_backtest_params && (
            <Paper p="lg" radius="xl" withBorder>
              <Group justify="space-between" mb="sm" gap="md">
                <div>
                  <Group gap="xs" mb={4}>
                    <IconRosetteDiscountCheck size={18} />
                    <Text fw={700}>Bitvavo fee preset</Text>
                  </Group>
                  <Text c="dimmed" size="sm">
                    Backtest with the Bitvavo 0.25% fee already baked in, along with your
                    entry/exit thresholds.
                  </Text>
                </div>
                <Button component={Link} href={recommendationHref} rightSection={<IconArrowRight size={16} />} radius="xl" size="md">
                  Use Bitvavo fee settings
                </Button>
              </Group>
              <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
                <Alert color="teal" variant="outline" title="Fee model" icon={<IconCheck size={16} />}>
                  One-way fee 0.25% → round-trip {fmt(BITVAVO_FEE * 2)}%.
                  {bitvavoRow ? ` ${bitvavoRow.profitable_trades} of ${bitvavoRow.total_trades} trades remain profitable.` : ''}
                </Alert>
                <Alert color="blue" variant="outline" title="Strategy preset" icon={<IconArrowRight size={16} />}>
                  Entry {fmt(result.recommended_backtest_params.strategy.entry_threshold, 1)}σ,
                  exit {fmt(result.recommended_backtest_params.strategy.exit_threshold, 1)}σ,
                  lookback {result.recommended_backtest_params.strategy.lookback_window} bars.
                </Alert>
              </SimpleGrid>
            </Paper>
          )}

          <Paper p="md" radius="xl" withBorder>
            <Table.ScrollContainer minWidth={800}>
              <Table striped highlightOnHover withTableBorder withColumnBorders>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Fee (%)</Table.Th>
                    <Table.Th>Round-trip (%)</Table.Th>
                    <Table.Th>Total trades</Table.Th>
                    <Table.Th>Profitable</Table.Th>
                    <Table.Th>Net profitable (%)</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {result.results.map((row) => (
                    <Table.Tr
                      key={row.fee_pct}
                      style={
                        Math.abs(row.fee_pct - BITVAVO_FEE) < 0.001
                          ? { backgroundColor: 'rgba(94, 234, 212, 0.08)' }
                          : undefined
                      }
                    >
                      <Table.Td>
                        <Group gap="xs">
                          <Text fw={700}>{fmt(row.fee_pct, 3)}</Text>
                          {Math.abs(row.fee_pct - BITVAVO_FEE) < 0.001 && (
                            <Badge size="xs" color="teal" variant="light">Bitvavo</Badge>
                          )}
                        </Group>
                      </Table.Td>
                      <Table.Td>{fmt(row.round_trip_pct, 3)}</Table.Td>
                      <Table.Td>{row.total_trades}</Table.Td>
                      <Table.Td>{row.profitable_trades}</Table.Td>
                      <Table.Td>{fmt(row.net_profitable_pct)}</Table.Td>
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
