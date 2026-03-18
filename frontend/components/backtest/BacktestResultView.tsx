'use client';

import {
  Alert,
  Badge,
  Divider,
  Group,
  List,
  Paper,
  SimpleGrid,
  Stack,
  Table,
  Text,
  Title,
} from '@mantine/core';
import {
  IconAlertTriangle,
  IconChartAreaLine,
  IconChartCandle,
  IconChartLine,
  IconInfoCircle,
  IconLock,
  IconRosetteDiscountCheck,
  IconShieldCheck,
  IconTable,
} from '@tabler/icons-react';
import PlotlyChart from '@/components/charts/PlotlyChart';
import type {
  BacktestResponse,
  EngineWarningPayload,
  SignalOverlayPointPayload,
} from '@/lib/api';
import type { Data, Layout } from 'plotly.js';

interface BacktestResultViewProps {
  result: BacktestResponse;
}

function currency(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return new Intl.NumberFormat('en-IE', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 2,
  }).format(value);
}

function pct(value: number | null | undefined, digits = 2): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return `${(value * 100).toFixed(digits)}%`;
}

function num(value: number | null | undefined, digits = 2): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return value.toFixed(digits);
}

function titleCaseSignal(signal: string): string {
  return signal.replaceAll('_', ' ');
}

function warningColor(severity: EngineWarningPayload['severity']): 'yellow' | 'red' {
  return severity === 'blocking' ? 'red' : 'yellow';
}

function signalColor(signal: SignalOverlayPointPayload['signal_type']): string {
  switch (signal) {
    case 'long_entry':
      return '#51cf66';
    case 'short_entry':
      return '#ff922b';
    case 'long_exit':
    case 'short_exit':
      return '#339af0';
    case 'stop_loss':
      return '#ff6b6b';
  }
}

function signalSymbol(signal: SignalOverlayPointPayload['signal_type']): string {
  switch (signal) {
    case 'long_entry':
      return 'triangle-up';
    case 'short_entry':
      return 'triangle-down';
    case 'long_exit':
    case 'short_exit':
      return 'diamond';
    case 'stop_loss':
      return 'x';
  }
}

function renderWarningDetails(details: EngineWarningPayload['details']): string | null {
  const entries = Object.entries(details).filter(([, value]) => value !== null && value !== undefined);
  if (entries.length === 0) return null;
  return entries
    .map(([key, value]) => `${key.replaceAll('_', ' ')}: ${String(value)}`)
    .join(' · ');
}

function buildEquityChart(result: BacktestResponse): { data: Data[]; layout: Partial<Layout> } {
  const x = result.equity_curve.map((point) => point.timestamp);

  return {
    data: [
      {
        type: 'scatter',
        mode: 'lines',
        name: 'Equity',
        x,
        y: result.equity_curve.map((point) => point.equity),
        line: { color: '#5eead4', width: 2.4 },
        fill: 'tozeroy',
        fillcolor: 'rgba(94, 234, 212, 0.12)',
      } as Data,
      {
        type: 'scatter',
        mode: 'lines',
        name: 'Cash',
        x,
        y: result.equity_curve.map((point) => point.cash),
        line: { color: '#339af0', width: 1.6, dash: 'dot' },
      } as Data,
      {
        type: 'scatter',
        mode: 'lines',
        name: 'Unrealized P&L',
        x,
        y: result.equity_curve.map((point) => point.unrealized_pnl),
        yaxis: 'y2',
        line: { color: '#ffd166', width: 1.4 },
      } as Data,
    ],
    layout: {
      title: { text: 'Equity curve' },
      height: 360,
      hovermode: 'x unified',
      xaxis: { title: { text: 'Timestamp' } },
      yaxis: { title: { text: 'Equity / cash (€)' } },
      yaxis2: {
        title: { text: 'Unrealized P&L (€)' },
        overlaying: 'y',
        side: 'right',
      },
      legend: { orientation: 'h', yanchor: 'bottom', y: 1.02 },
      shapes: [
        {
          type: 'line',
          x0: x[0],
          x1: x[x.length - 1],
          y0: result.request.strategy.initial_capital,
          y1: result.request.strategy.initial_capital,
          line: { color: 'rgba(255,255,255,0.18)', dash: 'dash', width: 1.2 },
        },
      ],
    },
  };
}

