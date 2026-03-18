'use client';

import Link from 'next/link';
import { useCallback, useMemo, useState } from 'react';
import {
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
  Slider,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from '@mantine/core';
import {
  IconAlertTriangle,
  IconArrowRight,
  IconPlus,
  IconRosetteDiscountCheck,
  IconTimeline,
  IconTrash,
  IconTrendingDown,
  IconTrendingUp,
} from '@tabler/icons-react';
import { usePairContext } from '@/contexts/PairContext';
import {
  buildBacktestSearchParams,
  postWalkForward,
  toEurSymbol,
  type EngineWarningPayload,
  type ParameterAxisPayload,
  type WalkForwardFoldPayload,
  type WalkForwardResponse,
} from '@/lib/api';

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

function verdictColor(verdict: WalkForwardResponse['stability_verdict']): string {
  switch (verdict) {
    case 'stable': return 'teal';
    case 'moderate': return 'yellow';
    case 'fragile': return 'red';
  }
}

function verdictEmoji(verdict: WalkForwardResponse['stability_verdict']): string {
  switch (verdict) {
    case 'stable': return '✅';
    case 'moderate': return '⚠️';
    case 'fragile': return '🔴';
  }
}

function foldStatusColor(status: WalkForwardFoldPayload['status']): string {
  switch (status) {
    case 'ok': return 'teal';
    case 'no_train_trades': return 'orange';
    case 'no_test_trades': return 'orange';
    case 'blocked': return 'red';
  }
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
        <Text size="xs" fw={700} tt="uppercase" c="dimmed">Axis {index + 1}</Text>
        {canRemove && (
          <Button size="compact-xs" variant="subtle" color="gray" onClick={() => onRemove(index)}>
            <IconTrash size={14} />
          </Button>
        )}
      </Group>
      <Stack gap="xs">
        <Select
          size="xs"
          label="Parameter"
          data={availableOptions}
          value={axis.name}
          onChange={(value) => { if (value) onChange(index, { ...axis, name: value }); }}
          allowDeselect={false}
        />
        <Group gap="xs" grow>
          <NumberInput
            size="xs"
            label="Min"
            value={axis.min_value}
            onChange={(v) => { if (typeof v === 'number') onChange(index, { ...axis, min_value: v }); }}
            step={axis.step || 0.1}
            decimalScale={2}
          />
          <NumberInput
            size="xs"
            label="Max"
            value={axis.max_value}
            onChange={(v) => { if (typeof v === 'number') onChange(index, { ...axis, max_value: v }); }}
            step={axis.step || 0.1}
            decimalScale={2}
          />
          <NumberInput
            size="xs"
            label="Step"
            value={axis.step}
            onChange={(v) => { if (typeof v === 'number') onChange(index, { ...axis, step: v }); }}
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
      <Skeleton height={96} radius="md" animate />
      <SimpleGrid cols={{ base: 1, sm: 3 }}>
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} height={96} radius="md" animate />
        ))}
      </SimpleGrid>
      <SimpleGrid cols={{ base: 1, sm: 2 }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} height={160} radius="md" animate />
        ))}
      </SimpleGrid>
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

function FoldCard({ fold }: { fold: WalkForwardFoldPayload }) {
  const testDiverges =
    fold.status === 'ok' &&
    fold.train_metrics.sharpe_ratio !== null &&
    fold.test_metrics.sharpe_ratio !== null &&
    fold.train_metrics.sharpe_ratio > 0 &&
    fold.test_metrics.sharpe_ratio / fold.train_metrics.sharpe_ratio < 0.5;

  return (
    <Paper
      p="md"
      radius="lg"
      withBorder
      style={{
        borderColor: testDiverges
          ? 'rgba(255, 107, 107, 0.35)'
          : 'rgba(148, 163, 184, 0.15)',
        background: testDiverges
          ? 'linear-gradient(180deg, rgba(255,107,107,0.06) 0%, rgba(11,15,23,0.98) 100%)'
          : 'linear-gradient(180deg, rgba(17,24,39,0.92) 0%, rgba(11,15,23,0.98) 100%)',
      }}
    >
      <Group justify="space-between" mb="sm">
        <Group gap="xs">
          <Text fw={700}>Fold {fold.fold_index + 1}</Text>
          <Badge size="xs" color={foldStatusColor(fold.status)} variant="light">
            {fold.status.replaceAll('_', ' ')}
          </Badge>
          {testDiverges && (
            <Badge size="xs" color="red" variant="light">
              divergent
            </Badge>
          )}
        </Group>
        <Text size="xs" c="dimmed">
          {fold.train_bars} train · {fold.test_bars} test bars
        </Text>
      </Group>

      <SimpleGrid cols={2} spacing="xs">
        {/* Train side */}
        <Box>
          <Group gap={4} mb={4}>
            <IconTrendingUp size={14} style={{ color: '#5eead4' }} />
            <Text size="xs" fw={700} c="teal">Train</Text>
          </Group>
          <Text size="xs">Sharpe: <Text span fw={600}>{fmt(fold.train_metrics.sharpe_ratio)}</Text></Text>
          <Text size="xs">Return: <Text span fw={600}>{pct(fold.train_metrics.total_return_pct)}</Text></Text>
          <Text size="xs">Trades: <Text span fw={600}>{fold.train_trade_count}</Text></Text>
        </Box>

        {/* Test side */}
        <Box>
          <Group gap={4} mb={4}>
            <IconTrendingDown size={14} style={{ color: '#339af0' }} />
            <Text size="xs" fw={700} c="blue">Test</Text>
          </Group>
          <Text size="xs">Sharpe: <Text span fw={600}>{fmt(fold.test_metrics.sharpe_ratio)}</Text></Text>
          <Text size="xs">Return: <Text span fw={600}>{pct(fold.test_metrics.total_return_pct)}</Text></Text>
          <Text size="xs">Trades: <Text span fw={600}>{fold.test_trade_count}</Text></Text>
        </Box>
      </SimpleGrid>

      {/* Best params for this fold */}
      {Object.keys(fold.best_params).length > 0 && (
        <Text size="xs" c="dimmed" mt="xs">
          Best: {Object.entries(fold.best_params).map(([k, v]) => `${k.replaceAll('_', ' ')}=${v}`).join(', ')}
        </Text>
      )}
    </Paper>
  );
}

