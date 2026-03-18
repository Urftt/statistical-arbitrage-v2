'use client';

import Link from 'next/link';
import { useCallback, useMemo, useState } from 'react';
import {
  ActionIcon,
  Alert,
  Badge,
  Box,
  Button,
  Group,
  NumberInput,
  Paper,
  Select,
  SimpleGrid,
  Skeleton,
  Stack,
  Text,
  ThemeIcon,
  Title,
  Tooltip,
} from '@mantine/core';
import {
  IconAlertTriangle,
  IconArrowRight,
  IconGridDots,
  IconPlus,
  IconRosetteDiscountCheck,
  IconShieldCheck,
  IconTrash,
  IconX,
} from '@tabler/icons-react';
import PlotlyChart from '@/components/charts/PlotlyChart';
import { usePairContext } from '@/contexts/PairContext';
import {
  buildBacktestSearchParams,
  postGridSearch,
  toEurSymbol,
  type EngineWarningPayload,
  type GridSearchResponse,
  type ParameterAxisPayload,
} from '@/lib/api';
import type { Data, Layout } from 'plotly.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PARAMETER_OPTIONS = [
  { value: 'entry_threshold', label: 'Entry threshold' },
  { value: 'exit_threshold', label: 'Exit threshold' },
  { value: 'lookback_window', label: 'Lookback window' },
  { value: 'stop_loss', label: 'Stop loss' },
] as const;

interface AxisConfig {
  name: string;
  min_value: number;
  max_value: number;
  step: number;
}

const DEFAULT_AXES: AxisConfig[] = [
  { name: 'entry_threshold', min_value: 1.0, max_value: 3.0, step: 0.5 },
  { name: 'exit_threshold', min_value: 0.1, max_value: 1.0, step: 0.1 },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmt(value: number | null | undefined, digits = 2): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return value.toFixed(digits);
}

function pct(value: number | null | undefined, digits = 1): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return `${(value * 100).toFixed(digits)}%`;
}

function axisStepCount(axis: AxisConfig): number {
  if (axis.step <= 0) return 0;
  return Math.floor((axis.max_value - axis.min_value) / axis.step) + 1;
}

function estimateCombinations(axes: AxisConfig[]): number {
  if (axes.length === 0) return 0;
  return axes.reduce((acc, a) => acc * Math.max(1, axisStepCount(a)), 1);
}

function robustnessColor(score: number | null): string {
  if (score === null) return 'gray';
  if (score >= 0.5) return 'teal';
  if (score >= 0.25) return 'yellow';
  return 'red';
}

function titleCaseSignal(code: string): string {
  return code.replaceAll('_', ' ');
}

