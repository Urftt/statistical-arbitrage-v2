---
id: T02
parent: S05
milestone: M001
provides:
  - Deep Dive page with real single-pair analysis, 8 stat cards, and 4 Plotly charts backed by FastAPI data
key_files:
  - frontend/app/(dashboard)/deep-dive/page.tsx
  - frontend/lib/api.ts
key_decisions:
  - Recomputed configurable z-score client-side from the returned spread because `postCointegration()` hardcodes a 60-period z-score in the backend response
  - Extended `fetchOHLCV()` with optional `daysBack` so the price/scatter charts stay aligned with the selected history window
patterns_established:
  - Deep Dive analysis pattern: fetch cointegration + both OHLCV series in parallel, align closes to analysis timestamps, then derive chart-ready series in `useMemo`
  - Plotly subplot pattern: manually theme `xaxis2`/`yaxis2` from `PLOTLY_DARK_TEMPLATE` for dual-axis and stacked-subplot layouts
observability_surfaces:
  - Inline yellow validation alert, inline red API-failure alert, loading skeleton block, success alert, and `console.error` context for Deep Dive fetch failures
duration: 1h 20m
verification_result: passed
completed_at: 2026-03-17
blocker_discovered: false
---

# T02: Build Deep Dive page with stat cards and 4 analysis charts

**Added the real Deep Dive page with live pair analysis, stat cards, and four dark-themed Plotly charts, plus synced OHLCV history fetching for the chart views.**

## What Happened

I replaced the placeholder `frontend/app/(dashboard)/deep-dive/page.tsx` with a full `'use client'` page that reads `asset1`, `asset2`, and `timeframe` from `usePairContext()`, validates the selected pair, and fetches real analysis data on demand.

Implementation details:
- Built the controls panel with days-back input, z-score window input, and Analyze button.
- On Analyze, fetched `postCointegration()` and both `fetchOHLCV()` series in parallel.
- Added alignment logic so the price comparison and scatter/regression charts use closes matched to the exact overlapping timestamps returned by cointegration analysis.
- Rendered all 8 required stat cards with responsive layout and colored left borders.
- Rendered all 4 required chart views:
  - price comparison with manual dual y-axis
  - spread + z-score stacked subplots with threshold lines and entry-zone shading
  - scatter + regression line
  - side-by-side histograms for spread and z-score
- Filtered null z-score warmup values before line/histogram plotting.
- Used `new Date(ts).toISOString()` directly for all API timestamps.
- Added inline observability surfaces: validation alert, error alert, loading skeletons, success alert, and a page-specific `console.error` on fetch failure.

Non-trivial implementation adjustment:
- The backend `postCointegration()` response always returns z-score computed with a fixed 60-period window. To honor the page’s configurable z-score window without changing backend contracts, I recomputed z-score client-side from the returned spread. I also updated `frontend/lib/api.ts` so `fetchOHLCV()` can accept `daysBack`, keeping the price/scatter charts in sync with the selected history length.

I also patched `.gsd/milestones/M001/slices/S05/tasks/T02-PLAN.md` to add the missing `## Observability Impact` section before implementation, per the unit pre-flight instruction.

## Verification

Passed:
- `cd frontend && npm run build`
- Real runtime verification with background servers:
  - API: `uv run python run_api.py`
  - Frontend: `cd frontend && npm run dev`
- Browser verification at `http://localhost:3000/deep-dive`
  - Selected a real pair from the global header and clicked Analyze
  - Confirmed the page rendered:
    - success alert
    - 8 stat cards
    - 4 Plotly charts
  - Explicit browser checks passed for visible sections:
    - `Analysis complete`
    - `Cointegrated?`
    - `Price Comparison`
    - `Spread + Z-Score`
    - `Scatter + Regression`
    - `Distribution Histograms`
  - Explicit browser checks passed for diagnostics:
    - no console errors
    - no failed network requests
  - Confirmed rerun behavior after changing the selected header pair and analyzing again:
    - page badge and success alert updated to `ETH / BTC · 1h`
    - BTC OHLCV request observed in network logs

Slice-level status after this task:
- `cd frontend && npm run build` — passed
- `/deep-dive` runtime verification — passed
- `/scanner` runtime verification from slice plan — not rerun in this task (previous task implemented it; this task focused on Deep Dive)
- cross-page navigation verification — not rerun in this task
- scanner failure-path verification — not rerun in this task

## Diagnostics

Future agents can inspect this task via:
- Inline yellow alert for invalid pair selection.
- Inline red alert for API/data fetch failure.
- Loading skeleton block while the 3 parallel requests are in flight.
- Success alert summarizing the analyzed pair, timeframe, p-value, correlation, and half-life.
- Browser-visible chart titles and stat-card labels that make success/failure easy to verify.
- Browser/network logs: all requests still flow through `frontend/lib/api.ts` `apiFetch()`, and Deep Dive adds a pair/timeframe-specific `console.error` on fetch failure.

## Deviations

- Extended `frontend/lib/api.ts` `fetchOHLCV()` with an optional `daysBack` parameter so the history-window control applies consistently to the price and scatter charts.
- Recomputed z-score client-side from `spread` instead of relying on `CointegrationResponse.zscore`, because the backend response is fixed to a 60-period window and would otherwise ignore the page control.

## Known Issues

- None in the implemented Deep Dive flow.

## Files Created/Modified

- `frontend/app/(dashboard)/deep-dive/page.tsx` — replaced the placeholder with the full Deep Dive analysis page, stat cards, chart builders, loading/error states, and runtime observability.
- `frontend/lib/api.ts` — added optional `daysBack` support to `fetchOHLCV()`.
- `.gsd/milestones/M001/slices/S05/tasks/T02-PLAN.md` — added the missing `Observability Impact` section required by pre-flight.
- `.gsd/KNOWLEDGE.md` — recorded the fixed-60 z-score backend gotcha for future agents.
