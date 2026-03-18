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
  IconPlayerPlay,
  IconTestPipe,
} from '@tabler/icons-react';
import PlotlyChart from '@/components/charts/PlotlyChart';
import {
  postOOSValidation,
  toEurSymbol,
  type OOSValidationResponse,
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

function buildChart(result: OOSValidationResponse): { data: Data[]; layout: Partial<Layout> } {
  const labels = result.results.map((r) => `${(r.split_ratio * 100).toFixed(0)}%`);

  return {
    data: [
      {
        type: 'bar',
        x: labels,
        y: result.results.map((r) => r.formation_p_value),
        name: 'Formation (in-sample)',
        marker: { color: 'rgba(51, 154, 240, 0.8)' },
      } as Data,
      {
        type: 'bar',
        x: labels,
        y: result.results.map((r) => r.trading_p_value),
        name: 'Trading (out-of-sample)',
        marker: { color: 'rgba(94, 234, 212, 0.8)' },
      } as Data,
    ],
    layout: {
      title: { text: 'In-sample vs out-of-sample p-values' },
      height: 360,
      barmode: 'group',
      hovermode: 'x unified',
      xaxis: { title: { text: 'Formation period split ratio' } },
      yaxis: { title: { text: 'P-value' } },
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
      legend: { orientation: 'h', yanchor: 'bottom', y: 1.02 },
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
      <Skeleton height={360} radius="md" animate />
      <Skeleton height={200} radius="md" animate />
    </Stack>
  );
}

function StatCard({ title, value, subtitle }: { title: string; value: string; subtitle: string }) {
  return (
    <Paper
      p="md" radius="lg" withBorder
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

export default function OOSValidationPanel({ asset1, asset2, timeframe }: Props) {
  const [daysBack, setDaysBack] = useState(365);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<OOSValidationResponse | null>(null);

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
      const res = await postOOSValidation({
        asset1: toEurSymbol(asset1),
        asset2: toEurSymbol(asset2),
        timeframe,
        days_back: daysBack,
      });
      setResult(res);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'OOS validation request failed';
      console.error('Research OOS validation failed:', err);
      setError(msg);
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  const splitsOK = result
    ? result.results.filter((r) => r.formation_cointegrated && r.trading_cointegrated).length
    : 0;
  const hedgeDrift = result
    ? (() => {
        const drifts = result.results.map((r) => Math.abs(r.formation_hedge_ratio - r.trading_hedge_ratio));
        return Math.max(...drifts).toFixed(4);
      })()
    : '—';

  return (
    <Stack gap="lg">
      <Paper
        p="lg" radius="xl" withBorder
        style={{
          background: 'radial-gradient(circle at top left, rgba(204,93,232,0.10), transparent 35%), linear-gradient(135deg, rgba(10,14,22,0.98), rgba(15,23,42,0.96))',
          borderColor: 'rgba(204, 93, 232, 0.18)',
        }}
      >
        <Stack gap="md">
          <Group justify="space-between" align="flex-start">
            <Box maw={720}>
              <Group gap="xs" mb="sm">
                <Badge variant="light" color="violet">Diagnostic module</Badge>
              </Group>
              <Title order={3}>Out-of-Sample Validation</Title>
              <Text c="dimmed" mt={6}>
                Split the data into formation and trading periods at different ratios.
                If cointegration survives out-of-sample, the pair is more likely tradeable.
              </Text>
            </Box>
            <ThemeIcon size={54} radius="xl" variant="light" color="violet" style={{ boxShadow: '0 0 40px rgba(204,93,232,0.16)' }}>
              <IconTestPipe size={28} stroke={1.6} />
            </ThemeIcon>
          </Group>
          <Group align="flex-end" gap="md" wrap="wrap">
            <NumberInput label="History (days)" value={daysBack} onChange={(v) => { if (typeof v === 'number') setDaysBack(v); }} min={30} max={3650} step={30} w={160} />
            <Button leftSection={<IconPlayerPlay size={16} />} onClick={handleRun} loading={loading} size="md" radius="xl" color="violet">
              Run validation
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
              Run the validation to test whether in-sample cointegration holds when
              evaluated on unseen trading data.
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
            <StatCard title="Splits tested" value={String(result.results.length)} subtitle="Different formation/trading splits" />
            <StatCard title="OOS confirmed" value={`${splitsOK} / ${result.results.length}`} subtitle="Splits where both periods cointegrated" />
            <StatCard title="Max hedge drift" value={hedgeDrift} subtitle="Largest formation→trading hedge ratio change" />
          </SimpleGrid>

          {chart && (
            <Paper p="md" radius="xl" withBorder>
              <Group gap="sm" mb="xs">
                <IconChartBar size={18} />
                <Text fw={600}>Formation vs trading p-values</Text>
              </Group>
              <PlotlyChart data={chart.data} layout={chart.layout} />
            </Paper>
          )}

          <Paper p="md" radius="xl" withBorder>
            <Table.ScrollContainer minWidth={800}>
              <Table striped highlightOnHover withTableBorder withColumnBorders>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Split</Table.Th>
                    <Table.Th>Formation p</Table.Th>
                    <Table.Th>Trading p</Table.Th>
                    <Table.Th>Formation</Table.Th>
                    <Table.Th>Trading</Table.Th>
                    <Table.Th>Hedge drift</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {result.results.map((row) => (
                    <Table.Tr key={row.split_ratio}>
                      <Table.Td fw={700}>{(row.split_ratio * 100).toFixed(0)}%</Table.Td>
                      <Table.Td>{fmt(row.formation_p_value)}</Table.Td>
                      <Table.Td>{fmt(row.trading_p_value)}</Table.Td>
                      <Table.Td>
                        <Badge size="xs" color={row.formation_cointegrated ? 'teal' : 'red'} variant="light">
                          {row.formation_cointegrated ? 'Yes' : 'No'}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        <Badge size="xs" color={row.trading_cointegrated ? 'teal' : 'red'} variant="light">
                          {row.trading_cointegrated ? 'Yes' : 'No'}
                        </Badge>
                      </Table.Td>
                      <Table.Td>{fmt(Math.abs(row.formation_hedge_ratio - row.trading_hedge_ratio))}</Table.Td>
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