function renderWarningDetails(details: EngineWarningPayload['details']): string | null {
  const entries = Object.entries(details).filter(([, v]) => v !== null && v !== undefined);
  if (entries.length === 0) return null;
  return entries.map(([k, v]) => `${k.replaceAll('_', ' ')}: ${String(v)}`).join(' · ');
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function AxisControl({
  axis,
  index,
  usedNames,
  onChange,
  onRemove,
  canRemove,
}: {
  axis: AxisConfig;
  index: number;
  usedNames: Set<string>;
  onChange: (index: number, updated: AxisConfig) => void;
  onRemove: (index: number) => void;
  canRemove: boolean;
}) {
  const availableOptions = PARAMETER_OPTIONS.filter(
    (opt) => opt.value === axis.name || !usedNames.has(opt.value)
  );

  return (
    <Paper p="sm" radius="md" withBorder style={{ borderColor: 'rgba(148, 163, 184, 0.15)' }}>
      <Group justify="space-between" mb="xs">
        <Text size="xs" fw={700} tt="uppercase" c="dimmed">
          Axis {index + 1}
        </Text>
        {canRemove && (
          <ActionIcon size="sm" variant="subtle" color="gray" onClick={() => onRemove(index)}>
            <IconTrash size={14} />
          </ActionIcon>
        )}
      </Group>
      <Stack gap="xs">
        <Select
          size="xs"
          label="Parameter"
          data={availableOptions}
          value={axis.name}
          onChange={(value) => {
            if (value) onChange(index, { ...axis, name: value });
          }}
          allowDeselect={false}
        />
        <Group gap="xs" grow>
          <NumberInput
            size="xs"
            label="Min"
            value={axis.min_value}
            onChange={(v) => {
              if (typeof v === 'number') onChange(index, { ...axis, min_value: v });
            }}
            step={axis.step || 0.1}
            decimalScale={2}
          />
          <NumberInput
            size="xs"
            label="Max"
            value={axis.max_value}
            onChange={(v) => {
              if (typeof v === 'number') onChange(index, { ...axis, max_value: v });
            }}
            step={axis.step || 0.1}
            decimalScale={2}
          />
          <NumberInput
            size="xs"
            label="Step"
            value={axis.step}
            onChange={(v) => {
              if (typeof v === 'number') onChange(index, { ...axis, step: v });
            }}
            min={0.01}
            step={0.1}
            decimalScale={2}
          />
        </Group>
      </Stack>
    </Paper>
  );
}

function LoadingState() {
  return (
    <Stack gap="lg">
      <SimpleGrid cols={{ base: 1, sm: 3 }}>
        {Array.from({ length: 3 }).map((_, idx) => (
          <Skeleton key={idx} height={96} radius="md" animate />
        ))}
      </SimpleGrid>
      <Skeleton height={400} radius="md" animate />
      <Skeleton height={160} radius="md" animate />
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

function WarningAlerts({ warnings }: { warnings: EngineWarningPayload[] }) {
  if (warnings.length === 0) return null;

  const overfitItems = warnings.filter((w) => w.code.startsWith('overfit_'));
  const fragileItems = warnings.filter((w) => w.code.startsWith('fragile_'));
  const otherItems = warnings.filter(
    (w) => !w.code.startsWith('overfit_') && !w.code.startsWith('fragile_')
  );

  return (
    <Stack gap="sm">
      {overfitItems.map((w) => (
        <Alert
          key={w.code}
          color="orange"
          variant="light"
          radius="lg"
          title="⚠️ Overfitting Signal"
          icon={<IconAlertTriangle size={17} color="#ff922b" />}
          styles={{ root: { borderLeft: '3px solid var(--mantine-color-orange-6)' } }}
        >
          <Text size="sm" fw={600}>{titleCaseSignal(w.code)}</Text>
          <Text size="sm" mt={4}>{w.message}</Text>
          {renderWarningDetails(w.details) && (
            <Text size="xs" c="dimmed" mt={6}>{renderWarningDetails(w.details)}</Text>
          )}
        </Alert>
      ))}
      {fragileItems.map((w) => (
        <Alert
          key={w.code}
          color="red"
          variant="light"
          radius="lg"
          title="🔴 Fragility Warning"
          icon={<IconAlertTriangle size={17} />}
        >
          <Text size="sm">{w.message}</Text>
          {renderWarningDetails(w.details) && (
            <Text size="xs" c="dimmed" mt={6}>{renderWarningDetails(w.details)}</Text>
          )}
        </Alert>
      ))}
      {otherItems.map((w) => (
        <Alert
          key={w.code}
          color={w.severity === 'blocking' ? 'red' : 'yellow'}
          variant="light"
          radius="lg"
          title={titleCaseSignal(w.code)}
          icon={<IconAlertTriangle size={17} />}
        >
          <Text size="sm">{w.message}</Text>
        </Alert>
      ))}
    </Stack>
  );
}

// ---------------------------------------------------------------------------
// Chart builders
// ---------------------------------------------------------------------------

function buildHeatmap(result: GridSearchResponse): { data: Data[]; layout: Partial<Layout> } {
  const ax0 = result.axes[0];
  const ax1 = result.axes[1];

  const xValues: number[] = [];
  const yValues: number[] = [];

  // Collect unique sorted values for each axis
  for (const cell of result.cells) {
    const xVal = cell.params[ax0.name];
    const yVal = cell.params[ax1.name];
    if (xVal !== undefined && !xValues.includes(xVal)) xValues.push(xVal);
    if (yVal !== undefined && !yValues.includes(yVal)) yValues.push(yVal);
  }
  xValues.sort((a, b) => a - b);
  yValues.sort((a, b) => a - b);

  // Build z-matrix
  const zMatrix: (number | null)[][] = [];
  const textMatrix: string[][] = [];
  for (let yi = 0; yi < yValues.length; yi++) {
    const row: (number | null)[] = [];
    const textRow: string[] = [];
    for (let xi = 0; xi < xValues.length; xi++) {
      const cell = result.cells.find(
        (c) => c.params[ax0.name] === xValues[xi] && c.params[ax1.name] === yValues[yi]
      );
      if (cell && cell.status === 'ok' && cell.metrics.sharpe_ratio !== null) {
        const metricValue = (cell.metrics as unknown as Record<string, unknown>)[result.optimize_metric];
        row.push(typeof metricValue === 'number' ? metricValue : null);
        textRow.push(
          `${ax0.name}: ${xValues[xi]}<br>${ax1.name}: ${yValues[yi]}<br>` +
          `Sharpe: ${fmt(cell.metrics.sharpe_ratio)}<br>` +
          `Trades: ${cell.trade_count}<br>` +
          `Return: ${pct(cell.metrics.total_return_pct)}`
        );
      } else {
        row.push(null);
        textRow.push(cell ? `Status: ${cell.status}` : 'N/A');
      }
    }
    zMatrix.push(row);
    textMatrix.push(textRow);
  }

  // Find best cell position for annotation
  const annotations: Partial<Layout>['annotations'] = [];
  if (result.best_cell) {
    const bx = xValues.indexOf(result.best_cell.params[ax0.name]);
    const by = yValues.indexOf(result.best_cell.params[ax1.name]);
    if (bx >= 0 && by >= 0) {
      annotations.push({
        x: xValues[bx],
        y: yValues[by],
        text: '★ Best',
        showarrow: true,
        arrowhead: 2,
        arrowcolor: '#fff',
        font: { color: '#fff', size: 13, family: 'monospace' },
        bgcolor: 'rgba(0,0,0,0.65)',
        bordercolor: '#5eead4',
        borderwidth: 1,
        borderpad: 4,
      });
    }
  }

  return {
    data: [
      {
        type: 'heatmap',
        x: xValues,
        y: yValues,
        z: zMatrix,
        text: textMatrix as unknown as string[],
        hoverinfo: 'text',
        colorscale: 'Viridis',
        colorbar: {
          title: { text: result.optimize_metric.replaceAll('_', ' ') },
          tickfont: { color: '#94a3b8' },
        },
        zsmooth: false,
        connectgaps: false,
      } as unknown as Data,
    ],
    layout: {
      title: { text: `Grid search: ${result.optimize_metric.replaceAll('_', ' ')}` },
      height: 420,
      xaxis: { title: { text: ax0.name.replaceAll('_', ' ') } },
      yaxis: { title: { text: ax1.name.replaceAll('_', ' ') } },
      annotations,
    },
  };
}

function buildLineChart(result: GridSearchResponse): { data: Data[]; layout: Partial<Layout> } {
  const ax0 = result.axes[0];
  const sortedCells = [...result.cells].sort(
    (a, b) => (a.params[ax0.name] ?? 0) - (b.params[ax0.name] ?? 0)
  );

  const xValues = sortedCells.map((c) => c.params[ax0.name] ?? 0);
  const yValues = sortedCells.map((c) => {
    if (c.status !== 'ok') return null;
    const v = (c.metrics as unknown as Record<string, unknown>)[result.optimize_metric];
    return typeof v === 'number' ? v : null;
  });

  return {
    data: [
      {
        type: 'scatter',
        mode: 'lines+markers',
        x: xValues,
        y: yValues,
        name: result.optimize_metric.replaceAll('_', ' '),
        line: { color: '#5eead4', width: 2.4 },
        marker: {
          size: 10,
          color: xValues.map((_, i) =>
            result.best_cell_index === i ? '#ffd166' : '#5eead4'
          ),
          line: { width: 1, color: '#fff' },
        },
        connectgaps: false,
      } as Data,
    ],
    layout: {
      title: { text: `Grid search: ${result.optimize_metric.replaceAll('_', ' ')}` },
      height: 360,
      xaxis: { title: { text: ax0.name.replaceAll('_', ' ') } },
      yaxis: { title: { text: result.optimize_metric.replaceAll('_', ' ') } },
    },
  };
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function GridSearchPanel() {
  const { asset1, asset2, timeframe } = usePairContext();

  const [axes, setAxes] = useState<AxisConfig[]>([...DEFAULT_AXES]);
  const [daysBack, setDaysBack] = useState<number>(365);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GridSearchResponse | null>(null);

  const usedNames = useMemo(() => new Set(axes.map((a) => a.name)), [axes]);
  const combos = useMemo(() => estimateCombinations(axes), [axes]);

  const updateAxis = useCallback((index: number, updated: AxisConfig) => {
    setAxes((prev) => prev.map((a, i) => (i === index ? updated : a)));
  }, []);

  const removeAxis = useCallback((index: number) => {
    setAxes((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const addAxis = useCallback(() => {
    const available = PARAMETER_OPTIONS.find((opt) => !usedNames.has(opt.value));
    if (available) {
      setAxes((prev) => [
        ...prev,
        { name: available.value, min_value: 1.0, max_value: 3.0, step: 0.5 },
      ]);
    }
  }, [usedNames]);

  const chart = useMemo(() => {
    if (!result) return null;
    if (result.axes.length >= 2) return buildHeatmap(result);
    if (result.axes.length === 1) return buildLineChart(result);
    return null;
  }, [result]);

  async function handleRun() {
    if (!asset1 || !asset2) {
      setError('Select both assets in the dashboard header before running grid search.');
      return;
    }
    if (asset1 === asset2) {
      setError('Select two different assets.');
      return;
    }
    if (axes.length === 0) {
      setError('Add at least one parameter axis.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const apiAxes: ParameterAxisPayload[] = axes.map((a) => ({
        name: a.name,
        min_value: a.min_value,
        max_value: a.max_value,
        step: a.step,
      }));

      const response = await postGridSearch({
        asset1: toEurSymbol(asset1),
        asset2: toEurSymbol(asset2),
        timeframe,
        days_back: daysBack,
        axes: apiAxes,
      });
      setResult(response);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Grid search request failed';
      console.error('Grid search failed:', err);
      setError(message);
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  const pairLabel = asset1 && asset2 ? `${asset1}/EUR × ${asset2}/EUR` : null;

  return (
    <Stack gap="lg" data-optimize-panel="grid-search">
      {/* Controls */}
      <Paper
        p="lg"
        radius="xl"
        withBorder
        style={{
          background:
            'radial-gradient(circle at top left, rgba(99,102,241,0.12), transparent 35%), linear-gradient(135deg, rgba(10,14,22,0.98), rgba(15,23,42,0.96))',
          borderColor: 'rgba(99, 102, 241, 0.18)',
        }}
      >
        <Stack gap="md">
          <Group justify="space-between" align="flex-start">
            <Box maw={720}>
              <Group gap="xs" mb="sm">
                <Badge variant="light" color="indigo">Grid Search</Badge>
                {pairLabel && (
                  <Badge variant="outline" color="blue">{pairLabel} · {timeframe}</Badge>
                )}
              </Group>
              <Title order={3}>Multi-parameter optimization</Title>
              <Text c="dimmed" mt={6}>
                Sweep strategy parameters across a bounded grid, inspect the
                robustness landscape, and hand off the best combination to the
                backtester.
              </Text>
            </Box>
            <ThemeIcon
              size={54}
              radius="xl"
              variant="light"
              color="indigo"
              style={{ boxShadow: '0 0 40px rgba(99, 102, 241, 0.16)' }}
            >
              <IconGridDots size={28} stroke={1.6} />
            </ThemeIcon>
          </Group>

          {/* Axis controls */}
          <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="sm">
            {axes.map((axis, idx) => (
              <AxisControl
                key={`${axis.name}-${idx}`}
                axis={axis}
                index={idx}
                usedNames={usedNames}
                onChange={updateAxis}
                onRemove={removeAxis}
                canRemove={axes.length > 1}
              />
            ))}
            {axes.length < 3 && (
              <Paper
                p="sm"
                radius="md"
                withBorder
                style={{
                  borderColor: 'rgba(148, 163, 184, 0.1)',
                  borderStyle: 'dashed',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  minHeight: 140,
                }}
                onClick={addAxis}
              >
                <Stack align="center" gap={4}>
                  <IconPlus size={20} style={{ opacity: 0.4 }} />
                  <Text size="xs" c="dimmed">Add axis</Text>
                </Stack>
              </Paper>
            )}
          </SimpleGrid>

          {/* Combo counter + run button */}
          <Group align="flex-end" gap="md" wrap="wrap">
            <NumberInput
              label="History window (days)"
              description="Trailing window for the grid search"
              value={daysBack}
              onChange={(v) => { if (typeof v === 'number') setDaysBack(v); }}
              min={30}
              max={3650}
              step={30}
              w={200}
            />
            <Group gap="sm" align="flex-end">
              <Tooltip label={combos > 500 ? 'Exceeds 500 combo limit' : `${combos} combinations`}>
                <Badge
                  variant="light"
                  color={combos > 500 ? 'red' : combos > 200 ? 'yellow' : 'teal'}
                  size="lg"
                >
                  {combos} combos
                </Badge>
              </Tooltip>
              <Button
                leftSection={<IconGridDots size={16} />}
                onClick={handleRun}
                loading={loading}
                disabled={combos > 500}
                size="md"
                radius="xl"
                styles={{
                  root: {
                    background: 'linear-gradient(135deg, rgba(99,102,241,0.95), rgba(79,70,229,0.95))',
                  },
                }}
              >
                Run Grid Search
              </Button>
            </Group>
          </Group>
        </Stack>
      </Paper>

      {/* Error */}
      {error && (
        <Alert color="red" title="Grid search failed" icon={<IconAlertTriangle size={18} />}>
          {error}
        </Alert>
      )}

      {/* Loading */}
      {loading && <LoadingState />}

      {/* Empty state */}
      {!loading && !result && !error && (
        <Paper p="xl" radius="xl" withBorder>
          <Stack align="center" gap="xs">
            <IconGridDots size={44} style={{ opacity: 0.35 }} />
            <Title order={4}>No grid search results yet</Title>
            <Text c="dimmed" ta="center" maw={560}>
              Configure the parameter axes above, then run the grid search to
              see a robustness heatmap and optimization results.
            </Text>
          </Stack>
        </Paper>
      )}

      {/* Results */}
      {!loading && result && (
        <Stack gap="lg">
          {/* Warnings */}
          <WarningAlerts warnings={result.warnings} />

          {/* Summary cards */}
          <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
            <StatCard
              title="Robustness score"
              value={result.robustness_score !== null ? pct(result.robustness_score) : '—'}
              subtitle={
                result.robustness_score !== null
                  ? result.robustness_score >= 0.5
                    ? 'Good — neighbors perform comparably'
                    : result.robustness_score >= 0.25
                      ? 'Moderate — some neighbor sensitivity'
                      : 'Poor — results are parameter-sensitive'
                  : 'Not enough cells to compute'
              }
            />
            <StatCard
              title="Grid dimensions"
              value={`${result.total_combinations} cells`}
              subtitle={`${result.axes.length}D grid: ${result.grid_shape.join(' × ')}`}
            />
            <StatCard
              title="Execution time"
              value={`${(result.execution_time_ms / 1000).toFixed(1)}s`}
              subtitle={`${fmt(result.execution_time_ms / result.total_combinations, 0)} ms/cell avg`}
            />
          </SimpleGrid>

          {/* Robustness badge */}
          <Group>
            <Badge
              size="xl"
              variant="light"
              color={robustnessColor(result.robustness_score)}
              leftSection={<IconShieldCheck size={16} />}
            >
              Robustness:{' '}
              {result.robustness_score !== null
                ? `${(result.robustness_score * 100).toFixed(0)}%`
                : 'N/A'}
            </Badge>
          </Group>

          {/* Chart */}
          {chart && (
            <Paper p="md" radius="xl" withBorder>
              <Group gap="sm" mb="xs">
                <IconGridDots size={18} />
                <Text fw={600}>
                  {result.axes.length >= 2 ? 'Optimization heatmap' : 'Parameter sweep'}
                </Text>
              </Group>
              <PlotlyChart data={chart.data} layout={chart.layout} />
            </Paper>
          )}

          {/* Best cell summary */}
          {result.best_cell && (
            <Paper p="lg" radius="xl" withBorder>
              <Group justify="space-between" mb="sm" gap="md">
                <div>
                  <Group gap="xs" mb={4}>
                    <IconRosetteDiscountCheck size={18} />
                    <Text fw={700}>Best cell</Text>
                  </Group>
                  <Text c="dimmed" size="sm">
                    {Object.entries(result.best_cell.params)
                      .map(([k, v]) => `${k.replaceAll('_', ' ')}: ${v}`)
                      .join(' · ')}
                  </Text>
                </div>
                {result.recommended_backtest_params && (
                  <Button
                    component={Link}
                    href={`/backtest?${buildBacktestSearchParams(result.recommended_backtest_params).toString()}&source=grid-search`}
                    rightSection={<IconArrowRight size={16} />}
                    radius="xl"
                    size="md"
                  >
                    Use best params
                  </Button>
                )}
              </Group>
              <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="sm">
                <Box>
                  <Text size="xs" c="dimmed" tt="uppercase">Sharpe</Text>
                  <Text fw={700}>{fmt(result.best_cell.metrics.sharpe_ratio)}</Text>
                </Box>
                <Box>
                  <Text size="xs" c="dimmed" tt="uppercase">Return</Text>
                  <Text fw={700}>{pct(result.best_cell.metrics.total_return_pct)}</Text>
                </Box>
                <Box>
                  <Text size="xs" c="dimmed" tt="uppercase">Win rate</Text>
                  <Text fw={700}>{pct(result.best_cell.metrics.win_rate)}</Text>
                </Box>
                <Box>
                  <Text size="xs" c="dimmed" tt="uppercase">Trades</Text>
                  <Text fw={700}>{result.best_cell.trade_count}</Text>
                </Box>
              </SimpleGrid>
            </Paper>
          )}
        </Stack>
      )}
    </Stack>
  );
}
