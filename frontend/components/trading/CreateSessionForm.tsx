'use client';

import { useState } from 'react';
import {
  Alert,
  Button,
  Group,
  NumberInput,
  Paper,
  Select,
  SimpleGrid,
  Stack,
  Switch,
  Text,
  Title,
} from '@mantine/core';
import { IconAlertTriangle, IconPlus } from '@tabler/icons-react';
import { usePairContext } from '@/contexts/PairContext';
import {
  createTradingSession,
  TIMEFRAME_OPTIONS,
  type CreateSessionRequest,
} from '@/lib/api';

interface CreateSessionFormProps {
  onSessionCreated: () => void;
}

export default function CreateSessionForm({
  onSessionCreated,
}: CreateSessionFormProps) {
  const { coins } = usePairContext();

  const [asset1, setAsset1] = useState<string | null>(null);
  const [asset2, setAsset2] = useState<string | null>(null);
  const [timeframe, setTimeframe] = useState<string | null>('1h');
  const [isLive, setIsLive] = useState(false);

  const [lookbackWindow, setLookbackWindow] = useState<number | string>(60);
  const [entryThreshold, setEntryThreshold] = useState<number | string>(2.0);
  const [exitThreshold, setExitThreshold] = useState<number | string>(0.5);
  const [initialCapital, setInitialCapital] = useState<number | string>(10000);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const coinOptions = coins.map((c) => ({ label: c, value: c }));
  const tfOptions = TIMEFRAME_OPTIONS.map((o) => ({
    label: o.label,
    value: o.value,
  }));

  async function handleSubmit() {
    if (!asset1 || !asset2 || !timeframe) return;

    setSubmitting(true);
    setError(null);
    try {
      const req: CreateSessionRequest = {
        asset1,
        asset2,
        timeframe,
        is_live: isLive,
        lookback_window:
          typeof lookbackWindow === 'number' ? lookbackWindow : 60,
        entry_threshold:
          typeof entryThreshold === 'number' ? entryThreshold : 2.0,
        exit_threshold:
          typeof exitThreshold === 'number' ? exitThreshold : 0.5,
        initial_capital:
          typeof initialCapital === 'number' ? initialCapital : 10000,
      };
      await createTradingSession(req);
      onSessionCreated();
      // Reset form
      setAsset1(null);
      setAsset2(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to create session'
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Paper p="md" radius="md" withBorder>
      <Stack gap="sm">
        <Title order={4}>Create Session</Title>

        {isLive && (
          <Alert
            icon={<IconAlertTriangle size={16} />}
            title="Live Trading Warning"
            color="red"
            variant="light"
          >
            Live sessions submit real orders to the exchange. Only proceed if
            you understand the risks and have configured valid API keys.
          </Alert>
        )}

        <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="sm">
          <Select
            label="Asset 1"
            placeholder="Select asset"
            data={coinOptions}
            value={asset1}
            onChange={setAsset1}
            searchable
          />
          <Select
            label="Asset 2"
            placeholder="Select asset"
            data={coinOptions}
            value={asset2}
            onChange={setAsset2}
            searchable
          />
          <Select
            label="Timeframe"
            data={tfOptions}
            value={timeframe}
            onChange={setTimeframe}
          />
          <Group align="end" h="100%" pb={1}>
            <Switch
              label={
                <Text fw={500} size="sm">
                  {isLive ? 'Live' : 'Paper'}
                </Text>
              }
              checked={isLive}
              onChange={(e) => setIsLive(e.currentTarget.checked)}
              color="red"
            />
          </Group>
        </SimpleGrid>

        <SimpleGrid cols={{ base: 2, md: 4 }} spacing="sm">
          <NumberInput
            label="Lookback Window"
            value={lookbackWindow}
            onChange={setLookbackWindow}
            min={2}
            step={10}
          />
          <NumberInput
            label="Entry Threshold"
            value={entryThreshold}
            onChange={setEntryThreshold}
            min={0.1}
            step={0.1}
            decimalScale={2}
          />
          <NumberInput
            label="Exit Threshold"
            value={exitThreshold}
            onChange={setExitThreshold}
            min={0}
            step={0.1}
            decimalScale={2}
          />
          <NumberInput
            label="Initial Capital (€)"
            value={initialCapital}
            onChange={setInitialCapital}
            min={100}
            step={1000}
          />
        </SimpleGrid>

        {error && (
          <Alert color="red" variant="light">
            {error}
          </Alert>
        )}

        <Group justify="flex-end">
          <Button
            leftSection={<IconPlus size={16} />}
            onClick={handleSubmit}
            loading={submitting}
            disabled={!asset1 || !asset2 || !timeframe}
            color={isLive ? 'red' : 'teal'}
          >
            Create {isLive ? 'Live' : 'Paper'} Session
          </Button>
        </Group>
      </Stack>
    </Paper>
  );
}
