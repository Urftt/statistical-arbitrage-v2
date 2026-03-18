---
id: S02
parent: M002
milestone: M002
provides:
  - 7 FastAPI POST research endpoints (rolling-stability, oos-validation, timeframe-comparison, spread-method, zscore-threshold, tx-cost, coint-method) with typed Pydantic request/response schemas on the shared ResearchTakeawayPayload envelope
  - 7 React panel components with full loading/error/empty/result states, takeaway alerts, stat cards, PlotlyChart visualizations, and data tables
  - 8-tab Research Hub page with lazy-loaded panels via next/dynamic and Mantine Tabs
  - Z-score threshold and transaction cost panels with recommendation CTA deep-linking to /backtest via buildBacktestSearchParams
  - E2E test suite for research hub tab rendering and module switching (4 test cases)
  - Contract tests for all 8 research endpoints (7 new + lookback regression guard)
requires:
  - slice: S01
    provides: Shared ResearchTakeawayPayload envelope, BacktestRequest schema, recommended_backtest_params contract, _load_pair_data helper, PlotlyChart SSR-safe wrapper, buildBacktestSearchParams URL helper, DARK_AXIS_STYLE
affects:
  - S04
key_files:
  - api/schemas.py
  - api/routers/research.py
  - tests/test_research_api.py
  - frontend/lib/api.ts
  - frontend/components/research/RollingStabilityPanel.tsx
  - frontend/components/research/OOSValidationPanel.tsx
  - frontend/components/research/TimeframePanel.tsx
  - frontend/components/research/SpreadMethodPanel.tsx
  - frontend/components/research/ZScoreThresholdPanel.tsx
  - frontend/components/research/TxCostPanel.tsx
  - frontend/components/research/CointMethodPanel.tsx
  - frontend/app/(dashboard)/research/page.tsx
  - frontend/e2e/research-hub.spec.ts
key_decisions:
  - D021 Z-score pre-computed via Polars rolling_mean/rolling_std in shared _compute_zscore helper for threshold and tx-cost endpoints
  - D022 Research Hub uses Mantine Tabs with keepMounted={false} and next/dynamic lazy loading — only active panel mounts
  - SpreadMethodResult.spread numpy array excluded from API payload — only scalar diagnostics serialized
  - Timeframe comparison endpoint uses closure-based data loader that returns None on missing cache instead of raising
  - Each panel uses distinct accent color for visual differentiation between diagnostic and handoff modules
patterns_established:
  - All 8 research endpoints follow the same envelope: module identifier, asset pair metadata, typed results list, takeaway (text + severity), optional recommended_backtest_params
  - Diagnostic modules (rolling-stability, oos, timeframe, spread-method, coint-method) return recommended_backtest_params=None; handoff modules (lookback, zscore-threshold, tx-cost) return valid BacktestRequest
  - All 8 React panels follow identical structure: header card with controls → error alert → loading skeleton → empty state → result state (takeaway → stat cards → PlotlyChart → data table)
  - RESEARCH_MODULES constant array in page.tsx is the single registry for adding future research modules
  - numpy_to_python() used on all result payloads to ensure JSON-safe serialization
observability_surfaces:
  - Each endpoint logs failures via logger.exception() before returning structured HTTP errors (404/422/500)
  - Each API response includes module identifier for request tracing
  - GET /openapi.json exposes all 8 research endpoint schemas
  - data-research-tab and data-research-module DOM attributes enable E2E inspection
  - Each panel logs fetch failures to console.error with module name; red Alert renders errors inline
drill_down_paths:
  - .gsd/milestones/M002/slices/S02/tasks/T01-SUMMARY.md
  - .gsd/milestones/M002/slices/S02/tasks/T02-SUMMARY.md
duration: ~1h
verification_result: passed
completed_at: 2026-03-18
---

# S02: Complete the 8-module Research Hub on the shared contract

**All 8 research modules run from the React Research Hub against FastAPI endpoints with typed contracts, structured takeaway banners, and backtest parameter handoff for z-score threshold and transaction cost modules**

## What Happened

This slice extended the S01 single-module pattern (lookback sweep) across all 7 remaining research analysis functions, closing the full breadth of R008's Research Hub.

**T01 — Backend (7 endpoints + contract tests):** Added 7 Pydantic request/response model sets to `api/schemas.py` and 7 POST handlers to `api/routers/research.py`, all following the `ResearchTakeawayPayload` envelope pattern established in S01. Key serialization challenges were solved: rolling cointegration DataFrame output serialized via `.to_dicts()`, timeframe comparison uses a closure that returns `None` on missing cache, spread method omits the numpy `spread` array (only scalar diagnostics). Z-score threshold and tx-cost endpoints pre-compute z-score via a shared `_compute_zscore()` Polars helper and return fully valid `BacktestRequest` in `recommended_backtest_params`. All other modules return `null`. Eight contract tests (7 new + 1 lookback guard) verify 200 status and envelope structure on real cached data.

**T02 — Frontend (7 panels + module picker + E2E):** Added 7 TypeScript interface sets and `postXxx()` fetch functions to `api.ts`, then built 7 panel components following the `LookbackSweepPanel` pattern. Each panel renders loading/error/empty/result states with takeaway alerts, stat cards, PlotlyChart visualizations, and data tables. Z-score threshold and tx-cost panels include a recommendation CTA that deep-links to `/backtest` via `buildBacktestSearchParams`. The research page was refactored from a single-panel layout into a Mantine `Tabs` module picker with 8 lazy-loaded panels via `next/dynamic`. A 4-case E2E test covers tab rendering and module switching.

