# S05: Pair Scanner + Deep Dive Pages

**Goal:** Scanner page runs batch cointegration across selected coins and displays results in a sorted table with p-value histogram; Deep Dive page shows full single-pair analysis with stat cards and 4 charts — all using real data from the FastAPI backend.
**Demo:** Navigate to `/scanner`, select 4-5 coins, click "Run Scan" — see progress bar, then results table sorted cointegrated-first with p-value histogram. Navigate to `/deep-dive` — see 8 stat cards and 4 charts for the globally selected pair.

## Must-Haves

- Scanner: MultiSelect populated with coins from PairContext, "Run Scan" button, progress feedback during batch API calls
- Scanner: Results table showing all N*(N-1)/2 pair combinations, sorted cointegrated-first then by p-value, cointegrated rows highlighted green
- Scanner: P-value distribution histogram with p=0.05 threshold line
- Scanner: Status alert showing scan summary (X pairs scanned, Y cointegrated)
- Deep Dive: Auto-analysis triggered by "Analyze" button using globally selected pair
- Deep Dive: 8 stat cards (cointegrated?, p-value, half-life, correlation, hedge ratio, skewness, kurtosis, datapoints)
- Deep Dive: 4 charts — price comparison (dual y-axis), spread + z-score (stacked subplots), scatter + regression line, distribution histograms (spread + z-score)
- Both pages: dark theme consistent, PlotlyChart wrapper used, `npm run build` passes

## Proof Level

- This slice proves: integration (frontend pages consuming real API data and rendering correctly)
- Real runtime required: yes
- Human/UAT required: no (build verification + visual spot-check)

## Verification

- `cd frontend && npm run build` — must exit 0 (SSR safety, TypeScript correctness)
- Start both servers (`uv run python run_api.py` + `cd frontend && npm run dev`), navigate to `/scanner`:
  - Select 4+ coins from MultiSelect
  - Click "Run Scan" — progress feedback appears
  - Results table shows correct number of pair combinations
  - Cointegrated pairs are highlighted and sorted to top
  - P-value histogram renders with threshold line
- Navigate to `/deep-dive`:
  - Select a pair in the global header
  - Click "Analyze" — 8 stat cards render with real values
  - 4 charts render with dark theme
- Navigate between Scanner ↔ Deep Dive ↔ Academy — no broken states
- **Failure path**: Select 2 coins, stop the API server, click "Run Scan" — progress bar completes, results table shows ⚠️ rows for all pairs, no crash

## Observability / Diagnostics

- **Scanner batch errors**: Failed pair analyses render a ⚠️ row in the results table with null metric values — visually inspectable without opening console. The browser console logs the underlying API error via `console.error` in `lib/api.ts` `apiFetch()`.
- **Progress surface**: Scanner progress bar and "Scanning X/Y pairs…" text provide real-time feedback during batch execution. Completed count is tracked in React state.
- **Status alert**: Post-scan summary alert shows cointegrated/not counts — serves as a quick health check for the entire batch.
- **Deep Dive API errors**: Shown inline via Mantine Alert with the error message text, not silent failures.
- **Network inspection**: All API calls go through `lib/api.ts` `apiFetch()` which logs `console.error` on fetch failure or non-OK status, including URL and status code.
- **Redaction**: No secrets or API keys are used on these pages (public data only). No redaction constraints needed.

## Integration Closure

- Upstream surfaces consumed: `postCointegration()` and `fetchPairs()` from `lib/api.ts`, `usePairContext()` from `contexts/PairContext.tsx`, `PlotlyChart` from `components/charts/PlotlyChart.tsx`, `PLOTLY_DARK_TEMPLATE` from `lib/theme.ts`
- New wiring introduced in this slice: two page components replacing placeholders — no new routing or layout changes needed
- What remains before the milestone is truly usable end-to-end: S06 (Glossary + Polish + Integration Test)

## Tasks

- [x] **T01: Build Scanner page with batch cointegration scan, results table, and p-value chart** `est:45m`
  - Why: The Scanner page is the primary discovery tool — users select coins, run a batch scan, and find cointegrated pairs. It's the more complex of the two pages due to batch API calls with progress feedback and a sorted results table.
  - Files: `frontend/app/(dashboard)/scanner/page.tsx`
  - Do: Replace placeholder with `'use client'` component. MultiSelect populated from `usePairContext().coins` (show base currency names, construct `"COIN/EUR"` for API calls). "Run Scan" button fires `postCointegration()` for all N*(N-1)/2 pair combinations using `Promise.allSettled()`. Track completion count in state → Mantine Progress bar. Build results array with same columns as Dash original (Pair, Cointegrated, p-value, Test Stat, Hedge Ratio, Half-life, Correlation, Skew, Kurt, Datapoints). Sort results cointegrated-first then by p-value ascending. Render Mantine Table with green-highlighted rows for cointegrated pairs. P-value histogram via PlotlyChart with dashed red line at x=0.05. Status alert showing scan summary. Handle errors gracefully (pairs that fail analysis show "⚠️" in table). Include timeframe select and days-back NumberInput.
  - Verify: `cd frontend && npm run build` passes; runtime: select 4+ coins, run scan, see progress → results table → p-value chart
  - Done when: Scanner page renders a sorted results table with cointegrated pairs highlighted and a p-value histogram from real API data; `npm run build` exits 0

- [x] **T02: Build Deep Dive page with stat cards and 4 analysis charts** `est:40m`
  - Why: The Deep Dive page is the detailed single-pair analysis view — it shows the full cointegration picture with summary stats and 4 complementary charts. It consumes the same `postCointegration` endpoint as the Scanner but presents results visually.
  - Files: `frontend/app/(dashboard)/deep-dive/page.tsx`
  - Do: Replace placeholder with `'use client'` component. Read `asset1`, `asset2`, `timeframe` from `usePairContext()`. "Analyze" button triggers `postCointegration()` for the selected pair. Display 8 stat cards in Mantine SimpleGrid (2 cols mobile, 4 cols tablet, 8 cols desktop) with colored left border: cointegrated (green/red), p-value, half-life, correlation, hedge ratio, skewness, kurtosis, datapoints. Four charts using PlotlyChart: (1) Price comparison with dual y-axis using manual xaxis/yaxis + xaxis2/yaxis2 domain positioning — must manually apply dark theme to secondary axes per KNOWLEDGE.md. (2) Spread + Z-score stacked subplots with horizontal threshold lines at ±2.0 (dash), ±0.5 (dot), 0 (solid), plus green background rectangles for entry zones. (3) Scatter plot with regression line (hedge_ratio * x + intercept). (4) Side-by-side histograms for spread and z-score distributions. Filter null values from z-score arrays before charting. Use `new Date(ts).toISOString()` for timestamps (NOT `* 1000`).
  - Verify: `cd frontend && npm run build` passes; runtime: select pair in header, click Analyze, see 8 stat cards + 4 charts with dark theme
  - Done when: Deep Dive page renders 8 stat cards and 4 analysis charts with real data from the API; all charts use dark theme; `npm run build` exits 0

## Files Likely Touched

- `frontend/app/(dashboard)/scanner/page.tsx`
- `frontend/app/(dashboard)/deep-dive/page.tsx`
