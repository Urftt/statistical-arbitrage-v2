'use client';

import { useEffect, useRef, useState } from 'react';
import { Container, Stack, Text, Title } from '@mantine/core';
import { AcademyStepper } from '@/components/academy/AcademyStepper';
import { StepPairSelector } from '@/components/academy/StepPairSelector';
import { usePairContext } from '@/contexts/PairContext';
import {
  postCointegration,
  type CointegrationResponse,
} from '@/lib/api';

// ---------------------------------------------------------------------------
// Cointegration cache type
// ---------------------------------------------------------------------------

interface CointCache {
  key: string;
  data: CointegrationResponse;
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default function AcademyPage() {
  const { asset1, asset2, timeframe } = usePairContext();

  // Step navigation state
  const [activeStep, setActiveStep] = useState(0);

  // Cointegration result cache — avoids re-fetching when navigating steps
  const cointCache = useRef<CointCache | null>(null);
  const [cointData, setCointData] = useState<CointegrationResponse | null>(null);
  const [cointLoading, setCointLoading] = useState(false);
  const [cointError, setCointError] = useState<string | null>(null);

  // Fetch cointegration data when pair/timeframe changes
  useEffect(() => {
    if (!asset1 || !asset2) {
      setCointData(null);
      setCointError(null);
      return;
    }

    const cacheKey = `${asset1}-${asset2}-${timeframe}`;

    // Use cached result if key matches
    if (cointCache.current?.key === cacheKey) {
      setCointData(cointCache.current.data);
      setCointError(null);
      return;
    }

    let cancelled = false;

    async function fetchCointegration() {
      setCointLoading(true);
      setCointError(null);

      try {
        const result = await postCointegration({
          asset1: `${asset1}/EUR`,
          asset2: `${asset2}/EUR`,
          timeframe,
        });

        if (cancelled) return;

        cointCache.current = { key: cacheKey, data: result };
        setCointData(result);
      } catch (err) {
        if (cancelled) return;
        const message =
          err instanceof Error ? err.message : 'Cointegration analysis failed';
        console.error(`Academy cointegration fetch failed: ${message}`);
        setCointError(message);
        setCointData(null);
      } finally {
        if (!cancelled) setCointLoading(false);
      }
    }

    fetchCointegration();

    return () => {
      cancelled = true;
    };
  }, [asset1, asset2, timeframe]);

  // ── Step dispatch ──────────────────────────────────────────────────────

  function renderStepContent() {
    switch (activeStep) {
      case 0:
        return <StepPairSelector />;
      case 1:
        return (
          <Text c="dimmed" ta="center" py="xl">
            Step 2: Price Comparison — coming in T03
          </Text>
        );
      case 2:
        return (
          <Text c="dimmed" ta="center" py="xl">
            Step 3: Correlation vs Cointegration — coming in T04
          </Text>
        );
      default:
        return (
          <Text c="dimmed" ta="center" py="xl">
            Steps 4–6 coming in S04
          </Text>
        );
    }
  }

  return (
    <Container>
      <Stack gap="lg">
        <div>
          <Title order={2}>Academy</Title>
          <Text c="dimmed" size="sm" mt={4}>
            Learn statistical arbitrage step by step — from pair selection to
            trading signals.
          </Text>
        </div>

        <AcademyStepper activeStep={activeStep} onStepClick={setActiveStep} />

        {renderStepContent()}
      </Stack>
    </Container>
  );
}
