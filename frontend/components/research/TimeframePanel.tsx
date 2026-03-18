'use client';

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
  IconBulb,
  IconChartBar,
  IconClock,
  IconPlayerPlay,
} from '@tabler/icons-react';
import PlotlyChart from '@/components/charts/PlotlyChart';
import {
  postTimeframeComparison,
  toEurSymbol,
  type TimeframeResponse,
} from '@/lib/api';
import type { Data, Layout } from 'plotly.js';

interface Props {
  asset1: string;
  asset2: string;
  timeframe: string;
}

const TAKEAWAY_COLOR = { green: 'teal', yellow: 'yellow', red: 'red' } as const;

function fmt(value: number | null, digits = 4): string {
  if (value === null || value === undefined) return '—';
  return value.toFixed(digits);
}

function buildChart(result: TimeframeResponse): { data: Data[]; layout: Partial<Layout> } {
  const labels = result.results.map((r) => r.timeframe);
  const pValues = result.results.map((r) => r.p_value ?? 1);
  const colors = result.results.map((r) =>
    r.is_cointegrated ? 'rgba(94, 234, 212, 0.85)' : 'rgba(255, 107, 107, 0.6)'
  );

  return {
    data: [
      {
        type: 'bar',
        x: labels,
        y: pValues,
        name: 'P-value',
        marker: { color: colors, line: { color: colors.map((c) => c.replace('0.85', '1').replace('0.6', '1')), width: 1 } },
        text: result.results.map((r) => (r.is_cointegrated ? '✓' : '✗')),
        textposition: 'outside',
      } as Data,
    ],
    layout: {
      title: { text: 'Cointegration p-values by timeframe' },
      height: 360,
      hovermode: 'x unified',
      xaxis: { title: { text: 'Timeframe' } },
      yaxis: { title: { text: 'P-value' }, range: [0, Math.max(...pValues) * 1.2 + 0.05] },
      shapes: [
        {
          type: 'line',
          x0: -0.5,
          x1: labels.length - 0.5,
          y0: 0.05,
          y1: 0.05,
          line: { color: 'rgba(255, 107, 107, 0.7)', width: 2, dash: 'dash' },
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
      <Skeleton height={360} radius="md" animate />
      <Skeleton height={200} radius="md" animate />
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

export default function TimeframePanel({ asset1, asset2 }: Props) {
  const [daysBack, setDaysBack] = useState(365);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TimeframeResponse | null>(null);

  const chart = useMemo(() => (result ? buildChart(result) : null), [result]);

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
      const res = await postTimeframeComparison({
        asset1: toEurSymbol(asset1),
        asset2: toEurSymbol(asset2),
        days_back: daysBack,
      });
      setResult(res);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Timeframe comparison failed';
      console.error('Research timeframe comparison failed:', err);
      setError(msg);
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  const cointCount = result ? result.results.filter((r) => r.is_cointegrated).length : 0;
  const bestTf = result
    ? (() => {
        const coint = result.results.filter((r) => r.is_cointegrated);
        if (coint.length === 0) return '—';
        return coint.reduce((a, b) => ((a.p_value ?? 1) < (b.p_value ?? 1) ? a : b)).timeframe;
      })()
    : '—';
  const halfLifeRange = result
    ? (() => {
        const hls = result.results.map((r) => r.half_life).filter((v): v is number => v !== null);
        if (hls.length === 0) return '—';
        return `${Math.min(...hls).toFixed(1)} – ${Math.max(...hls).toFixed(1)}`;
      })()
    : '—';

  return (
    <Stack gap="lg">
      <Paper
        p="lg" radius="xl" withBorder
        style={{
          background: 'radial-gradient(circle at top left, rgba(252,196,25,0.10), transparent 35%), linear-gradient(135deg, rgba(10,14,22,0.98), rgba(15,23,42,0.96))',
          borderColor: 'rgba(252, 196, 25, 0.18)',
        }}
      >
        <Stack gap="md">
          <Group justify="space-between" align="flex-start">
            <Box maw={720}>
              <Group gap="xs" mb="sm"><Badge variant="light" color="yellow">Diagnostic module</Badge></Group>
              <Title order={3}>Timeframe Comparison</Title>
              <Text c="dimmed" mt={6}>
                Compare cointegration quality across 15m, 1h, 4h, and 1d candles.
                A pair that is cointegrated on multiple timeframes is structurally stronger.
              </Text>
            </Box>
            <ThemeIcon size={54} radius="xl" variant="light" color="yellow" style={{ boxShadow: '0 0 40px rgba(252,196,25,0.16)' }}>
              <IconClock size={28} stroke={1.6} />
            </ThemeIcon>
          </Group>
          <Group align="flex-end" gap="md" wrap="wrap">
            <NumberInput label="History (days)" value={daysBack} onChange={(v) => { if (typeof v === 'number') setDaysBack(v); }} min={30} max={3650} step={30} w={160} />
            <Button leftSection={<IconPlayerPlay size={16} />} onClick={handleRun} loading={loading} size="md" radius="xl" color="yellow" variant="filled">
              Compare timeframes
            </Button>
          </Group>
        </Stack>
      </Paper>

      {error && <Alert color="red" title="Research request failed" icon={<IconAlertTriangle size={18} />}>{error}</Alert>}
      {loading && <LoadingState />}

      {!loading && !result && (
        <Paper p="xl" radius="xl" withBorder>
          <Stack align="center" gap="xs">
            <IconChartBar size={44} style={{ opacity: 0.35 }} />
            <Title order={4}>No results yet</Title>
            <Text c="dimmed" ta="center" maw={560}>
              Run the comparison to see whether your pair holds cointegration across multiple timeframes.
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
            <StatCard title="Timeframes cointegrated" value={`${cointCount} / ${result.results.length}`} subtitle="Across all tested timeframes" />
            <StatCard title="Best timeframe" value={bestTf} subtitle="Lowest p-value among cointegrated" />
            <StatCard title="Half-life range" value={halfLifeRange} subtitle="Bars across all timeframes" />
          </SimpleGrid>

          {chart && (
            <Paper p="md" radius="xl" withBorder>
              <Group gap="sm" mb="xs"><IconChartBar size={18} /><Text fw={600}>P-value by timeframe</Text></Group>
              <PlotlyChart data={chart.data} layout={chart.layout} />
            </Paper>
          )}

          <Paper p="md" radius="xl" withBorder>
            <Table.ScrollContainer minWidth={700}>
              <Table striped highlightOnHover withTableBorder withColumnBorders>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Timeframe</Table.Th>
                    <Table.Th>P-value</Table.Th>
                    <Table.Th>Cointegrated</Table.Th>
                    <Table.Th>Hedge ratio</Table.Th>
                    <Table.Th>Half-life</Table.Th>
                    <Table.Th>Datapoints</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {result.results.map((row) => (
                    <Table.Tr key={row.timeframe}>
                      <Table.Td fw={700}>{row.timeframe}</Table.Td>
                      <Table.Td>{fmt(row.p_value)}</Table.Td>
                      <Table.Td>
                        <Badge size="xs" color={row.is_cointegrated ? 'teal' : 'red'} variant="light">
                          {row.is_cointegrated ? 'Yes' : 'No'}
                        </Badge>
                      </Table.Td>
                      <Table.Td>{fmt(row.hedge_ratio)}</Table.Td>
                      <Table.Td>{fmt(row.half_life, 1)}</Table.Td>
                      <Table.Td>{row.n_datapoints.toLocaleString()}</Table.Td>
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