function buildSignalChart(result: BacktestResponse): { data: Data[]; layout: Partial<Layout> } {
  const grouped = new Map<SignalOverlayPointPayload['signal_type'], SignalOverlayPointPayload[]>();
  for (const signal of result.signal_overlay) {
    const bucket = grouped.get(signal.signal_type) ?? [];
    bucket.push(signal);
    grouped.set(signal.signal_type, bucket);
  }

  const series: Data[] = Array.from(grouped.entries()).map(([signalType, points]) => ({
    type: 'scatter',
    mode: 'markers',
    name: titleCaseSignal(signalType),
    x: points.map((point) => point.execution_timestamp),
    y: points.map((point) => point.zscore_at_signal),
    text: points.map(
      (point) =>
        `${titleCaseSignal(point.signal_type)}<br>` +
        `Signal bar: ${point.signal_timestamp}<br>` +
        `Execution bar: ${point.execution_timestamp}<br>` +
        `Hedge ratio: ${num(point.hedge_ratio_at_signal, 4)}`
    ),
    hovertemplate: '%{text}<extra></extra>',
    marker: {
      size: 12,
      symbol: signalSymbol(signalType),
      color: signalColor(signalType),
      line: { color: '#0f172a', width: 1 },
    },
  })) as Data[];

  return {
    data: series,
    layout: {
      title: { text: 'Signal overlay' },
      height: 320,
      hovermode: 'closest',
      xaxis: { title: { text: 'Execution timestamp' } },
      yaxis: { title: { text: 'Z-score at signal' } },
      legend: { orientation: 'h', yanchor: 'bottom', y: 1.02 },
      shapes: [
        {
          type: 'line',
          x0: 0,
          x1: 1,
          xref: 'paper',
          y0: result.request.strategy.entry_threshold,
          y1: result.request.strategy.entry_threshold,
          line: { color: '#51cf66', dash: 'dash', width: 1.2 },
        },
        {
          type: 'line',
          x0: 0,
          x1: 1,
          xref: 'paper',
          y0: -result.request.strategy.entry_threshold,
          y1: -result.request.strategy.entry_threshold,
          line: { color: '#51cf66', dash: 'dash', width: 1.2 },
        },
        {
          type: 'line',
          x0: 0,
          x1: 1,
          xref: 'paper',
          y0: result.request.strategy.exit_threshold,
          y1: result.request.strategy.exit_threshold,
          line: { color: '#339af0', dash: 'dot', width: 1.2 },
        },
        {
          type: 'line',
          x0: 0,
          x1: 1,
          xref: 'paper',
          y0: -result.request.strategy.exit_threshold,
          y1: -result.request.strategy.exit_threshold,
          line: { color: '#339af0', dash: 'dot', width: 1.2 },
        },
        {
          type: 'line',
          x0: 0,
          x1: 1,
          xref: 'paper',
          y0: result.request.strategy.stop_loss,
          y1: result.request.strategy.stop_loss,
          line: { color: '#ff6b6b', dash: 'dashdot', width: 1.2 },
        },
        {
          type: 'line',
          x0: 0,
          x1: 1,
          xref: 'paper',
          y0: -result.request.strategy.stop_loss,
          y1: -result.request.strategy.stop_loss,
          line: { color: '#ff6b6b', dash: 'dashdot', width: 1.2 },
        },
      ],
    },
  };
}

function MetricCard({
  title,
  value,
  subtitle,
  accent,
}: {
  title: string;
  value: string;
  subtitle: string;
  accent: string;
}) {
  return (
    <Paper
      p="md"
      radius="lg"
      withBorder
      style={{
        background:
          'linear-gradient(180deg, rgba(15,23,42,0.92) 0%, rgba(9,12,19,0.98) 100%)',
        borderColor: 'rgba(148, 163, 184, 0.16)',
        borderLeft: `3px solid ${accent}`,
      }}
    >
      <Text size="xs" fw={700} tt="uppercase" c="dimmed">
        {title}
      </Text>
      <Title order={3} mt={6}>
        {value}
      </Title>
      <Text size="xs" c="dimmed" mt={6}>
        {subtitle}
      </Text>
    </Paper>
  );
}

