'use client';

import { useState, useCallback, useRef } from 'react';
import {
  Container,
  Title,
  Text,
  Badge,
  Group,
  Paper,
  SimpleGrid,
  MultiSelect,
  Select,
  NumberInput,
  Button,
  Progress,
  Table,
  Alert,
  Stack,
} from '@mantine/core';
import {
  IconPlayerPlay,
  IconClock,
  IconCalendar,
  IconStar,
  IconAlertTriangle,
  IconCheck,
  IconChartHistogram,
} from '@tabler/icons-react';
import { usePairContext } from '@/contexts/PairContext';
import {
  postCointegration,
  type CointegrationResponse,
} from '@/lib/api';
import PlotlyChart from '@/components/charts/PlotlyChart';
import type { Data, Layout } from 'plotly.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ScanRow {
  pair: string;
  cointegrated: '✅' | '❌' | '⚠️';
  pValue: number | null;
  testStat: number | null;
  hedgeRatio: number | null;
  halfLife: string;
  correlation: number | null;
  skew: number | null;
  kurtosis: number | null;
  points: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TOP_COINS = [
  'BTC', 'ETH', 'XRP', 'SOL', 'ADA', 'DOGE', 'DOT', 'LINK',
  'AVAX', 'MATIC', 'UNI', 'ATOM', 'LTC', 'ETC', 'ALGO', 'XLM',
  'FIL', 'NEAR', 'APT', 'ARB',
];

const TIMEFRAME_OPTIONS = [
  { label: '15 min', value: '15m' },
  { label: '1 hour', value: '1h' },
  { label: '4 hours', value: '4h' },
  { label: '1 day', value: '1d' },
];

const BATCH_SIZE = 5;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Generate all unique pair combinations from N coins. */
function generatePairs(coins: string[]): [string, string][] {
  const pairs: [string, string][] = [];
  for (let i = 0; i < coins.length; i++) {
    for (let j = i + 1; j < coins.length; j++) {
      pairs.push([coins[i], coins[j]]);
    }
  }
  return pairs;
}

/** Sort rows: cointegrated first, then by p-value ascending. */
function sortRows(rows: ScanRow[]): ScanRow[] {
  return [...rows].sort((a, b) => {
    const aRank = a.cointegrated === '✅' ? 0 : a.cointegrated === '❌' ? 1 : 2;
    const bRank = b.cointegrated === '✅' ? 0 : b.cointegrated === '❌' ? 1 : 2;
    if (aRank !== bRank) return aRank - bRank;
    return (a.pValue ?? 999) - (b.pValue ?? 999);
  });
}

/** Format a number to N decimal places, or "—" if null. */
function fmt(val: number | null, decimals: number): string {
  if (val === null || val === undefined) return '—';
  return val.toFixed(decimals);
}

/** Convert a CointegrationResponse to a ScanRow. */
function responseToRow(
  pairName: string,
  res: CointegrationResponse
): ScanRow {
  const hl = res.half_life;
  return {
    pair: pairName,
    cointegrated: res.is_cointegrated ? '✅' : '❌',
    pValue: res.p_value,
    testStat: res.cointegration_score,
    hedgeRatio: res.hedge_ratio,
    halfLife: hl === null || hl > 10000 ? '∞' : hl.toFixed(1),
    correlation: res.correlation,
    skew: res.spread_properties.skewness,
    kurtosis: res.spread_properties.kurtosis,
    points: res.timestamps.length,
  };
}

