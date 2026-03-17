'use client';

import { useMemo } from 'react';
import { Container, Title, Text, Stack } from '@mantine/core';
import PlotlyChart from '@/components/charts/PlotlyChart';

/**
 * Generate deterministic-looking demo price data.
 * Uses a simple pseudo-random walk so the chart is stable across
 * re-renders (seeded by the series name, not Math.random()).
 */
function generateDemoSeries(
  name: string,
  length: number,
  start: number,
  volatility: number,
) {
  const y: number[] = [start];
  // Simple deterministic seed from name
  let seed = 0;
  for (let i = 0; i < name.length; i++) {
    seed = (seed * 31 + name.charCodeAt(i)) | 0;
  }
  const pseudoRandom = () => {
    seed = (seed * 16807 + 12345) & 0x7fffffff;
    return (seed / 0x7fffffff) * 2 - 1; // range [-1, 1]
  };

  for (let i = 1; i < length; i++) {
    y.push(y[i - 1] + pseudoRandom() * volatility);
  }
  return {
    x: Array.from({ length }, (_, i) => i),
    y,
    type: 'scatter' as const,
    mode: 'lines' as const,
    name,
  };
}

export default function AcademyPage() {
  const demoData = useMemo(
    () => [
      generateDemoSeries('BTC-EUR', 100, 150, 3),
      generateDemoSeries('ETH-EUR', 100, 120, 2.5),
    ],
    [],
  );

  return (
    <Container>
      <Stack gap="lg">
        <div>
          <Title order={2}>Academy</Title>
          <Text c="dimmed" mt="sm">
            Step-by-step learning flow — coming soon.
          </Text>
        </div>

        <PlotlyChart
          data={demoData}
          layout={{
            title: { text: 'Demo: Price Comparison' },
            xaxis: { title: { text: 'Time' } },
            yaxis: { title: { text: 'Price (EUR)' } },
          }}
        />
      </Stack>
    </Container>
  );
}
