'use client';

import { useEffect, useRef, useState } from 'react';
import { Container, Stack, Text, Title } from '@mantine/core';
import { AcademyStepper } from '@/components/academy/AcademyStepper';
import { StepPairSelector } from '@/components/academy/StepPairSelector';
import { StepPriceComparison } from '@/components/academy/StepPriceComparison';
import { StepCorrelationVsCointegration } from '@/components/academy/StepCorrelationVsCointegration';
import { StepCointegrationTest } from '@/components/academy/StepCointegrationTest';
import { StepSpread } from '@/components/academy/StepSpread';
import { StepZScoreSignals } from '@/components/academy/StepZScoreSignals';
import { usePairContext } from '@/contexts/PairContext';
import {
  fetchOHLCV,
  postCointegration,
  type CointegrationResponse,
  type OHLCVResponse,
} from '@/lib/api';

// ---------------------------------------------------------------------------
// Cointegration cache type
// ---------------------------------------------------------------------------

interface CointCache {
  key: string;
  data: CointegrationResponse;
}

interface OhlcvCache {
  key: string;
  data1: OHLCVResponse;
  data2: OHLCVResponse;
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

  // OHLCV data — fetched in parallel with cointegration
  const ohlcvCache = useRef<OhlcvCache | null>(null);
  const [ohlcv1, setOhlcv1] = useState<OHLCVResponse | null>(null);
  const [ohlcv2, setOhlcv2] = useState<OHLCVResponse | null>(null);

  // Fetch cointegration + OHLCV data when pair/timeframe changes
  useEffect(() => {
    if (!asset1 || !asset2) {
      setCointData(null);
      setCointError(null);
      setOhlcv1(null);
      setOhlcv2(null);
      return;
    }

    const cacheKey = `${asset1}-${asset2}-${timeframe}`;

    // Use cached results if key matches
    if (
      cointCache.current?.key === cacheKey &&
      ohlcvCache.current?.key === cacheKey
    ) {
      setCointData(cointCache.current.data);
      setOhlcv1(ohlcvCache.current.data1);
      setOhlcv2(ohlcvCache.current.data2);
      setCointError(null);
      return;
    }

    let cancelled = false;

    async function fetchAll() {
      setCointLoading(true);
      setCointError(null);

      try {
        const [cointResult, ohlcvResult1, ohlcvResult2] = await Promise.all([
          postCointegration({
            asset1: `${asset1}/EUR`,
            asset2: `${asset2}/EUR`,
            timeframe,
          }),
          fetchOHLCV(`${asset1}/EUR`, timeframe),
          fetchOHLCV(`${asset2}/EUR`, timeframe),
        ]);

        if (cancelled) return;

        cointCache.current = { key: cacheKey, data: cointResult };
        ohlcvCache.current = { key: cacheKey, data1: ohlcvResult1, data2: ohlcvResult2 };
        setCointData(cointResult);
        setOhlcv1(ohlcvResult1);
        setOhlcv2(ohlcvResult2);
      } catch (err) {
        if (cancelled) return;
        const message =
          err instanceof Error ? err.message : 'Academy data fetch failed';
        console.error(`Academy fetch failed: ${message}`);
        setCointError(message);
        setCointData(null);
        setOhlcv1(null);
        setOhlcv2(null);
      } finally {
        if (!cancelled) setCointLoading(false);
      }
    }

    fetchAll();

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
          <StepPriceComparison
            cointegrationData={cointData}
            ohlcv1={ohlcv1}
            ohlcv2={ohlcv2}
            loading={cointLoading}
            asset1={asset1}
            asset2={asset2}
          />
        );
      case 2:
        return (
          <StepCorrelationVsCointegration
            cointegrationData={cointData}
            loading={cointLoading}
            asset1={asset1}
            asset2={asset2}
          />
        );
      case 3:
        return (
          <StepCointegrationTest
            cointegrationData={cointData}
            ohlcv1={ohlcv1}
            ohlcv2={ohlcv2}
            loading={cointLoading}
            asset1={asset1}
            asset2={asset2}
          />
        );
      case 4:
        return (
          <StepSpread
            cointegrationData={cointData}
            loading={cointLoading}
            asset1={asset1}
            asset2={asset2}
          />
        );
      case 5:
        return (
          <StepZScoreSignals
            cointegrationData={cointData}
            loading={cointLoading}
            asset1={asset1}
            asset2={asset2}
          />
        );
      default:
        return null;
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
