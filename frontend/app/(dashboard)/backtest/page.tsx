'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Alert,
  Badge,
  Button,
  Container,
  Group,
  NumberInput,
  Paper,
  Select,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import {
  IconAlertTriangle,
  IconArrowUpRight,
  IconChartLine,
  IconClock,
  IconInfoCircle,
  IconPlayerPlay,
  IconSettings2,
} from '@tabler/icons-react';
import BacktestResultView from '@/components/backtest/BacktestResultView';
import { usePairContext } from '@/contexts/PairContext';
import {
  DEFAULT_STRATEGY_PARAMETERS,
  TIMEFRAME_OPTIONS,
  buildBacktestSearchParams,
  postBacktest,
  symbolToBaseAsset,
  toEurSymbol,
  type BacktestResponse,
} from '@/lib/api';

interface FormState {
  asset1: string;
  asset2: string;
  timeframe: string;
  daysBack: number;
  lookbackWindow: number;
  entryThreshold: number;
  exitThreshold: number;
  stopLoss: number;
  initialCapital: number;
  positionSize: number;
  transactionFee: number;
  minTradeCountWarning: number;
}

interface ParsedPreset {
  form: Partial<FormState>;
  source: string | null;
  module: string | null;
  recommendedWindow: number | null;
}

function parseNumber(value: string | null, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parsePreset(searchParams: URLSearchParams): ParsedPreset {
  return {
    form: {
      asset1: searchParams.get('asset1')
        ? symbolToBaseAsset(searchParams.get('asset1') ?? '')
        : undefined,
      asset2: searchParams.get('asset2')
        ? symbolToBaseAsset(searchParams.get('asset2') ?? '')
        : undefined,
      timeframe: searchParams.get('timeframe') ?? undefined,
      daysBack: searchParams.get('days_back')
        ? parseNumber(searchParams.get('days_back'), 365)
        : undefined,
      lookbackWindow: searchParams.get('lookback_window')
        ? parseNumber(searchParams.get('lookback_window'), DEFAULT_STRATEGY_PARAMETERS.lookback_window)
        : undefined,
      entryThreshold: searchParams.get('entry_threshold')
        ? parseNumber(searchParams.get('entry_threshold'), DEFAULT_STRATEGY_PARAMETERS.entry_threshold)
        : undefined,
      exitThreshold: searchParams.get('exit_threshold')
        ? parseNumber(searchParams.get('exit_threshold'), DEFAULT_STRATEGY_PARAMETERS.exit_threshold)
        : undefined,
      stopLoss: searchParams.get('stop_loss')
        ? parseNumber(searchParams.get('stop_loss'), DEFAULT_STRATEGY_PARAMETERS.stop_loss)
        : undefined,
      initialCapital: searchParams.get('initial_capital')
        ? parseNumber(searchParams.get('initial_capital'), DEFAULT_STRATEGY_PARAMETERS.initial_capital)
        : undefined,
      positionSize: searchParams.get('position_size')
        ? parseNumber(searchParams.get('position_size'), DEFAULT_STRATEGY_PARAMETERS.position_size)
        : undefined,
      transactionFee: searchParams.get('transaction_fee')
        ? parseNumber(searchParams.get('transaction_fee'), DEFAULT_STRATEGY_PARAMETERS.transaction_fee)
        : undefined,
      minTradeCountWarning: searchParams.get('min_trade_count_warning')
        ? parseNumber(
            searchParams.get('min_trade_count_warning'),
            DEFAULT_STRATEGY_PARAMETERS.min_trade_count_warning
          )
        : undefined,
    },
    source: searchParams.get('source'),
    module: searchParams.get('module'),
    recommendedWindow: searchParams.get('recommended_window')
      ? parseNumber(searchParams.get('recommended_window'), DEFAULT_STRATEGY_PARAMETERS.lookback_window)
      : null,
  };
}

function createDefaultFormState(
  asset1: string,
  asset2: string,
  timeframe: string
): FormState {
  return {
    asset1,
    asset2,
    timeframe,
    daysBack: 365,
    lookbackWindow: DEFAULT_STRATEGY_PARAMETERS.lookback_window,
    entryThreshold: DEFAULT_STRATEGY_PARAMETERS.entry_threshold,
    exitThreshold: DEFAULT_STRATEGY_PARAMETERS.exit_threshold,
    stopLoss: DEFAULT_STRATEGY_PARAMETERS.stop_loss,
    initialCapital: DEFAULT_STRATEGY_PARAMETERS.initial_capital,
    positionSize: DEFAULT_STRATEGY_PARAMETERS.position_size,
    transactionFee: DEFAULT_STRATEGY_PARAMETERS.transaction_fee,
    minTradeCountWarning: DEFAULT_STRATEGY_PARAMETERS.min_trade_count_warning,
  };
}

export default function BacktestPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const {
    asset1: contextAsset1,
    asset2: contextAsset2,
    timeframe: contextTimeframe,
    setAsset1,
    setAsset2,
    setTimeframe,
    coins,
    loading: pairsLoading,
    error: pairError,
  } = usePairContext();

  const parsedPreset = useMemo(
    () => parsePreset(new URLSearchParams(searchParams.toString())),
    [searchParams]
  );

  const [form, setForm] = useState<FormState>(() =>
    createDefaultFormState(contextAsset1, contextAsset2, contextTimeframe)
  );
  const [result, setResult] = useState<BacktestResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    const preset = parsedPreset.form;
    const hasPresetValues = Object.values(preset).some((value) => value !== undefined);

    if (hasPresetValues) {
      setForm((current) => ({
        ...current,
        ...preset,
      }));

      if (preset.asset1) setAsset1(preset.asset1);
      if (preset.asset2) setAsset2(preset.asset2);
      if (preset.timeframe) setTimeframe(preset.timeframe);
      return;
    }

    setForm((current) => ({
      ...current,
      asset1: current.asset1 || contextAsset1,
      asset2: current.asset2 || contextAsset2,
      timeframe: current.timeframe || contextTimeframe,
    }));
  }, [contextAsset1, contextAsset2, contextTimeframe, parsedPreset, setAsset1, setAsset2, setTimeframe]);

  function updateForm<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function buildRequest() {
    return {
      asset1: toEurSymbol(form.asset1),
      asset2: toEurSymbol(form.asset2),
      timeframe: form.timeframe,
      days_back: form.daysBack,
      strategy: {
        lookback_window: form.lookbackWindow,
        entry_threshold: form.entryThreshold,
        exit_threshold: form.exitThreshold,
        stop_loss: form.stopLoss,
        initial_capital: form.initialCapital,
        position_size: form.positionSize,
        transaction_fee: form.transactionFee,
        min_trade_count_warning: form.minTradeCountWarning,
      },
    };
  }

  async function handleRunBacktest() {
    if (!form.asset1 || !form.asset2) {
      setValidationError('Select both assets before running the backtest.');
      return;
    }

    if (form.asset1 === form.asset2) {
      setValidationError('Select two different assets to form a valid spread.');
      return;
    }

    setValidationError(null);
    setError(null);
    setLoading(true);

    const request = buildRequest();
    const nextParams = buildBacktestSearchParams(request);
    if (parsedPreset.source) nextParams.set('source', parsedPreset.source);
    if (parsedPreset.module) nextParams.set('module', parsedPreset.module);
    if (parsedPreset.recommendedWindow !== null) {
      nextParams.set('recommended_window', String(parsedPreset.recommendedWindow));
    }
    router.replace(`/backtest?${nextParams.toString()}`);

    try {
      const response = await postBacktest(request);
      setResult(response);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Backtest request failed';
      console.error('Backtest page request failed:', err);
      setError(message);
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  const handoffLoaded = parsedPreset.source === 'research';
  const pairSummary = form.asset1 && form.asset2 ? `${form.asset1}/EUR × ${form.asset2}/EUR` : 'Choose a pair';

  return (
    <Container size="xl" py="md">
      <Stack gap="lg">
        <div>
          <Group gap="md" mb="xs">
            <Title order={2}>Backtest</Title>
            <Badge variant="light" color="cyan">
              Live engine
            </Badge>
            <Badge variant="outline" color="blue">
              {pairSummary} · {form.timeframe}
            </Badge>
          </Group>
          <Text c="dimmed" size="sm">
            Run the real look-ahead-safe engine against cached market data, then inspect
            the metrics, data-quality diagnostics, warnings, and execution limitations together.
          </Text>
        </div>

        {handoffLoaded ? (
          <Alert
            color="teal"
            radius="lg"
            title="Research recommendation loaded"
            icon={<IconArrowUpRight size={18} />}
          >
            This page was prefilled from the {parsedPreset.module?.replaceAll('_', ' ') ?? 'research'} handoff.
            {parsedPreset.recommendedWindow !== null
              ? ` Recommended lookback: ${parsedPreset.recommendedWindow} bars.`
              : ''}{' '}
            The current URL is shareable and will restore the same preset after refresh.
          </Alert>
        ) : null}

        {pairError ? (
          <Alert color="red" title="Pair metadata failed to load" icon={<IconAlertTriangle size={18} />}>
            {pairError}
          </Alert>
        ) : null}

        {validationError ? (
          <Alert color="yellow" title="Invalid backtest preset" icon={<IconAlertTriangle size={18} />}>
            {validationError}
          </Alert>
        ) : null}

        {error ? (
          <Alert color="red" title="Backtest request failed" icon={<IconAlertTriangle size={18} />}>
            {error}
          </Alert>
        ) : null}

        <Paper p="lg" radius="xl" withBorder>
          <Stack gap="lg">
            <Group gap="xs">
              <IconSettings2 size={18} />
              <Text fw={700}>Backtest controls</Text>
            </Group>

            <SimpleGrid cols={{ base: 1, md: 2, xl: 4 }} spacing="md">
              <Select
                label="Asset 1"
                placeholder="Select asset"
                searchable
                data={coins}
                value={form.asset1 || null}
                onChange={(value) => {
                  const nextValue = value ?? '';
                  updateForm('asset1', nextValue);
                  setAsset1(nextValue);
                }}
                disabled={pairsLoading}
              />
              <Select
                label="Asset 2"
                placeholder="Select asset"
                searchable
                data={coins}
                value={form.asset2 || null}
                onChange={(value) => {
                  const nextValue = value ?? '';
                  updateForm('asset2', nextValue);
                  setAsset2(nextValue);
                }}
                disabled={pairsLoading}
              />
              <Select
                label="Timeframe"
                data={TIMEFRAME_OPTIONS.map((option) => ({
                  label: option.label,
                  value: option.value,
                }))}
                value={form.timeframe}
                onChange={(value) => {
                  const nextValue = value ?? '1h';
                  updateForm('timeframe', nextValue);
                  setTimeframe(nextValue);
                }}
                leftSection={<IconClock size={16} />}
              />
              <NumberInput
                label="History window (days)"
                value={form.daysBack}
                onChange={(value) => {
                  if (typeof value === 'number') updateForm('daysBack', value);
                }}
                min={7}
                max={3650}
              />
            </SimpleGrid>

            <SimpleGrid cols={{ base: 1, md: 2, xl: 4 }} spacing="md">
              <NumberInput
                label="Lookback window"
                description="Rolling bars used for z-score and hedge-ratio estimation"
                value={form.lookbackWindow}
                onChange={(value) => {
                  if (typeof value === 'number') updateForm('lookbackWindow', value);
                }}
                min={2}
              />
              <NumberInput
                label="Entry threshold"
                value={form.entryThreshold}
                onChange={(value) => {
                  if (typeof value === 'number') updateForm('entryThreshold', value);
                }}
                min={0.1}
                step={0.1}
                decimalScale={2}
              />
              <NumberInput
                label="Exit threshold"
                value={form.exitThreshold}
                onChange={(value) => {
                  if (typeof value === 'number') updateForm('exitThreshold', value);
                }}
                min={0}
                step={0.1}
                decimalScale={2}
              />
              <NumberInput
                label="Stop-loss threshold"
                value={form.stopLoss}
                onChange={(value) => {
                  if (typeof value === 'number') updateForm('stopLoss', value);
                }}
                min={0.1}
                step={0.1}
                decimalScale={2}
              />
            </SimpleGrid>

            <SimpleGrid cols={{ base: 1, md: 2, xl: 4 }} spacing="md">
              <NumberInput
                label="Initial capital (€)"
                value={form.initialCapital}
                onChange={(value) => {
                  if (typeof value === 'number') updateForm('initialCapital', value);
                }}
                min={100}
                step={100}
              />
              <NumberInput
                label="Position size"
                description="Fraction of current equity allocated per trade"
                value={form.positionSize}
                onChange={(value) => {
                  if (typeof value === 'number') updateForm('positionSize', value);
                }}
                min={0.01}
                max={1}
                step={0.05}
                decimalScale={2}
              />
              <NumberInput
                label="Transaction fee"
                description="Per-leg fee as a decimal fraction"
                value={form.transactionFee}
                onChange={(value) => {
                  if (typeof value === 'number') updateForm('transactionFee', value);
                }}
                min={0}
                step={0.0005}
                decimalScale={4}
              />
              <NumberInput
                label="Min trade count warning"
                value={form.minTradeCountWarning}
                onChange={(value) => {
                  if (typeof value === 'number') updateForm('minTradeCountWarning', value);
                }}
                min={0}
                step={1}
              />
            </SimpleGrid>

            <Group justify="space-between" align="flex-end" gap="md">
              <Alert color="blue" variant="outline" radius="lg" icon={<IconInfoCircle size={18} />}>
                Rerunning the backtest also updates the URL, so edited presets stay shareable and refresh-safe.
              </Alert>
              <Button
                leftSection={<IconPlayerPlay size={16} />}
                size="md"
                radius="xl"
                onClick={handleRunBacktest}
                loading={loading}
              >
                Run backtest
              </Button>
            </Group>
          </Stack>
        </Paper>

        {loading ? (
          <Paper p="xl" radius="xl" withBorder>
            <Group gap="sm" mb="xs">
              <IconChartLine size={18} />
              <Text fw={700}>Running live backtest…</Text>
            </Group>
            <Text c="dimmed" size="sm">
              Waiting for the API to return metrics, trade log rows, signal markers,
              data-quality diagnostics, and the honest-reporting footer.
            </Text>
          </Paper>
        ) : null}

        {!loading && !result ? (
          <Paper p="xl" radius="xl" withBorder>
            <Stack align="center" gap="xs">
              <IconChartLine size={44} style={{ opacity: 0.35 }} />
              <Title order={4}>No backtest run yet</Title>
              <Text c="dimmed" ta="center" maw={640}>
                Use the prefilled research recommendation or edit the controls above,
                then run the live engine. Blocking preflight cases, zero-trade runs,
                warnings, charts, and the trade ledger will all appear inline here.
              </Text>
            </Stack>
          </Paper>
        ) : null}

        {!loading && result ? <BacktestResultView result={result} /> : null}
      </Stack>
    </Container>
  );
}
