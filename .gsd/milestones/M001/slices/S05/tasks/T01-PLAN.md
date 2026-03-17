---
estimated_steps: 8
estimated_files: 1
---

# T01: Build Scanner page with batch cointegration scan, results table, and p-value chart

**Slice:** S05 — Pair Scanner + Deep Dive Pages
**Milestone:** M001

## Description

Replace the Scanner placeholder page with a fully functional batch cointegration scanner. The page lets users select multiple coins from a MultiSelect, run cointegration analysis on all pair combinations, and view results in a sorted table with a p-value histogram.

This is a port of the Dash `pair_scanner.py` (316 lines) to a React `'use client'` component. All data comes from the existing `postCointegration()` API function in `lib/api.ts` — no new API endpoints needed. The main technical consideration is batch-fetching: for N coins there are N*(N-1)/2 pairs, each requiring a separate API call, so concurrent execution with progress feedback is essential.

**Relevant skill:** `frontend-design` (for Mantine component patterns and dark theme consistency)

## Steps

1. **Replace the placeholder** in `frontend/app/(dashboard)/scanner/page.tsx` with a `'use client'` component that imports `usePairContext`, `postCointegration`, `PlotlyChart`, and necessary Mantine components (`Container`, `Title`, `Text`, `Badge`, `Group`, `Paper`, `SimpleGrid`, `MultiSelect`, `Select`, `NumberInput`, `Button`, `Progress`, `Table`, `Alert`, `Stack`).

2. **Build the controls section:** A `Paper` containing a `SimpleGrid` with:
   - `MultiSelect` for coins — populate `data` from `usePairContext().coins` (these are base currencies like "ETH"). Show coin names as labels, store coin names as values.
   - `Select` for timeframe — options: "15m", "1h", "4h", "1d" (default "1h")
   - `NumberInput` for history days — min 7, max 365, default 90
   - "Run Scan" `Button` with play icon
   - A "Select top 20" subtle button that pre-fills the MultiSelect with common high-cap coins (BTC, ETH, XRP, SOL, ADA, DOGE, DOT, LINK, AVAX, MATIC, UNI, ATOM, LTC, ETC, ALGO, XLM, FIL, NEAR, APT, ARB) — only selecting those that exist in the `coins` list.

3. **Implement the scan logic:** On "Run Scan" click:
   - Validate at least 2 coins selected; show yellow Alert if not.
   - Generate all pair combinations: for N coins → N*(N-1)/2 pairs. Each pair needs `asset1: "COIN1/EUR"` and `asset2: "COIN2/EUR"` format (append "/EUR" to base currency).
   - Fire all `postCointegration({ asset1, asset2, timeframe })` calls using `Promise.allSettled()` for concurrent execution.
   - Track progress: use `useState` for `completedCount` and `totalCount`. Update after each promise settles. Show a Mantine `Progress` bar with percentage and text like "Scanning 3/10 pairs...".
   - **Important:** Don't fire all at once if there are many pairs — use a simple batching approach (e.g., chunks of 5 concurrent requests) to avoid overwhelming the backend. Or just fire all at once with `Promise.allSettled()` — for typical usage (5-10 coins = 10-45 pairs) this is fine.
   - For each settled result, extract: pair name, is_cointegrated, p_value, cointegration_score, hedge_ratio, half_life (show "∞" if null or > 10000), correlation, spread_properties.skewness, spread_properties.kurtosis, and count from timestamps.length.
   - For rejected promises, add a row with "⚠️" for Cointegrated and null values.

4. **Build the results table:** A Mantine `Table` (striped, highlightOnHover, withTableBorder, withColumnBorders) with columns: Pair, Coint?, p-value, Test Stat, Hedge Ratio, Half-life, Correlation, Skew, Kurt, Points. Sort rows: cointegrated first (`✅` before `❌`), then by p-value ascending. Highlight cointegrated rows with a subtle green background (`backgroundColor: "rgba(81, 207, 102, 0.06)"`). Bold the p-value text when < 0.05.

5. **Build the p-value histogram:** Use `PlotlyChart` with a histogram trace of all non-null p-values. Set `nbinsx: 20` (cast trace `as Data` per KNOWLEDGE.md since `nbinsx` isn't in type definitions). Add a vertical dashed red line at x=0.05 using `shapes` in layout (not `add_vline` — that's Python-only). Title: "Distribution of Cointegration p-values". Height: 300.

6. **Add the status alert:** After scan completes, show a Mantine `Alert` with summary: "Scanned X pairs. Found Y cointegrated, Z not cointegrated." Green color if any cointegrated, blue if none.

7. **Handle loading/empty states:** Show a Mantine `Skeleton` or `LoadingOverlay` while scanning. Show helpful text when no scan has been run yet. Disable the "Run Scan" button during scanning.

8. **Verify:** Run `cd frontend && npm run build` — must exit 0. Start both servers and test the scan workflow manually.

## Must-Haves

- [ ] MultiSelect populated with real coin names from PairContext
- [ ] "Run Scan" fires concurrent API calls for all pair combinations
- [ ] Progress feedback (bar or counter) during scanning
- [ ] Results table sorted cointegrated-first, then by p-value
- [ ] Cointegrated rows have green highlight
- [ ] P-value histogram with red dashed threshold line at 0.05
- [ ] Status alert with scan summary
- [ ] Error handling for failed pair analyses (show ⚠️ row)
- [ ] `npm run build` exits 0

## Verification

- `cd frontend && npm run build` — exit 0 (SSR safe, no TypeScript errors)
- Start `uv run python run_api.py` and `cd frontend && npm run dev`
- Navigate to `/scanner`
- Select 4-5 coins (e.g., ETH, ETC, BTC, ADA, XRP)
- Click "Run Scan" — progress bar appears and advances
- Results table appears with correct number of pairs (for 5 coins: 10 pairs)
- At least some rows show ✅ or ❌ with real p-values
- P-value histogram renders below the table
- Status alert shows scan summary

## Inputs

- `frontend/app/(dashboard)/scanner/page.tsx` — current placeholder (to be replaced)
- `frontend/contexts/PairContext.tsx` — provides `coins` (base currencies), `timeframe`
- `frontend/lib/api.ts` — `postCointegration()` function (returns CointegrationResponse)
- `frontend/components/charts/PlotlyChart.tsx` — chart wrapper with dark theme
- `frontend/lib/theme.ts` — `PLOTLY_DARK_TEMPLATE` for manual axis styling if needed
- `src/statistical_arbitrage/app/pages/pair_scanner.py` — Dash original for reference (column definitions, sort logic, p-value chart, top-20 coins list)

## Expected Output

- `frontend/app/(dashboard)/scanner/page.tsx` — fully functional Scanner page (~250-350 lines) with MultiSelect, batch scan, progress bar, sorted results table, p-value histogram, and status alert
