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
  IconChartLine,
  IconPlayerPlay,
  IconTimeline,
} from '@tabler/icons-react';
import PlotlyChart from '@/components/charts/PlotlyChart';
import {
  postRollingStability,
  toEurSymbol,
  type RollingStabilityResponse,
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

function buildChart(result: RollingStabilityResponse): { data: Data[]; layout: Partial<Layout> } {
  const timestamps = result.results.map((r) => new Date(r.timestamp).toISOString());
  const pValues = result.results.map((r) => r.p_value);
  const cointegrated = result.results.map((r) => r.is_cointegrated);

  // Color p-values: green when cointegrated, red when not
  const colors = cointegrated.map((c) =>
    c ? 'rgba(94, 234, 212, 0.7)' : 'rgba(255, 107, 107, 0.4)'
  );

  return {
    data: [
      {
        type: 'scatter',
        mode: 'lines',
        x: timestamps,
        y: pValues,
        name: 'P-value',
        line: { color: '#339AF0', width: 1.5 },
        fill: 'tozeroy',
        fillcolor: 'rgba(51, 154, 240, 0.08)',
      } as Data,
      {
        type: 'bar',
        x: timestamps,
        y: cointegrated.map((c) => (c ? 0.05 : 0)),
        name: 'Cointegrated',
        marker: { color: colors },
        opacity: 0.3,
        yaxis: 'y',
        showlegend: false,
      } as Data,
    ],
    layout: {
      title: { text: 'Rolling cointegration p-value over time' },
      height: 380,
      hovermode: 'x unified',
      xaxis: { title: { text: 'Date' } },
      yaxis: { title: { text: 'P-value' }, range: [0, 1] },
      shapes: [
        {
          type: 'line',
          x0: timestamps[0],
          x1: timestamps[timestamps.length - 1],
          y0: 0.05,
          y1: 0.05,
          line: { color: 'rgba(255, 107, 107, 0.8)', width: 2, dash: 'dash' },
        },
      ],
      annotations: [
        {
          x: timestamps[timestamps.length - 1],
          y: 0.05,
          text: 'p = 0.05',
          showarrow: false,
          yshift: 12,
          font: { color: '#ff6b6b', size: 11 },
        },
      ],
    },
  };
}

function LoadingState() {
  return (
    <Stack gap="lg">
      <SimpleGrid cols={{ base: 1, sm: 3 }}>
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} height={96} radius="md" animate />
        ))}
      </SimpleGrid>
      <Skeleton height={380} radius="md" animate />
      <Skeleton height={240} radius="md" animate />
    </Stack>
  );
}

function StatCard({ title, value, subtitle }: { title: string; value: string; subtitle: string }) {
  return (
    <Paper
      p="md"
      radius="lg"
      withBorder
      style={{
        background: 'linear-gradient(180deg, rgba(17,24,39,0.92) 0%, rgba(11,15,23,0.98) 100%)',
        borderColor: 'rgba(148, 163, 184, 0.18)',
      }}
    >
      <Text size="xs" tt="uppercase" fw={700} c="dimmed">{title}</Text>
      <Title order={3} mt={6}>{value}</Title>
      <Text size="xs" c="dimmed" mt={6}>{subtitle}</Text>
    </Paper>
  );
}

