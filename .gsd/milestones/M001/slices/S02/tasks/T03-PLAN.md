---
estimated_steps: 5
estimated_files: 5
---

# T03: Wire global pair context, API client, and header pair selectors

**Slice:** S02 — Next.js App Shell + Navigation
**Milestone:** M001

## Description

Create the React context for global pair/timeframe state, the typed API client for FastAPI communication, and wire the header pair selectors to real data from `GET /api/pairs`. This closes requirement R006 (persistent pair selector propagating to all pages).

The API response from `GET /api/pairs` returns `{ pairs: PairInfo[] }` where each `PairInfo` has: `symbol` (e.g. "ETH/EUR"), `base` (e.g. "ETH"), `quote` (e.g. "EUR"), `timeframe` (e.g. "1h"), `candles`, `start`, `end`, `file_size_mb`. Multiple entries may exist per coin (one per timeframe). The selectors should show unique base currency names extracted from the pairs list.

## Steps

1. **Create `frontend/lib/api.ts`** — typed API client:
   - Define TypeScript interfaces matching the FastAPI schemas:
     ```typescript
     interface PairInfo {
       symbol: string;   // e.g. "ETH/EUR"
       base: string;     // e.g. "ETH"
       quote: string;    // e.g. "EUR"
       timeframe: string;
       candles: number;
       start: string;
       end: string;
       file_size_mb: number;
     }
     
     interface PairsListResponse { pairs: PairInfo[]; }
     
     interface OHLCVResponse {
       symbol: string; timeframe: string; count: number;
       timestamps: number[]; open: number[]; high: number[];
       low: number[]; close: number[]; volume: number[];
     }
     
     interface CointegrationResponse {
       cointegration_score: number; p_value: number;
       is_cointegrated: boolean; hedge_ratio: number;
       spread: (number | null)[]; zscore: (number | null)[];
       half_life: number | null; correlation: number;
       timestamps: number[];
       // ... other fields as needed
     }
     ```
   - `API_BASE_URL` from `process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'`
   - Async fetch functions with error handling:
     - `fetchPairs(): Promise<PairsListResponse>` — GET `/api/pairs`
     - `fetchOHLCV(symbol: string, timeframe: string): Promise<OHLCVResponse>` — GET `/api/pairs/{symbol}/ohlcv?timeframe={tf}` (symbol uses dash format: ETH/EUR → ETH-EUR)
     - `postCointegration(req: { asset1: string; asset2: string; timeframe: string; days_back?: number }): Promise<CointegrationResponse>` — POST `/api/analysis/cointegration`
   - Each function: construct URL, fetch with appropriate method/headers, check `response.ok`, throw descriptive error on failure, return typed JSON
   - Export all interfaces and functions

2. **Create `frontend/contexts/PairContext.tsx`** — `'use client'` React context:
   - Context value type:
     ```typescript
     interface PairContextValue {
       asset1: string;      // base currency, e.g. "ETH"
       asset2: string;      // base currency, e.g. "ETC"
       timeframe: string;   // e.g. "1h"
       setAsset1: (v: string) => void;
       setAsset2: (v: string) => void;
       setTimeframe: (v: string) => void;
       pairs: PairInfo[];   // all pairs from API
       coins: string[];     // unique base currencies derived from pairs
       loading: boolean;
       error: string | null;
     }
     ```
   - `PairProvider` component wraps children, holds state for asset1, asset2, timeframe
   - On mount: fetch pairs from `fetchPairs()`. Derive unique coin names: `[...new Set(pairs.map(p => p.base))].sort()`. Store in state.
   - Default timeframe: "1h"
   - Handle loading and error states (set error message if fetch fails, but don't crash)
   - Export `usePairContext()` hook with a guard: throws if used outside provider
   - Export `PairProvider` component

3. **Wrap dashboard layout in `PairProvider`:**
   - Edit `frontend/app/(dashboard)/layout.tsx`
   - Import `PairProvider` from `@/contexts/PairContext`
   - Wrap `<AppShell>` (or its children) in `<PairProvider>` so all dashboard pages have access

4. **Wire `Header.tsx` to PairContext:**
   - Import `usePairContext` in Header
   - Replace the placeholder Select components with wired versions:
     - Asset 1 Select: `data` from `coins`, `value` from `asset1`, `onChange` calls `setAsset1`
     - Asset 2 Select: same but for asset2
     - Timeframe Select: `data` as `["15m", "1h", "4h", "1d"]`, `value` from `timeframe`, `onChange` calls `setTimeframe`
   - While pairs are loading, show disabled selects. If error, show a subtle error indicator (red border or tooltip).

5. **Create `frontend/.env.local`:**
   ```
   NEXT_PUBLIC_API_URL=http://localhost:8000
   ```

## Must-Haves

- [ ] `lib/api.ts` exports typed fetch functions for pairs, OHLCV, and cointegration endpoints
- [ ] `PairContext` provides asset1, asset2, timeframe, coins list, loading, and error state
- [ ] Dashboard layout wraps pages in `PairProvider`
- [ ] Header pair selects populate with real coin names from `GET /api/pairs` (when API is running)
- [ ] Selecting a coin in header updates context state
- [ ] Context state persists across page navigation (sidebar clicks don't reset selections)
- [ ] Graceful handling when API is unreachable (error state, not crash)
- [ ] `npm run build` exits 0

## Verification

- `cd /Users/luckleineschaars/repos/statistical-arbitrage-v2/frontend && npm run build` exits with code 0
- With FastAPI running (`cd /Users/luckleineschaars/repos/statistical-arbitrage-v2 && uv run uvicorn api.main:app --port 8000`): header selects show real coin names (ETH, BTC, etc.)
- Selecting "ETH" in asset1, "ETC" in asset2 → navigating to another page → selects still show ETH, ETC (context persists)
- Without FastAPI running: selects are empty but app doesn't crash, no unhandled errors in console

## Observability Impact

- Signals added: console.error on API fetch failure with URL and status
- How a future agent inspects this: browser dev tools Network tab shows `/api/pairs` request; React DevTools shows PairContext value
- Failure state exposed: `error` field in PairContext becomes non-null with descriptive message

## Inputs

- `frontend/components/layout/Header.tsx` from T02 (placeholder selects to be wired)
- `frontend/app/(dashboard)/layout.tsx` from T02 (needs PairProvider wrapping)
- API schema knowledge: `GET /api/pairs` returns `{ pairs: [{ symbol, base, quote, timeframe, candles, start, end, file_size_mb }] }`
- API endpoint: `http://localhost:8000/api/pairs` (from S01, CORS configured for localhost:3000)

## Expected Output

- `frontend/lib/api.ts` — typed API client with fetchPairs, fetchOHLCV, postCointegration
- `frontend/contexts/PairContext.tsx` — React context provider with pair/timeframe state
- `frontend/components/layout/Header.tsx` — updated to use PairContext for live selects
- `frontend/app/(dashboard)/layout.tsx` — updated to wrap in PairProvider
- `frontend/.env.local` — API base URL configuration
