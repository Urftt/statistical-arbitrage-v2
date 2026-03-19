'use client';

import { useEffect, useState } from 'react';
import {
  Alert,
  Badge,
  Card,
  Group,
  Loader,
  SimpleGrid,
  Stack,
  Table,
  Text,
  Title,
} from '@mantine/core';
import { IconAlertTriangle } from '@tabler/icons-react';
import PlotlyChart from '@/components/charts/PlotlyChart';
import {
  fetchTradingSession,
  type SessionDetailResponse,
} from '@/lib/api';

interface SessionDetailProps {
  sessionId: string;
  /** Incremented by the parent to force a refetch after actions. */
  refreshKey?: number;
}

export default function SessionDetail({
  sessionId,
  refreshKey,
}: SessionDetailProps) {
  const [detail, setDetail] = useState<SessionDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchTradingSession(sessionId);
        if (!cancelled) setDetail(data);
      } catch (err) {
        if (!cancelled)
          setError(
            err instanceof Error ? err.message : 'Failed to load session'
          );
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [sessionId, refreshKey]);

  if (loading) {
    return (
      <Group justify="center" py="xl">
        <Loader size="sm" />
        <Text c="dimmed">Loading session detail…</Text>
      </Group>
    );
  }

  if (error) {
    return (
      <Alert color="red" variant="light">
        {error}
      </Alert>
    );
  }

  if (!detail) return null;

  const { config, positions, trades, equity_history, orders } = detail;

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <Title order={4}>
          Session: {config.asset1}/{config.asset2}
        </Title>
        <Group gap="xs">
          <Badge color={detail.is_live ? 'red' : 'teal'} variant="light">
            {detail.is_live ? 'Live' : 'Paper'}
          </Badge>
          <Badge
            color={
              detail.status === 'running'
                ? 'green'
                : detail.status === 'error' || detail.status === 'killed'
                  ? 'red'
                  : detail.status === 'stopped'
                    ? 'yellow'
                    : 'gray'
            }
            variant="dot"
          >
            {detail.status}
          </Badge>
        </Group>
      </Group>

      {detail.last_error && (
        <Alert
          icon={<IconAlertTriangle size={16} />}
          title="Last Error"
          color="red"
          variant="light"
        >
          {detail.last_error}
        </Alert>
      )}

      {/* Config card */}
      <Card withBorder radius="md" p="sm">
        <SimpleGrid cols={{ base: 2, md: 4 }} spacing="xs">
          <div>
            <Text size="xs" c="dimmed">Timeframe</Text>
            <Text size="sm" fw={500}>{config.timeframe}</Text>
          </div>
          <div>
            <Text size="xs" c="dimmed">Lookback</Text>
            <Text size="sm" fw={500}>{config.lookback_window}</Text>
          </div>
          <div>
            <Text size="xs" c="dimmed">Entry / Exit</Text>
            <Text size="sm" fw={500}>
              ±{config.entry_threshold} / ±{config.exit_threshold}
            </Text>
          </div>
          <div>
            <Text size="xs" c="dimmed">Capital</Text>
            <Text size="sm" fw={500}>
              €{config.initial_capital.toLocaleString()}
            </Text>
          </div>
        </SimpleGrid>
      </Card>

      {/* Equity curve */}
      {equity_history.length > 0 && (
        <Card withBorder radius="md" p="sm">
          <Title order={5} mb="xs">
            Equity Curve
          </Title>
          <PlotlyChart
            data={[
              {
                x: equity_history.map((ep) => new Date(ep.timestamp)),
                y: equity_history.map((ep) => ep.equity),
                type: 'scatter' as const,
                mode: 'lines' as const,
                name: 'Equity',
                line: { color: '#4ecdc4', width: 2 },
              },
            ]}
            layout={{
              height: 300,
              xaxis: { title: { text: 'Time' } },
              yaxis: { title: { text: 'Equity (€)' } },
              margin: { t: 20, b: 40, l: 60, r: 20 },
            }}
          />
        </Card>
      )}

      {/* Open positions */}
      {positions.length > 0 && (
        <Card withBorder radius="md" p="sm">
          <Title order={5} mb="xs">
            Open Positions ({positions.length})
          </Title>
          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Symbol</Table.Th>
                <Table.Th>Direction</Table.Th>
                <Table.Th>Qty Asset 1</Table.Th>
                <Table.Th>Entry Price</Table.Th>
                <Table.Th>Capital</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {positions.map((p, i) => (
                <Table.Tr key={i}>
                  <Table.Td>{p.symbol}</Table.Td>
                  <Table.Td>
                    <Badge
                      color={p.direction === 'long_spread' ? 'green' : 'red'}
                      variant="light"
                      size="xs"
                    >
                      {p.direction}
                    </Badge>
                  </Table.Td>
                  <Table.Td>{p.quantity_asset1.toFixed(4)}</Table.Td>
                  <Table.Td>€{p.entry_price_asset1.toFixed(2)}</Table.Td>
                  <Table.Td>€{p.allocated_capital.toFixed(2)}</Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Card>
      )}

      {/* Trades */}
      {trades.length > 0 && (
        <Card withBorder radius="md" p="sm">
          <Title order={5} mb="xs">
            Trades ({trades.length})
          </Title>
          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>#</Table.Th>
                <Table.Th>Direction</Table.Th>
                <Table.Th>Entry</Table.Th>
                <Table.Th>Exit</Table.Th>
                <Table.Th>PnL</Table.Th>
                <Table.Th>Return</Table.Th>
                <Table.Th>Bars</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {trades.map((t) => (
                <Table.Tr key={t.trade_id}>
                  <Table.Td>{t.trade_id}</Table.Td>
                  <Table.Td>
                    <Badge
                      color={t.direction === 'long_spread' ? 'green' : 'red'}
                      variant="light"
                      size="xs"
                    >
                      {t.direction}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Text size="xs">
                      {new Date(t.entry_timestamp).toLocaleString()}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="xs">
                      {new Date(t.exit_timestamp).toLocaleString()}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Text
                      size="sm"
                      c={t.net_pnl >= 0 ? 'teal' : 'red'}
                      fw={500}
                    >
                      €{t.net_pnl.toFixed(2)}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Text
                      size="sm"
                      c={t.return_pct >= 0 ? 'teal' : 'red'}
                    >
                      {(t.return_pct * 100).toFixed(2)}%
                    </Text>
                  </Table.Td>
                  <Table.Td>{t.bars_held}</Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Card>
      )}

      {/* Orders (live sessions only) */}
      {detail.is_live && orders.length > 0 && (
        <Card withBorder radius="md" p="sm">
          <Title order={5} mb="xs">
            Orders ({orders.length})
          </Title>
          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Order ID</Table.Th>
                <Table.Th>Side</Table.Th>
                <Table.Th>Symbol</Table.Th>
                <Table.Th>Fill Price</Table.Th>
                <Table.Th>Fee</Table.Th>
                <Table.Th>Status</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {orders.map((o) => (
                <Table.Tr key={o.order_id}>
                  <Table.Td>
                    <Text size="xs" ff="monospace">
                      {o.order_id.slice(0, 8)}…
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Badge
                      color={o.side === 'buy' ? 'green' : 'red'}
                      variant="light"
                      size="xs"
                    >
                      {o.side}
                    </Badge>
                  </Table.Td>
                  <Table.Td>{o.symbol}</Table.Td>
                  <Table.Td>€{o.fill_price.toFixed(2)}</Table.Td>
                  <Table.Td>€{o.fee.toFixed(4)}</Table.Td>
                  <Table.Td>
                    <Badge
                      color={o.status === 'filled' ? 'green' : 'gray'}
                      variant="dot"
                      size="xs"
                    >
                      {o.status}
                    </Badge>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Card>
      )}
    </Stack>
  );
}
