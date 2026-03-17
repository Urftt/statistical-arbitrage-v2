'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import { fetchPairs, type PairInfo } from '@/lib/api';

// ---------------------------------------------------------------------------
// Context value type
// ---------------------------------------------------------------------------

export interface PairContextValue {
  /** Selected base currency for asset 1, e.g. "ETH" */
  asset1: string;
  /** Selected base currency for asset 2, e.g. "ETC" */
  asset2: string;
  /** Selected candle timeframe, e.g. "1h" */
  timeframe: string;
  setAsset1: (v: string) => void;
  setAsset2: (v: string) => void;
  setTimeframe: (v: string) => void;
  /** Full pair list from the API */
  pairs: PairInfo[];
  /** Unique sorted base currency names derived from pairs */
  coins: string[];
  /** True while the initial pairs fetch is in-flight */
  loading: boolean;
  /** Descriptive error message if the pairs fetch failed, otherwise null */
  error: string | null;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const PairContext = createContext<PairContextValue | null>(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function PairProvider({ children }: { children: ReactNode }) {
  const [asset1, setAsset1] = useState<string>('');
  const [asset2, setAsset2] = useState<string>('');
  const [timeframe, setTimeframe] = useState<string>('1h');

  const [pairs, setPairs] = useState<PairInfo[]>([]);
  const [coins, setCoins] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch pairs on mount
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetchPairs();
        if (cancelled) return;

        setPairs(res.pairs);

        // Derive unique sorted base currencies
        const uniqueCoins = [...new Set(res.pairs.map((p) => p.base))].sort();
        setCoins(uniqueCoins);

        setError(null);
      } catch (err) {
        if (cancelled) return;
        const message =
          err instanceof Error ? err.message : 'Failed to fetch pairs';
        setError(message);
        // Don't crash — leave pairs/coins empty
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  // Stable setters via useCallback
  const handleSetAsset1 = useCallback((v: string) => setAsset1(v), []);
  const handleSetAsset2 = useCallback((v: string) => setAsset2(v), []);
  const handleSetTimeframe = useCallback((v: string) => setTimeframe(v), []);

  const value: PairContextValue = {
    asset1,
    asset2,
    timeframe,
    setAsset1: handleSetAsset1,
    setAsset2: handleSetAsset2,
    setTimeframe: handleSetTimeframe,
    pairs,
    coins,
    loading,
    error,
  };

  return <PairContext.Provider value={value}>{children}</PairContext.Provider>;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Access the global pair context.
 * Must be used inside a `<PairProvider>`.
 */
export function usePairContext(): PairContextValue {
  const ctx = useContext(PairContext);
  if (!ctx) {
    throw new Error(
      'usePairContext must be used within a <PairProvider>. ' +
        'Wrap your component tree in <PairProvider> (see (dashboard)/layout.tsx).'
    );
  }
  return ctx;
}