## Verification

All slice-level gates passed:

- ✅ `uv run pytest tests/test_research_api.py -q` — 8/8 passed (all endpoints return correct envelope)
- ✅ `uv run pytest tests/ -q` — 118/118 passed (no regressions)
- ✅ `cd frontend && npm run build` — no TypeScript errors, no SSR failures
- ✅ `cd frontend && npm run test:e2e` — 19/19 passed (4 new research hub tests + 15 existing)

Observability confirmed:
- All endpoints log failures via `logger.exception()` before returning structured HTTP errors
- OpenAPI at `/openapi.json` exposes all 8 research endpoint definitions
- DOM attributes `data-research-tab` and `data-research-module` enable E2E testability

## Requirements Advanced

- **R008** — All 8 research modules now have FastAPI endpoints, React panels, takeaway banners, and structured results running against cached data. Validated.
- **R015** — All 8 research modules expose assumptions (sample size, date range, fee level), confidence qualifiers (takeaway severity), and limitations (module-specific caveats) through the shared envelope. The transparency contract now covers the full research surface.
- **R022** — Research evidence visibility extended from 1 module (S01) to all 8: every module shows the data behind its findings via stat cards, charts, and tables alongside the takeaway recommendation. Still needs S03 (optimization transparency) for full validation.

## Requirements Validated

- **R008** — All 8 research modules run from the React frontend against FastAPI endpoints, return structured results from cached parquet data, and render takeaway banners. Z-score threshold and tx-cost modules hand off recommended parameters to the backtester. Validated by 8 contract tests, 4 E2E tests, and frontend build gate.

## New Requirements Surfaced

- none

## Requirements Invalidated or Re-scoped

- none

## Deviations

None — both tasks executed as planned.

## Known Limitations

- Live localhost visual verification (opening /research, running a non-lookback module on a cached pair, visually confirming takeaway banner) is deferred to S04 final UAT.
- The 8 research panels share a structural pattern but each has module-specific chart types and stat cards — if the envelope contract changes, all 8 must be updated.
- `PlotlyChart` wrapper only merges dark theme into `xaxis`/`yaxis`; panels with multi-axis layouts manually copy `DARK_AXIS_STYLE` to secondary axes.

## Follow-ups

- S04 should exercise all 8 tabs with a real cached pair in live localhost UAT, including running at least one diagnostic module and one handoff module end-to-end.
- The z-score threshold recommendation CTA picks the max-trades combo; S03 grid search may establish a more nuanced selection heuristic that could supersede this.

## Files Created/Modified

- `api/schemas.py` — Added 7 request/response/result-payload Pydantic model sets
- `api/routers/research.py` — Added 7 POST endpoint handlers + shared `_compute_zscore()` helper
- `tests/test_research_api.py` — New file: 8 contract tests for all research endpoints
- `frontend/lib/api.ts` — Added 7 TypeScript interface sets + 7 postXxx() fetch functions
- `frontend/components/research/RollingStabilityPanel.tsx` — New panel component (line chart + stat cards)
- `frontend/components/research/OOSValidationPanel.tsx` — New panel component (grouped bar chart)
- `frontend/components/research/TimeframePanel.tsx` — New panel component (bar chart by timeframe)
- `frontend/components/research/SpreadMethodPanel.tsx` — New panel component (ADF p-value comparison)
- `frontend/components/research/ZScoreThresholdPanel.tsx` — New panel component with recommendation CTA
- `frontend/components/research/TxCostPanel.tsx` — New panel component with recommendation CTA
- `frontend/components/research/CointMethodPanel.tsx` — New panel component (method comparison)
- `frontend/app/(dashboard)/research/page.tsx` — Refactored to 8-tab module picker with lazy loading
- `frontend/e2e/research-hub.spec.ts` — New E2E test with 4 test cases

## Forward Intelligence

### What the next slice should know
- The 8 research endpoints all follow the same `ResearchTakeawayPayload` envelope. S03's grid search and walk-forward endpoints should adopt the same pattern (module identifier, takeaway, recommended_backtest_params) to keep the contract consistent for S04 integration.
- The `RESEARCH_MODULES` constant in `research/page.tsx` is the single registry for tab definitions. Adding optimization or walk-forward tabs is a matter of appending to that array with a lazy-loaded panel component.
- `buildBacktestSearchParams()` in `frontend/lib/api.ts` is the canonical way to create a deep-link from any research surface to `/backtest`. S03 should use the same helper for optimization recommendations.

### What's fragile
- The `_compute_zscore()` helper in `research.py` re-implements rolling z-score computation in Polars rather than reusing PairAnalysis. If the z-score formula changes, both paths must be updated. This matters for S03 if grid search iterates over z-score parameters.
- The timeframe comparison endpoint's closure reads parquet files for each timeframe directly. If the cache layout changes, this closure silently returns `None` (by design) — which shows as "no data" in the UI rather than an error.

### Authoritative diagnostics
- `uv run pytest tests/test_research_api.py -v` — the 8 contract tests are the fastest proof that all endpoints return correctly shaped responses on real cached data
- `cd frontend && npm run build` — the definitive TypeScript/SSR gate; catches any Plotly SSR issues or type errors
- `cd frontend && npx playwright test e2e/research-hub.spec.ts` — confirms all 8 tabs render and switch correctly

### What assumptions changed
- No assumptions changed. The S01 envelope contract (`ResearchTakeawayPayload`, `BacktestRequest`) was consumed as-is by all 7 new endpoints without modification.