function WarningList({
  title,
  items,
}: {
  title: string;
  items: EngineWarningPayload[];
}) {
  if (items.length === 0) return null;

  const overfitItems = items.filter((w) => w.code.startsWith('overfit_'));
  const otherItems = items.filter((w) => !w.code.startsWith('overfit_'));

  return (
    <Stack gap="sm">
      <Text fw={700}>{title}</Text>
      {overfitItems.map((warning) => {
        const details = renderWarningDetails(warning.details);
        return (
          <Alert
            key={`${warning.code}-${warning.message}`}
            color="orange"
            variant="light"
            radius="lg"
            title="⚠️ Overfitting Signal"
            icon={<IconAlertTriangle size={17} color="#ff922b" />}
            styles={{
              root: {
                borderLeft: '3px solid var(--mantine-color-orange-6)',
              },
            }}
          >
            <Text size="sm" fw={600}>{titleCaseSignal(warning.code)}</Text>
            <Text size="sm" mt={4}>{warning.message}</Text>
            {details ? (
              <Text size="xs" c="dimmed" mt={6}>
                {details}
              </Text>
            ) : null}
          </Alert>
        );
      })}
      {otherItems.map((warning) => {
        const details = renderWarningDetails(warning.details);
        return (
          <Alert
            key={`${warning.code}-${warning.message}`}
            color={warningColor(warning.severity)}
            variant="light"
            radius="lg"
            title={titleCaseSignal(warning.code)}
            icon={
              warning.severity === 'blocking' ? (
                <IconLock size={17} />
              ) : (
                <IconAlertTriangle size={17} />
              )
            }
          >
            <Text size="sm">{warning.message}</Text>
            {details ? (
              <Text size="xs" c="dimmed" mt={6}>
                {details}
              </Text>
            ) : null}
          </Alert>
        );
      })}
    </Stack>
  );
}