/** Create an error row for a failed pair analysis. */
function errorRow(pairName: string): ScanRow {
  return {
    pair: pairName,
    cointegrated: '⚠️',
    pValue: null,
    testStat: null,
    hedgeRatio: null,
    halfLife: '—',
    correlation: null,
    skew: null,
    kurtosis: null,
    points: 0,
  };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ScannerPage() {
  const { coins } = usePairContext();

  // Controls state
  const [selectedCoins, setSelectedCoins] = useState<string[]>([]);
  const [timeframe, setTimeframe] = useState<string>('1h');
  const [daysBack, setDaysBack] = useState<number>(90);

  // Scan state
  const [scanning, setScanning] = useState(false);
  const [completedCount, setCompletedCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [results, setResults] = useState<ScanRow[] | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const abortRef = useRef(false);

  // Coin options from context
  const coinOptions = coins.map((c) => ({ label: c, value: c }));

  // Select top 20 coins (only those available in the exchange)
  const handleSelectTop = useCallback(() => {
    const available = new Set(coins);
    setSelectedCoins(TOP_COINS.filter((c) => available.has(c)));
  }, [coins]);

  // Run the batch scan
  const handleRunScan = useCallback(async () => {
    if (selectedCoins.length < 2) {
      setValidationError('Select at least 2 coins to scan.');
      return;
    }
    setValidationError(null);
    setScanning(true);
    setResults(null);
    abortRef.current = false;

    const pairs = generatePairs(selectedCoins);
    setTotalCount(pairs.length);
    setCompletedCount(0);

    const allRows: ScanRow[] = [];

    // Process in batches to avoid overwhelming the backend
    for (let i = 0; i < pairs.length; i += BATCH_SIZE) {
      if (abortRef.current) break;

      const batch = pairs.slice(i, i + BATCH_SIZE);
      const promises = batch.map(([c1, c2]) => {
        const pairName = `${c1} / ${c2}`;
        return postCointegration({
          asset1: `${c1}/EUR`,
          asset2: `${c2}/EUR`,
          timeframe,
          days_back: daysBack,
        })
          .then((res) => responseToRow(pairName, res))
          .catch((err) => {
            console.error(`Scanner: failed ${pairName}:`, err);
            return errorRow(pairName);
          });
      });

      const batchResults = await Promise.allSettled(promises);

      for (const r of batchResults) {
        if (r.status === 'fulfilled') {
          allRows.push(r.value);
        }
        // rejected shouldn't happen since we catch inside, but just in case
      }

      setCompletedCount((prev) => prev + batch.length);
    }

    setResults(allRows);
    setScanning(false);
  }, [selectedCoins, timeframe, daysBack]);

  // Derived data
  const sortedResults = results ? sortRows(results) : null;
  const cointegratedCount = results
    ? results.filter((r) => r.cointegrated === '✅').length
    : 0;
  const errorCount = results
    ? results.filter((r) => r.cointegrated === '⚠️').length
    : 0;
  const pValues = results
    ? results.map((r) => r.pValue).filter((v): v is number => v !== null)
    : [];

  const progressPct = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return (
    <Container size="xl" py="md">
      {/* Header */}
      <Group gap="md" mb="xs">
        <Title order={2}>Pair Scanner</Title>
        <Badge variant="light" color="blue">
          Cointegration Discovery
        </Badge>
      </Group>
      <Text c="dimmed" size="sm" mb="lg">
        Scan pairs for cointegration. Select coins, run the scan, find
        statistically significant relationships.
      </Text>

      {/* Controls */}
      <Paper shadow="xs" p="lg" radius="md" withBorder mb="lg">
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md">
          <MultiSelect
            label="Coins to scan"
            placeholder="Select coins…"
            data={coinOptions}
            value={selectedCoins}
            onChange={setSelectedCoins}
            searchable
            clearable
          />
          <Select
            label="Timeframe"
            data={TIMEFRAME_OPTIONS}
            value={timeframe}
            onChange={(v) => v && setTimeframe(v)}
            leftSection={<IconClock size={16} />}
          />
          <NumberInput
            label="History (days)"
            value={daysBack}
            onChange={(v) => typeof v === 'number' && setDaysBack(v)}
            min={7}
            max={365}
            leftSection={<IconCalendar size={16} />}
          />
          <Stack gap={4}>
            <Text size="sm">&nbsp;</Text>
            <Button
              leftSection={<IconPlayerPlay size={16} />}
              fullWidth
              onClick={handleRunScan}
              loading={scanning}
              disabled={scanning}
            >
              Run Scan
            </Button>
          </Stack>
        </SimpleGrid>
        <Group mt="sm">
          <Button
            variant="subtle"
            size="xs"
            leftSection={<IconStar size={14} />}
            onClick={handleSelectTop}
          >
            Select top 20 by volume
          </Button>
        </Group>
      </Paper>

      {/* Validation error */}
      {validationError && (
        <Alert
          color="yellow"
          title="Missing selection"
          icon={<IconAlertTriangle size={18} />}
          mb="md"
          withCloseButton
          onClose={() => setValidationError(null)}
        >
          {validationError}
        </Alert>
      )}

      {/* Progress bar */}
      {scanning && (
        <Paper p="md" radius="md" withBorder mb="md">
          <Text size="sm" mb="xs" fw={500}>
            Scanning {completedCount}/{totalCount} pairs…
          </Text>
          <Progress
            value={progressPct}
            size="lg"
            radius="md"
            striped
            animated
          />
        </Paper>
      )}

      {/* Status alert after scan */}
      {results && !scanning && (
        <Alert
          color={cointegratedCount > 0 ? 'green' : 'blue'}
          title="Scan complete"
          icon={<IconCheck size={18} />}
          mb="md"
        >
          Scanned {results.length} pairs. Found {cointegratedCount} cointegrated,{' '}
          {results.length - cointegratedCount - errorCount} not cointegrated
          {errorCount > 0 ? `, ${errorCount} failed` : ''}.
        </Alert>
      )}

      {/* Results table */}
      {sortedResults && sortedResults.length > 0 && (
        <Paper p="md" radius="md" withBorder mb="lg">
          <Group mb="sm">
            <IconChartHistogram size={20} />
            <Title order={4}>Results</Title>
            <Badge variant="light" size="sm">
              {sortedResults.length} pairs
            </Badge>
          </Group>
          <Table.ScrollContainer minWidth={900}>
            <Table
              striped
              highlightOnHover
              withTableBorder
              withColumnBorders
            >
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Pair</Table.Th>
                  <Table.Th>Coint?</Table.Th>
                  <Table.Th>p-value</Table.Th>
                  <Table.Th>Test Stat</Table.Th>
                  <Table.Th>Hedge Ratio</Table.Th>
                  <Table.Th>Half-life</Table.Th>
                  <Table.Th>Correlation</Table.Th>
                  <Table.Th>Skew</Table.Th>
                  <Table.Th>Kurt</Table.Th>
                  <Table.Th>Points</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {sortedResults.map((row) => (
                  <Table.Tr
                    key={row.pair}
                    style={
                      row.cointegrated === '✅'
                        ? { backgroundColor: 'rgba(81, 207, 102, 0.06)' }
                        : undefined
                    }
                  >
                    <Table.Td>
                      <Text fw={600} size="sm">
                        {row.pair}
                      </Text>
                    </Table.Td>
                    <Table.Td>{row.cointegrated}</Table.Td>
                    <Table.Td>
                      <Text
                        fw={
                          row.pValue !== null && row.pValue < 0.05 ? 700 : 400
                        }
                        size="sm"
                      >
                        {fmt(row.pValue, 4)}
                      </Text>
                    </Table.Td>
                    <Table.Td>{fmt(row.testStat, 2)}</Table.Td>
                    <Table.Td>{fmt(row.hedgeRatio, 4)}</Table.Td>
                    <Table.Td>{row.halfLife}</Table.Td>
                    <Table.Td>{fmt(row.correlation, 3)}</Table.Td>
                    <Table.Td>{fmt(row.skew, 2)}</Table.Td>
                    <Table.Td>{fmt(row.kurtosis, 2)}</Table.Td>
                    <Table.Td>{row.points}</Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        </Paper>
      )}

      {/* P-value histogram */}
      {pValues.length > 0 && !scanning && (
        <Paper p="md" radius="md" withBorder>
          <PlotlyChart
            data={[
              {
                type: 'histogram',
                x: pValues,
                nbinsx: 20,
                marker: {
                  color: 'rgba(51, 154, 240, 0.7)',
                  line: { color: 'rgba(51, 154, 240, 1)', width: 1 },
                },
              } as Data,
            ]}
            layout={
              {
                title: { text: 'Distribution of Cointegration p-values' },
                xaxis: { title: { text: 'p-value' } },
                yaxis: { title: { text: 'Count' } },
                height: 300,
                shapes: [
                  {
                    type: 'line',
                    x0: 0.05,
                    x1: 0.05,
                    y0: 0,
                    y1: 1,
                    yref: 'paper',
                    line: { color: '#FF6B6B', width: 2, dash: 'dash' },
                  },
                ],
                annotations: [
                  {
                    x: 0.05,
                    y: 1,
                    yref: 'paper',
                    text: 'p = 0.05',
                    showarrow: false,
                    font: { color: '#FF6B6B', size: 12 },
                    xanchor: 'left',
                    xshift: 4,
                  },
                ],
              } as Partial<Layout>
            }
            style={{ height: 300 }}
          />
        </Paper>
      )}

      {/* Empty state */}
      {!results && !scanning && (
        <Paper p="xl" radius="md" withBorder ta="center">
          <IconChartHistogram
            size={48}
            style={{ opacity: 0.3, margin: '0 auto' }}
          />
          <Text size="lg" fw={500} mt="md">
            No scan results yet
          </Text>
          <Text c="dimmed" size="sm" mt="xs">
            Select coins above and click &quot;Run Scan&quot; to find
            cointegrated pairs.
          </Text>
        </Paper>
      )}
    </Container>
  );
}