function WarningAlerts({ warnings }: { warnings: EngineWarningPayload[] }) {
  if (warnings.length === 0) return null;

  return (
    <Stack gap="sm">
      {warnings.map((w) => {
        const isOverfit = w.code.startsWith('overfit_');
        const isWf = w.code.startsWith('wf_');
        return (
          <Alert
            key={w.code}
            color={isOverfit ? 'orange' : isWf ? 'yellow' : w.severity === 'blocking' ? 'red' : 'yellow'}
            variant="light"
            radius="lg"
            title={isOverfit ? '⚠️ Overfitting Signal' : titleCaseSignal(w.code)}
            icon={<IconAlertTriangle size={17} />}
            styles={isOverfit ? { root: { borderLeft: '3px solid var(--mantine-color-orange-6)' } } : undefined}
          >
            <Text size="sm">{w.message}</Text>
            {renderWarningDetails(w.details) && (
              <Text size="xs" c="dimmed" mt={6}>{renderWarningDetails(w.details)}</Text>
            )}
          </Alert>
        );
      })}
    </Stack>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function WalkForwardPanel() {
  const { asset1, asset2, timeframe } = usePairContext();

  const [axes, setAxes] = useState<AxisConfig[]>([...DEFAULT_AXES]);
  const [daysBack, setDaysBack] = useState<number>(365);
  const [foldCount, setFoldCount] = useState<number>(5);
  const [trainPct, setTrainPct] = useState<number>(60);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<WalkForwardResponse | null>(null);

  const usedNames = useMemo(() => new Set(axes.map((a) => a.name)), [axes]);

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

  async function handleRun() {
    if (!asset1 || !asset2) {
      setError('Select both assets in the dashboard header before running walk-forward.');
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

      const response = await postWalkForward({
        asset1: toEurSymbol(asset1),
        asset2: toEurSymbol(asset2),
        timeframe,
        days_back: daysBack,
        axes: apiAxes,
        fold_count: foldCount,
        train_pct: trainPct / 100,
      });
      setResult(response);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Walk-forward request failed';
      console.error('Walk-forward failed:', err);
      setError(message);
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  const pairLabel = asset1 && asset2 ? `${asset1}/EUR × ${asset2}/EUR` : null;

  return (
    <Stack gap="lg" data-optimize-panel="walk-forward">
      {/* Controls */}
      <Paper
        p="lg"
        radius="xl"
        withBorder
        style={{
          background:
            'radial-gradient(circle at top left, rgba(245,158,11,0.12), transparent 35%), linear-gradient(135deg, rgba(10,14,22,0.98), rgba(15,23,42,0.96))',
          borderColor: 'rgba(245, 158, 11, 0.18)',
        }}
      >
        <Stack gap="md">
          <Group justify="space-between" align="flex-start">
            <Box maw={720}>
              <Group gap="xs" mb="sm">
                <Badge variant="light" color="yellow">Walk-Forward</Badge>
                {pairLabel && (
                  <Badge variant="outline" color="blue">{pairLabel} · {timeframe}</Badge>
                )}
              </Group>
              <Title order={3}>Rolling out-of-sample validation</Title>
              <Text c="dimmed" mt={6}>
                Split history into rolling train/test windows. Each fold optimizes
                on the train set and validates on unseen test data — the gold
                standard for detecting overfitting.
              </Text>
            </Box>
            <ThemeIcon
              size={54}
              radius="xl"
              variant="light"
              color="yellow"
              style={{ boxShadow: '0 0 40px rgba(245, 158, 11, 0.16)' }}
            >
              <IconTimeline size={28} stroke={1.6} />
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

          {/* Walk-forward config */}
          <Group align="flex-end" gap="md" wrap="wrap">
            <NumberInput
              label="History (days)"
              value={daysBack}
              onChange={(v) => { if (typeof v === 'number') setDaysBack(v); }}
              min={30}
              max={3650}
              step={30}
              w={150}
            />
            <NumberInput
              label="Folds"
              value={foldCount}
              onChange={(v) => { if (typeof v === 'number') setFoldCount(v); }}
              min={2}
              max={20}
              w={100}
            />
            <Box w={200}>
              <Text size="xs" fw={500} mb={4}>Train %: {trainPct}%</Text>
              <Slider
                value={trainPct}
                onChange={setTrainPct}
                min={30}
                max={90}
                step={5}
                marks={[
                  { value: 30, label: '30%' },
                  { value: 60, label: '60%' },
                  { value: 90, label: '90%' },
                ]}
              />
            </Box>
            <Button
              leftSection={<IconTimeline size={16} />}
              onClick={handleRun}
              loading={loading}
              size="md"
              radius="xl"
              styles={{
                root: {
                  background: 'linear-gradient(135deg, rgba(245,158,11,0.95), rgba(217,119,6,0.95))',
                },
              }}
            >
              Run Walk-Forward
            </Button>
          </Group>
        </Stack>
      </Paper>

      {/* Error */}
      {error && (
        <Alert color="red" title="Walk-forward failed" icon={<IconAlertTriangle size={18} />}>
          {error}
        </Alert>
      )}

      {/* Loading */}
      {loading && <LoadingState />}

      {/* Empty state */}
      {!loading && !result && !error && (
        <Paper p="xl" radius="xl" withBorder>
          <Stack align="center" gap="xs">
            <IconTimeline size={44} style={{ opacity: 0.35 }} />
            <Title order={4}>No walk-forward results yet</Title>
            <Text c="dimmed" ta="center" maw={560}>
              Configure fold count, train percentage, and parameter axes above,
              then run walk-forward validation to inspect per-fold train/test
              performance.
            </Text>
          </Stack>
        </Paper>
      )}

      {/* Results */}
      {!loading && result && (
        <Stack gap="lg">
          {/* Stability verdict banner */}
          <Alert
            color={verdictColor(result.stability_verdict)}
            variant="light"
            radius="lg"
            title={`${verdictEmoji(result.stability_verdict)} Walk-forward results are ${result.stability_verdict}`}
            icon={
              result.stability_verdict === 'stable' ? (
                <IconRosetteDiscountCheck size={18} />
              ) : (
                <IconAlertTriangle size={18} />
              )
            }
          >
            {result.stability_verdict === 'stable'
              ? 'Test-set performance closely tracks training — the strategy generalizes well.'
              : result.stability_verdict === 'moderate'
                ? 'Test-set performance partially tracks training — some overfitting risk.'
                : 'Test-set performance is far worse than training — likely overfitting.'}
          </Alert>

          {/* Warnings */}
          <WarningAlerts warnings={result.warnings} />

          {/* Aggregate summary cards */}
          <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
            <StatCard
              title="Avg train Sharpe"
              value={fmt(result.aggregate_train_sharpe)}
              subtitle={`Across ${result.fold_count} folds`}
            />
            <StatCard
              title="Avg test Sharpe"
              value={fmt(result.aggregate_test_sharpe)}
              subtitle="Out-of-sample performance"
            />
            <StatCard
              title="Train/test divergence"
              value={
                result.train_test_divergence !== null
                  ? `${(result.train_test_divergence * 100).toFixed(0)}%`
                  : '—'
              }
              subtitle={
                result.train_test_divergence !== null
                  ? result.train_test_divergence >= 0.5
                    ? 'Healthy ratio (test ≥ 50% of train)'
                    : 'Significant gap between train & test'
                  : 'Could not compute'
              }
            />
          </SimpleGrid>

          {/* Execution time */}
          <Group>
            <Badge variant="light" color="gray" size="lg">
              {result.fold_count} folds · {(result.execution_time_ms / 1000).toFixed(1)}s total
            </Badge>
          </Group>

          {/* Per-fold cards */}
          <div>
            <Text fw={700} mb="sm">Per-fold results</Text>
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
              {result.folds.map((fold) => (
                <FoldCard key={fold.fold_index} fold={fold} />
              ))}
            </SimpleGrid>
          </div>

          {/* CTA */}
          {(result.stability_verdict === 'stable' || result.stability_verdict === 'moderate') &&
            result.recommended_backtest_params && (
              <Paper p="lg" radius="xl" withBorder>
                <Group justify="space-between" gap="md">
                  <div>
                    <Group gap="xs" mb={4}>
                      <IconRosetteDiscountCheck size={18} />
                      <Text fw={700}>Validated parameters</Text>
                    </Group>
                    <Text c="dimmed" size="sm">
                      Walk-forward validation passed with {result.stability_verdict} verdict.
                      Use these parameters for a full backtest run.
                    </Text>
                  </div>
                  <Button
                    component={Link}
                    href={`/backtest?${buildBacktestSearchParams(result.recommended_backtest_params).toString()}&source=walk-forward`}
                    rightSection={<IconArrowRight size={16} />}
                    radius="xl"
                    size="md"
                  >
                    Use walk-forward params
                  </Button>
                </Group>
              </Paper>
            )}
        </Stack>
      )}
    </Stack>
  );
}
