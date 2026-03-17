'use client';

import { Alert, Badge, Container, Group, Stack, Text, Title } from '@mantine/core';
import { IconAlertTriangle, IconFlask2 } from '@tabler/icons-react';
import LookbackSweepPanel from '@/components/research/LookbackSweepPanel';
import { usePairContext } from '@/contexts/PairContext';

export default function ResearchPage() {
  const { asset1, asset2, timeframe, error: pairError } = usePairContext();

  return (
    <Container size="xl" py="md">
      <Stack gap="lg">
        <div>
          <Group gap="md" mb="xs">
            <Title order={2}>Research</Title>
            <Badge variant="light" color="teal">
              Connected handoff
            </Badge>
            {asset1 && asset2 ? (
              <Badge variant="outline" color="blue">
                {asset1}/EUR × {asset2}/EUR · {timeframe}
              </Badge>
            ) : null}
          </Group>
          <Text c="dimmed" size="sm">
            Run the first live research module, read the takeaway, and jump into the
            real backtester with a shareable preset instead of copying numbers by hand.
          </Text>
        </div>

        {pairError ? (
          <Alert color="red" title="Pair metadata failed to load" icon={<IconAlertTriangle size={18} />}>
            {pairError}
          </Alert>
        ) : null}

        {!asset1 || !asset2 ? (
          <Alert color="blue" variant="light" radius="lg" icon={<IconFlask2 size={18} />}>
            Select asset 1, asset 2, and timeframe in the dashboard header to unlock the
            live lookback-window sweep.
          </Alert>
        ) : null}

        <LookbackSweepPanel asset1={asset1} asset2={asset2} timeframe={timeframe} />
      </Stack>
    </Container>
  );
}
