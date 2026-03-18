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
  IconScale,
} from '@tabler/icons-react';
import PlotlyChart from '@/components/charts/PlotlyChart';
import {
  postCointMethodComparison,
  toEurSymbol,
  type CointMethodResponse,
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

function buildChart(result: CointMethodResponse): { data: Data[]; layout: Partial<Layout> } {
  const methods = result.results.map((r) => r.method);
  const stats = result.results.map((r) => Math.abs(r.statistic));
  const colors = result.results.map((r) =>
    r.is_cointegrated ? 'rgba(94, 234, 212, 0.85)' : 'rgba(255, 107, 107, 0.6)'
  );

  return {
    data: [
      {
        type: 'bar',
        y: methods,
        x: stats,
        orientation: 'h',
        name: 'Test statistic (abs)',
        marker: { color: colors },
        text: result.results.map((r) => (r.is_cointegrated ? '✓ Cointegrated' : '✗ Not cointegrated')),
        textposition: 'outside',
      } as Data,
    ],
    layout: {
      title: { text: 'Test statistics by method (absolute value)' },
      height: Math.max(260, result.results.length * 80 + 80),
      hovermode: 'y unified',
      xaxis: { title: { text: '|Test statistic|' } },
      yaxis: { title: { text: '' }, automargin: true },
    },
  };
}

function LoadingState() {
  return (
    <Stack gap="lg">
      <SimpleGrid cols={{ base: 1, sm: 2 }}>
        {Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} height={96} radius="md" animate />)}
      </SimpleGrid>
      <Skeleton height={300} radius="md" animate />
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

export default function CointMethodPanel({ asset1, asset2, timeframe }: Props) {
  const [daysBack, setDaysBack] = useState(365);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CointMethodResponse | null>(null);

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
      const res = await postCointMethodComparison({
        asset1: toEurSymbol(asset1),
        asset2: toEurSymbol(asset2),
        timeframe,
        days_back: daysBack,
      });
      setResult(res);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Cointegration method comparison failed';
      console.error('Research coint method comparison failed:', err);
      setError(msg);
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  const agreeCount = result
    ? (() => {
        const verdicts = result.results.map((r) => r.is_cointegrated);
        const allTrue = verdicts.every((v) => v);
        const allFalse = verdicts.every((v) => !v);
        if (allTrue || allFalse) return result.results.length;
        return verdicts.filter((v) => v).length;
      })()
    : 0;
  const unanimous = result
    ? result.results.every((r) => r.is_cointegrated)
      ? '✓ All agree: cointegrated'
      : result.results.every((r) => !r.is_cointegrated)
        ? '✗ All agree: not cointegrated'
        : 'Mixed verdict'
    : '—';

  return (
    <Stack gap="lg">
      <Paper
        p="lg" radius="xl" withBorder
        style={{
          background: 'radial-gradient(circle at top left, rgba(132,94,247,0.10), transparent 35%), linear-gradient(135deg, rgba(10,14,22,0.98), rgba(15,23,42,0.96))',
          borderColor: 'rgba(132, 94, 247, 0.18)',
        }}
      >
        <Stack gap="md">
          <Group justify="space-between" align="flex-start">
            <Box maw={720}>
              <Group gap="xs" mb="sm"><Badge variant="light" color="grape">Diagnostic module</Badge></Group>
              <Title order={3}>Cointegration Method Comparison</Title>
              <Text c="dimmed" mt={6}>
                Run both Engle-Granger and Johansen tests to see if they agree.
                Unanimous agreement gives stronger confidence in the cointegration relationship.
              </Text>
            </Box>
            <ThemeIcon size={54} radius="xl" variant="light" color="grape" style={{ boxShadow: '0 0 40px rgba(132,94,247,0.16)' }}>
              <IconScale size={28} stroke={1.6} />
            </ThemeIcon>
          </Group>
          <Group align="flex-end" gap="md" wrap="wrap">
            <NumberInput label="History (days)" value={daysBack} onChange={(v) => { if (typeof v === 'number') setDaysBack(v); }} min={30} max={3650} step={30} w={160} />
            <Button leftSection={<IconPlayerPlay size={16} />} onClick={handleRun} loading={loading} size="md" radius="xl" color="grape">
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
              Run the comparison to test your pair with multiple cointegration methods
              and see whether they reach the same verdict.
            </Text>
          </Stack>
        </Paper>
      )}

      {!loading && result && (
        <Stack gap="lg">
          <Alert color={TAKEAWAY_COLOR[result.takeaway.severity]} variant="light" radius="lg" title="Research takeaway" icon={<IconBulb size={18} />}>
            {result.takeaway.text}
          </Alert>

          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
            <StatCard title="Methods agree" value={`${agreeCount} / ${result.results.length}`} subtitle="Methods reaching the same verdict" />
            <StatCard title="Verdict" value={unanimous} subtitle="Consensus across all methods" />
          </SimpleGrid>

          {chart && (
            <Paper p="md" radius="xl" withBorder>
              <Group gap="sm" mb="xs"><IconChartBar size={18} /><Text fw={600}>Test statistics by method</Text></Group>
              <PlotlyChart data={chart.data} layout={chart.layout} />
            </Paper>
          )}

          <Paper p="md" radius="xl" withBorder>
            <Table.ScrollContainer minWidth={700}>
              <Table striped highlightOnHover withTableBorder withColumnBorders>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Method</Table.Th>
                    <Table.Th>Cointegrated</Table.Th>
                    <Table.Th>Statistic</Table.Th>
                    <Table.Th>Critical value</Table.Th>
                    <Table.Th>Detail</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {result.results.map((row) => (
                    <Table.Tr key={row.method}>
                      <Table.Td fw={700}>{row.method}</Table.Td>
                      <Table.Td>
                        <Badge size="xs" color={row.is_cointegrated ? 'teal' : 'red'} variant="light">
                          {row.is_cointegrated ? 'Yes' : 'No'}
                        </Badge>
                      </Table.Td>
                      <Table.Td>{fmt(row.statistic, 3)}</Table.Td>
                      <Table.Td>{fmt(row.critical_value, 3)}</Table.Td>
                      <Table.Td><Text size="xs" c="dimmed" maw={300} lineClamp={2}>{row.detail}</Text></Table.Td>
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