export default function BacktestResultView({ result }: BacktestResultViewProps) {
  const qualityWarnings = result.data_quality.warnings;
  const blockers = result.data_quality.blockers;
  const runtimeWarnings = result.warnings.filter(
    (warning) => !qualityWarnings.some((candidate) => candidate.code === warning.code)
  );

  const equityChart = result.equity_curve.length > 0 ? buildEquityChart(result) : null;
  const signalChart = result.signal_overlay.length > 0 ? buildSignalChart(result) : null;

  return (
    <Stack gap="lg">
      <Paper
        p="lg"
        radius="xl"
        withBorder
        style={{
          background:
            result.status === 'blocked'
              ? 'linear-gradient(135deg, rgba(69,10,10,0.92), rgba(31,41,55,0.96))'
              : 'linear-gradient(135deg, rgba(8,47,73,0.9), rgba(17,24,39,0.96))',
          borderColor:
            result.status === 'blocked'
              ? 'rgba(248, 113, 113, 0.3)'
              : 'rgba(94, 234, 212, 0.22)',
        }}
      >
        <Group justify="space-between" align="flex-start" gap="md">
          <div>
            <Group gap="xs" mb="xs">
              <Badge color={result.status === 'blocked' ? 'red' : 'teal'} variant="light">
                {result.status === 'blocked' ? 'Blocked preflight' : 'Backtest completed'}
              </Badge>
              <Badge variant="outline" color="blue">
                {result.request.asset1} × {result.request.asset2} · {result.request.timeframe}
              </Badge>
            </Group>
            <Title order={3}>Trustworthy run report</Title>
            <Text c="dimmed" mt={6}>
              Metrics, warnings, and execution assumptions are displayed together so
              strong-looking charts cannot hide weak evidence or blocked data quality.
            </Text>
          </div>
          <IconShieldCheck
            size={30}
            color={result.status === 'blocked' ? '#f87171' : '#5eead4'}
          />
        </Group>
      </Paper>

      <SimpleGrid cols={{ base: 1, sm: 2, xl: 4 }} spacing="md">
        <MetricCard
          title="Final equity"
          value={currency(result.metrics.final_equity)}
          subtitle={`From ${currency(result.request.strategy.initial_capital)} starting capital`}
          accent="#5eead4"
        />
        <MetricCard
          title="Total return"
          value={pct(result.metrics.total_return_pct)}
          subtitle={`${currency(result.metrics.total_net_pnl)} net P&L after fees`}
          accent={result.metrics.total_return_pct >= 0 ? '#51cf66' : '#ff6b6b'}
        />
        <MetricCard
          title="Win rate"
          value={pct(result.metrics.win_rate)}
          subtitle={`${result.metrics.winning_trades}/${result.metrics.total_trades} winning trades`}
          accent="#339af0"
        />
        <MetricCard
          title="Max drawdown"
          value={pct(result.metrics.max_drawdown_pct)}
          subtitle={`Avg hold ${num(result.metrics.average_holding_period_bars, 1)} bars`}
          accent="#ffd166"
        />
        <MetricCard
          title="Profit factor"
          value={num(result.metrics.profit_factor, 2)}
          subtitle={`Sharpe ${num(result.metrics.sharpe_ratio, 2)} · Sortino ${num(result.metrics.sortino_ratio, 2)}`}
          accent="#c084fc"
        />
        <MetricCard
          title="Completed trades"
          value={String(result.metrics.total_trades)}
          subtitle={`${result.trade_log.length} trade log rows · ${result.signal_overlay.length} signal events`}
          accent="#60a5fa"
        />
        <MetricCard
          title="Spread summary"
          value={`μ ${num(result.spread_summary.mean, 3)}`}
          subtitle={`σ ${num(result.spread_summary.std, 3)}`}
          accent="#fb7185"
        />
        <MetricCard
          title="Data quality"
          value={result.data_quality.status === 'blocked' ? 'Blocked' : 'Passed'}
          subtitle={`${result.data_quality.observations_usable} usable / ${result.data_quality.observations_total} total · warmup ${result.data_quality.warmup_bars}`}
          accent={result.data_quality.status === 'blocked' ? '#ff6b6b' : '#5eead4'}
        />
      </SimpleGrid>

      <Paper p="lg" radius="xl" withBorder>
        <Group gap="xs" mb="xs">
          <IconRosetteDiscountCheck size={18} />
          <Text fw={700}>Data-quality status</Text>
        </Group>
        <Text c="dimmed" size="sm" mb="md">
          Observations total: {result.data_quality.observations_total} · usable after
          warmup: {result.data_quality.observations_usable} · warmup bars:{' '}
          {result.data_quality.warmup_bars}
        </Text>

        <Stack gap="md">
          {result.status === 'blocked' ? (
            <Alert color="red" variant="light" radius="lg" title="Execution blocked" icon={<IconLock size={18} />}>
              The engine refused to run this preset on the available history. Review the blockers below, then lower the warmup requirement or increase the history window.
            </Alert>
          ) : (
            <Alert color="teal" variant="light" radius="lg" title="Preflight passed" icon={<IconShieldCheck size={18} />}>
              The run met the minimum bar-count and price-integrity checks required for a trustworthy next-bar backtest.
            </Alert>
          )}

          <WarningList title="Blocking issues" items={blockers} />
          <WarningList title="Preflight warnings" items={qualityWarnings} />
          <WarningList title="Runtime warnings" items={runtimeWarnings} />

          {blockers.length === 0 && qualityWarnings.length === 0 && runtimeWarnings.length === 0 ? (
            <Alert color="blue" variant="outline" radius="lg" title="No warnings raised" icon={<IconInfoCircle size={18} />}>
              This run completed without any preflight or runtime warning objects.
            </Alert>
          ) : null}
        </Stack>
      </Paper>

      {result.status === 'blocked' ? (
        <Alert color="red" radius="lg" title="Charts hidden by design" icon={<IconChartLine size={18} />}>
          Because preflight blocked this run, there is no equity curve, signal overlay, or trade log to render. The empty-state is explicit so a blocked run never masquerades as a flat strategy.
        </Alert>
      ) : null}

      {result.status !== 'blocked' ? (
        <SimpleGrid cols={{ base: 1, xl: 2 }} spacing="lg">
          <Paper p="md" radius="xl" withBorder>
            <Group gap="xs" mb="xs">
              <IconChartAreaLine size={18} />
              <Text fw={700}>Equity curve</Text>
            </Group>
            {equityChart ? (
              <PlotlyChart data={equityChart.data} layout={equityChart.layout} />
            ) : (
              <Alert color="yellow" icon={<IconAlertTriangle size={16} />}>
                No equity curve points were returned for this run.
              </Alert>
            )}
          </Paper>

          <Paper p="md" radius="xl" withBorder>
            <Group gap="xs" mb="xs">
              <IconChartCandle size={18} />
              <Text fw={700}>Signal overlay</Text>
            </Group>
            {signalChart ? (
              <PlotlyChart data={signalChart.data} layout={signalChart.layout} />
            ) : (
              <Alert color="yellow" icon={<IconAlertTriangle size={16} />}>
                The engine returned no executable signal markers for this run.
              </Alert>
            )}
          </Paper>
        </SimpleGrid>
      ) : null}

      <Paper p="lg" radius="xl" withBorder>
        <Group gap="xs" mb="sm">
          <IconTable size={18} />
          <Text fw={700}>Trade log</Text>
        </Group>

        {result.trade_log.length > 0 ? (
          <Table.ScrollContainer minWidth={1150}>
            <Table striped highlightOnHover withTableBorder withColumnBorders>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>ID</Table.Th>
                  <Table.Th>Direction</Table.Th>
                  <Table.Th>Entry</Table.Th>
                  <Table.Th>Exit</Table.Th>
                  <Table.Th>Reasons</Table.Th>
                  <Table.Th>Bars held</Table.Th>
                  <Table.Th>Entry Z</Table.Th>
                  <Table.Th>Exit Z</Table.Th>
                  <Table.Th>Fees</Table.Th>
                  <Table.Th>Net P&L</Table.Th>
                  <Table.Th>Return</Table.Th>
                  <Table.Th>Equity after</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {result.trade_log.map((trade) => (
                  <Table.Tr key={trade.trade_id}>
                    <Table.Td>{trade.trade_id}</Table.Td>
                    <Table.Td>{titleCaseSignal(trade.direction)}</Table.Td>
                    <Table.Td>
                      <Text size="sm">{trade.entry_timestamp}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{trade.exit_timestamp}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">
                        {titleCaseSignal(trade.entry_reason)} → {titleCaseSignal(trade.exit_reason)}
                      </Text>
                    </Table.Td>
                    <Table.Td>{trade.bars_held}</Table.Td>
                    <Table.Td>{num(trade.entry_zscore, 2)}</Table.Td>
                    <Table.Td>{num(trade.exit_zscore, 2)}</Table.Td>
                    <Table.Td>{currency(trade.total_fees)}</Table.Td>
                    <Table.Td>
                      <Text c={trade.net_pnl >= 0 ? 'teal.3' : 'red.3'} fw={700}>
                        {currency(trade.net_pnl)}
                      </Text>
                    </Table.Td>
                    <Table.Td>{pct(trade.return_pct)}</Table.Td>
                    <Table.Td>{currency(trade.equity_after_trade)}</Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        ) : (
          <Alert color={result.status === 'blocked' ? 'red' : 'yellow'} icon={<IconAlertTriangle size={16} />}>
            {result.status === 'blocked'
              ? 'Trade log unavailable because preflight blocked execution.'
              : 'This run completed without any round-trip trades. Review the warnings above before drawing conclusions from the flat trade log.'}
          </Alert>
        )}
      </Paper>

      <Paper p="lg" radius="xl" withBorder>
        <Group gap="xs" mb="sm">
          <IconInfoCircle size={18} />
          <Text fw={700}>Honest-reporting footer</Text>
        </Group>
        <SimpleGrid cols={{ base: 1, lg: 3 }} spacing="lg">
          <div>
            <Text fw={600} mb={6}>
              Execution model
            </Text>
            <Text size="sm" c="dimmed">
              {result.footer.execution_model}
            </Text>
          </div>
          <div>
            <Text fw={600} mb={6}>
              Fee model
            </Text>
            <Text size="sm" c="dimmed">
              {result.footer.fee_model}
            </Text>
          </div>
          <div>
            <Text fw={600} mb={6}>
              Data basis
            </Text>
            <Text size="sm" c="dimmed">
              {result.footer.data_basis}
            </Text>
          </div>
        </SimpleGrid>

        <Divider my="md" />

        <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="lg">
          <div>
            <Text fw={600} mb="xs">
              Assumptions
            </Text>
            <List size="sm" c="dimmed" spacing="xs">
              {result.footer.assumptions.map((item) => (
                <List.Item key={item}>{item}</List.Item>
              ))}
            </List>
          </div>
          <div>
            <Text fw={600} mb="xs">
              Limitations
            </Text>
            <List size="sm" c="dimmed" spacing="xs">
              {result.footer.limitations.map((item) => (
                <List.Item key={item}>{item}</List.Item>
              ))}
            </List>
          </div>
        </SimpleGrid>
      </Paper>
    </Stack>
  );
}