export default function RollingStabilityPanel({ asset1, asset2, timeframe }: Props) {
  const [daysBack, setDaysBack] = useState(365);
  const [window, setWindow] = useState(90);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RollingStabilityResponse | null>(null);

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
      const res = await postRollingStability({
        asset1: toEurSymbol(asset1),
        asset2: toEurSymbol(asset2),
        timeframe,
        days_back: daysBack,
        window,
      });
      setResult(res);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Rolling stability request failed';
      console.error('Research rolling stability failed:', err);
      setError(msg);
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  const pctCointegrated = result
    ? ((result.results.filter((r) => r.is_cointegrated).length / result.results.length) * 100).toFixed(1)
    : null;
  const avgPValue = result
    ? (result.results.reduce((sum, r) => sum + (r.p_value ?? 0), 0) / result.results.length).toFixed(4)
    : null;
  const hedgeRange = result
    ? (() => {
        const ratios = result.results.map((r) => r.hedge_ratio).filter((v): v is number => v !== null);
        if (ratios.length === 0) return '—';
        return `${Math.min(...ratios).toFixed(3)} – ${Math.max(...ratios).toFixed(3)}`;
      })()
    : null;

  return (
    <Stack gap="lg">
      <Paper
        p="lg"
        radius="xl"
        withBorder
        style={{
          background: 'radial-gradient(circle at top left, rgba(51,154,240,0.10), transparent 35%), linear-gradient(135deg, rgba(10,14,22,0.98), rgba(15,23,42,0.96))',
          borderColor: 'rgba(51, 154, 240, 0.18)',
        }}
      >
        <Stack gap="md">
          <Group justify="space-between" align="flex-start">
            <Box maw={720}>
              <Group gap="xs" mb="sm">
                <Badge variant="light" color="blue">Diagnostic module</Badge>
              </Group>
              <Title order={3}>Rolling Cointegration Stability</Title>
              <Text c="dimmed" mt={6}>
                Slide a window through time to see whether cointegration holds steadily
                or flickers in and out — a regime-change detector for your pair.
              </Text>
            </Box>
            <ThemeIcon size={54} radius="xl" variant="light" color="blue" style={{ boxShadow: '0 0 40px rgba(51,154,240,0.16)' }}>
              <IconTimeline size={28} stroke={1.6} />
            </ThemeIcon>
          </Group>
          <Group align="flex-end" gap="md" wrap="wrap">
            <NumberInput label="History (days)" value={daysBack} onChange={(v) => { if (typeof v === 'number') setDaysBack(v); }} min={30} max={3650} step={30} w={160} />
            <NumberInput label="Rolling window" value={window} onChange={(v) => { if (typeof v === 'number') setWindow(v); }} min={30} max={500} step={10} w={160} />
            <Button leftSection={<IconPlayerPlay size={16} />} onClick={handleRun} loading={loading} size="md" radius="xl">
              Run analysis
            </Button>
          </Group>
        </Stack>
      </Paper>

      {error && (
        <Alert color="red" title="Research request failed" icon={<IconAlertTriangle size={18} />}>{error}</Alert>
      )}

      {loading && <LoadingState />}

      {!loading && !result && (
        <Paper p="xl" radius="xl" withBorder>
          <Stack align="center" gap="xs">
            <IconChartLine size={44} style={{ opacity: 0.35 }} />
            <Title order={4}>No results yet</Title>
            <Text c="dimmed" ta="center" maw={560}>
              Choose a pair, set the rolling window size, and run the analysis to see how
              cointegration stability evolves over time.
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
            <StatCard title="Windows cointegrated" value={`${pctCointegrated}%`} subtitle={`Of ${result.results.length} rolling windows`} />
            <StatCard title="Average p-value" value={avgPValue ?? '—'} subtitle="Mean across all windows" />
            <StatCard title="Hedge ratio range" value={hedgeRange ?? '—'} subtitle="Min – max across rolling windows" />
          </SimpleGrid>

          {chart && (
            <Paper p="md" radius="xl" withBorder>
              <Group gap="sm" mb="xs">
                <IconChartLine size={18} />
                <Text fw={600}>Rolling p-value timeline</Text>
              </Group>
              <PlotlyChart data={chart.data} layout={chart.layout} />
            </Paper>
          )}

          <Paper p="md" radius="xl" withBorder>
            <Table.ScrollContainer minWidth={700}>
              <Table striped highlightOnHover withTableBorder withColumnBorders>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Timestamp</Table.Th>
                    <Table.Th>P-value</Table.Th>
                    <Table.Th>Cointegrated</Table.Th>
                    <Table.Th>Hedge ratio</Table.Th>
                    <Table.Th>Test statistic</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {result.results.slice(0, 50).map((row, i) => (
                    <Table.Tr key={i}>
                      <Table.Td>{new Date(row.timestamp).toLocaleDateString()}</Table.Td>
                      <Table.Td>{fmt(row.p_value)}</Table.Td>
                      <Table.Td>
                        <Badge size="xs" color={row.is_cointegrated ? 'teal' : 'red'} variant="light">
                          {row.is_cointegrated ? 'Yes' : 'No'}
                        </Badge>
                      </Table.Td>
                      <Table.Td>{fmt(row.hedge_ratio)}</Table.Td>
                      <Table.Td>{fmt(row.test_statistic, 3)}</Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Table.ScrollContainer>
            {result.results.length > 50 && (
              <Text size="xs" c="dimmed" mt="xs">Showing first 50 of {result.results.length} rows</Text>
            )}
          </Paper>
        </Stack>
      )}
    </Stack>
  );
}
