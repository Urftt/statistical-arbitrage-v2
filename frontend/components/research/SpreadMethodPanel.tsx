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
  IconLayersLinked,
  IconPlayerPlay,
} from '@tabler/icons-react';
import PlotlyChart from '@/components/charts/PlotlyChart';
import {
  postSpreadMethodComparison,
  toEurSymbol,
  type SpreadMethodResponse,
} from '@/lib/api';
import type { Data, Layout } from 'plotly.js';

interface Props {
  asset1: string;
  asset2: string;
  timeframe: string;
}

const TAKEAWAY_COLOR = { green: 'teal', yellow: 'yellow', red: 'red' } as const;

function fmt(value: number, digits = 4): string {
  return value.toFixed(digits);
}

function buildChart(result: SpreadMethodResponse): { data: Data[]; layout: Partial<Layout> } {
  const methods = result.results.map((r) => r.method);
  const pValues = result.results.map((r) => r.adf_p_value);
  const colors = result.results.map((r) =>
    r.is_stationary ? 'rgba(94, 234, 212, 0.85)' : 'rgba(255, 107, 107, 0.6)'
  );

  return {
    data: [
      {
        type: 'bar',
        x: methods,
        y: pValues,
        name: 'ADF p-value',
        marker: { color: colors },
        text: result.results.map((r) => (r.is_stationary ? '✓ Stationary' : '✗ Non-stationary')),
        textposition: 'outside',
      } as Data,
    ],
    layout: {
      title: { text: 'ADF stationarity p-values by spread method' },
      height: 360,
      hovermode: 'x unified',
      xaxis: { title: { text: 'Spread construction method' } },
      yaxis: { title: { text: 'ADF p-value' }, range: [0, Math.max(...pValues) * 1.3 + 0.05] },
      shapes: [
        {
          type: 'line',
          x0: -0.5,
          x1: methods.length - 0.5,
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

export default function SpreadMethodPanel({ asset1, asset2, timeframe }: Props) {
  const [daysBack, setDaysBack] = useState(365);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SpreadMethodResponse | null>(null);

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
      const res = await postSpreadMethodComparison({
        asset1: toEurSymbol(asset1),
        asset2: toEurSymbol(asset2),
        timeframe,
        days_back: daysBack,
      });
      setResult(res);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Spread method comparison failed';
      console.error('Research spread method comparison failed:', err);
      setError(msg);
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  const stationaryCount = result ? result.results.filter((r) => r.is_stationary).length : 0;
  const bestMethod = result
    ? (() => {
        const stationary = result.results.filter((r) => r.is_stationary);
        if (stationary.length === 0) return '—';
        return stationary.reduce((a, b) => (a.adf_p_value < b.adf_p_value ? a : b)).method;
      })()
    : '—';
  const stdRange = result
    ? (() => {
        const stds = result.results.map((r) => r.spread_std);
        return `${Math.min(...stds).toFixed(4)} – ${Math.max(...stds).toFixed(4)}`;
      })()
    : '—';

  return (
    <Stack gap="lg">
      <Paper
        p="lg" radius="xl" withBorder
        style={{
          background: 'radial-gradient(circle at top left, rgba(255,146,43,0.10), transparent 35%), linear-gradient(135deg, rgba(10,14,22,0.98), rgba(15,23,42,0.96))',
          borderColor: 'rgba(255, 146, 43, 0.18)',
        }}
      >
        <Stack gap="md">
          <Group justify="space-between" align="flex-start">
            <Box maw={720}>
              <Group gap="xs" mb="sm"><Badge variant="light" color="orange">Diagnostic module</Badge></Group>
              <Title order={3}>Spread Method Comparison</Title>
              <Text c="dimmed" mt={6}>
                Compare OLS, ratio, and other spread construction methods by their ADF stationarity
                p-value and statistical properties to pick the most mean-reverting spread.
              </Text>
            </Box>
            <ThemeIcon size={54} radius="xl" variant="light" color="orange" style={{ boxShadow: '0 0 40px rgba(255,146,43,0.16)' }}>
              <IconLayersLinked size={28} stroke={1.6} />
            </ThemeIcon>
          </Group>
          <Group align="flex-end" gap="md" wrap="wrap">
            <NumberInput label="History (days)" value={daysBack} onChange={(v) => { if (typeof v === 'number') setDaysBack(v); }} min={30} max={3650} step={30} w={160} />
            <Button leftSection={<IconPlayerPlay size={16} />} onClick={handleRun} loading={loading} size="md" radius="xl" color="orange">
              Compare methods
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
              Run the comparison to evaluate which spread construction method yields
              the most stationary (mean-reverting) spread for your pair.
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
            <StatCard title="Stationary methods" value={`${stationaryCount} / ${result.results.length}`} subtitle="Methods producing a stationary spread" />
            <StatCard title="Best method" value={bestMethod} subtitle="Lowest ADF p-value (most stationary)" />
            <StatCard title="Spread σ range" value={stdRange} subtitle="Std deviation across methods" />
          </SimpleGrid>

          {chart && (
            <Paper p="md" radius="xl" withBorder>
              <Group gap="sm" mb="xs"><IconChartBar size={18} /><Text fw={600}>ADF p-values by method</Text></Group>
              <PlotlyChart data={chart.data} layout={chart.layout} />
            </Paper>
          )}

          <Paper p="md" radius="xl" withBorder>
            <Table.ScrollContainer minWidth={800}>
              <Table striped highlightOnHover withTableBorder withColumnBorders>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Method</Table.Th>
                    <Table.Th>ADF statistic</Table.Th>
                    <Table.Th>ADF p-value</Table.Th>
                    <Table.Th>Stationary</Table.Th>
                    <Table.Th>Spread σ</Table.Th>
                    <Table.Th>Skewness</Table.Th>
                    <Table.Th>Kurtosis</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {result.results.map((row) => (
                    <Table.Tr key={row.method}>
                      <Table.Td fw={700}>{row.method}</Table.Td>
                      <Table.Td>{fmt(row.adf_statistic, 3)}</Table.Td>
                      <Table.Td>{fmt(row.adf_p_value)}</Table.Td>
                      <Table.Td>
                        <Badge size="xs" color={row.is_stationary ? 'teal' : 'red'} variant="light">
                          {row.is_stationary ? 'Yes' : 'No'}
                        </Badge>
                      </Table.Td>
                      <Table.Td>{fmt(row.spread_std)}</Table.Td>
                      <Table.Td>{fmt(row.spread_skewness, 3)}</Table.Td>
                      <Table.Td>{fmt(row.spread_kurtosis, 3)}</Table.Td>
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
