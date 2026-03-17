# S05: Pair Scanner + Deep Dive Pages — Research

**Date:** 2026-03-17

## Summary

S05 ports two existing Dash pages (pair_scanner.py — 316 lines, pair_deep_dive.py — 247 lines) to React pages in the Next.js frontend. Both pages are straightforward data-fetching + display pages that consume the existing FastAPI analysis endpoints (S01) and render using established frontend patterns (S02). The Dash originals are well-structured reference implementations with clear UI, controls, tables, and Plotly charts.

The Scanner page lets users multi-select coins, run a batch cointegration scan across all pairs, and display results in a sorted table with a p-value histogram. The Deep Dive page shows full single-pair analysis (8 summary stat cards, price comparison chart, spread/z-score subplot, scatter plot, distribution histograms) using the globally selected pair from the header.

This is **light-risk work** — all API endpoints exist and are tested (51 tests), all UI patterns (PlotlyChart, PairContext, Mantine components) are established. The main technical consideration is that the Scanner needs to call `POST /api/analysis/cointegration` once per pair combination (N*(N-1)/2 calls for N coins), which means concurrent fetching and progress feedback are important for UX.

## Recommendation

Build both pages as `'use client'` components in the existing `app/(dashboard)/scanner/page.tsx` and `app/(dashboard)/deep-dive/page.tsx`, following the exact patterns from the Academy page (S03/S04). Use `usePairContext()` for global pair state, `postCointegration()` from `lib/api.ts` for analysis, and `PlotlyChart` for all charts.

**Scanner** should fire all pair-combination requests with `Promise.allSettled()` for concurrent execution and show a Mantine Progress bar during scanning. Results go into a Mantine Table with sorting. The p-value histogram uses PlotlyChart.

**Deep Dive** should auto-fetch analysis when the global pair changes (or on an "Analyze" button click), display 8 stat cards in a SimpleGrid, and render 4 Plotly charts (price comparison with dual y-axes, spread + z-score subplots, scatter + regression, distribution histograms).

No new API endpoints are needed — `postCointegration` already returns all data both pages need (spread, zscore, half_life, correlation, spread_properties, hedge_ratio, p_value, etc.).

## Implementation Landscape

### Key Files

- `frontend/app/(dashboard)/scanner/page.tsx` — **Replace placeholder**. New Scanner page: MultiSelect for coins, scan button, progress bar, results table, p-value chart.
- `frontend/app/(dashboard)/deep-dive/page.tsx` — **Replace placeholder**. New Deep Dive page: auto-analysis from global pair, stat cards, 4 charts.
- `frontend/lib/api.ts` — **No changes needed**. `postCointegration()` already exists and returns everything both pages consume. `fetchPairs()` already exists for the coin list. (Note: if the planner decides to add a batch endpoint helper, it goes here.)
- `frontend/contexts/PairContext.tsx` — **Read-only**. Provides `asset1`, `asset2`, `timeframe`, `coins`, `pairs` — consumed by both pages.
- `frontend/components/charts/PlotlyChart.tsx` — **Read-only**. Used for all charts. Remember: for multi-axis charts (subplots), manually apply dark theme to `xaxis2`/`yaxis2` (see KNOWLEDGE.md).
- `frontend/lib/theme.ts` — **Read-only**. `PLOTLY_DARK_TEMPLATE` for manual axis styling on subplot axes.
- `src/statistical_arbitrage/app/pages/pair_scanner.py` — **Reference only** (Dash original). Defines the exact columns, layout, and logic to port.
- `src/statistical_arbitrage/app/pages/pair_deep_dive.py` — **Reference only** (Dash original). Defines the 8 stat cards, 4 charts, and layout to port.

### Build Order

1. **Scanner page first** — it's the more complex of the two (multi-select, batch API calls, progress state, results table, sorting). Getting this right proves the batch-fetch pattern.
2. **Deep Dive page second** — simpler single-pair analysis, consumes one `postCointegration` call, renders stat cards + charts. Most of the chart work (dual y-axis, subplots) was already proven in Academy steps.
3. **Verify both pages together** — ensure global pair changes propagate, navigation between Scanner/Deep Dive works, and `npm run build` still passes.

### Verification Approach

1. `cd frontend && npm run build` — must exit 0 (SSR safety, TypeScript correctness)
2. Start both servers (`python run_api.py` + `cd frontend && npm run dev`)
3. Navigate to `/scanner`:
   - Select 4-5 coins from MultiSelect
   - Click "Run Scan" — verify progress feedback appears
   - Verify results table shows all N*(N-1)/2 pair combinations
   - Verify cointegrated pairs are highlighted and sorted to top
   - Verify p-value histogram renders
4. Navigate to `/deep-dive`:
   - Select a pair in the global header (e.g., ETH + ETC + 1h)
   - Verify 8 stat cards render with real values
   - Verify 4 charts render with dark theme
   - Change global pair — verify all charts and cards update
5. Navigate between Scanner ↔ Deep Dive ↔ Academy — no broken states

## Constraints

- **No batch cointegration endpoint exists** — the API has only single-pair `POST /api/analysis/cointegration`. The Scanner must loop client-side. For 5 coins = 10 pairs, this means 10 sequential or concurrent API calls. This is acceptable for the expected usage (~5-10 coins max).
- **PlotlyChart only auto-merges xaxis/yaxis** — any multi-axis layouts (dual y-axis price chart, spread/zscore subplots) need manual dark theme application to xaxis2/yaxis2 (documented in KNOWLEDGE.md). Use the `PLOTLY_DARK_TEMPLATE.layout.xaxis` styles directly.
- **Timestamps are epoch-ms** — use `new Date(ts).toISOString()` (NOT `* 1000`). Already documented in KNOWLEDGE.md.
- **Z-score arrays contain nulls** — first `window-1` values are `null`. Charts must filter/skip these.
- **PairContext `coins` is base currency only (e.g., "ETH")** — but the API expects full symbols like `"ETH/EUR"`. The Scanner's MultiSelect needs to show coin names but construct `"COIN/EUR"` for API calls. The `pairs` array from PairContext has full `PairInfo` objects with `symbol` and `base` fields.

## Common Pitfalls

- **Scanner pair generation** — the Dash original uses `data[sym1]`/`data[sym2]` with direct PairAnalysis. The React version must construct API requests with `asset1: "ETH/EUR"` and `asset2: "ETC/EUR"` (slash format in JSON body, per S01 Forward Intelligence). Don't use dash format in POST bodies.
- **Plotly subplot layout in TypeScript** — `make_subplots` doesn't exist in react-plotly.js. Use manual domain positioning or `Plotly.Layout` with `xaxis`/`xaxis2` + `yaxis`/`yaxis2` and `domain` arrays (established pattern from Academy, see D011).
- **Table sorting state** — Mantine Table doesn't have built-in sorting. Sort the results array in state before rendering. The Dash original sorts by cointegrated-first then p-value ascending — replicate this.
- **Progress feedback for batch scan** — without progress, scanning 10+ pairs feels broken. Track completed count in state and show a Mantine Progress bar or text counter.
