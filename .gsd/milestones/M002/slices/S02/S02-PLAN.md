# S02: Complete the 8-module Research Hub on the shared contract

**Goal:** All 8 research modules run from the React Research Hub against FastAPI endpoints, render structured results with takeaway banners, and can hand their selected or recommended parameters to the backtester.
**Demo:** Open `/research`, switch between all 8 module tabs, run at least one non-lookback module on a cached pair, see the takeaway banner, and (for z-score threshold and transaction cost modules) click the recommendation CTA to deep-link into `/backtest`.

## Must-Haves

- All 7 remaining research analysis functions from `analysis/research.py` are exposed as FastAPI `POST` endpoints under `/api/research/` with typed Pydantic request/response models
- Every response uses the shared `ResearchTakeawayPayload` envelope and includes `module`, `asset1`, `asset2`, `timeframe`, `days_back`, `observations`, `results`, `takeaway`, and `recommended_backtest_params` (null for diagnostic-only modules)
- Z-score threshold and transaction cost modules return a fully valid `BacktestRequest` in `recommended_backtest_params` (per D019)
- 7 new React panel components render results, takeaway alerts, stat cards, and charts via the `PlotlyChart` SSR-safe wrapper
- The Research Hub page (`/research`) uses a module-picker UI (tabs or segmented control) to switch between all 8 panels
- `rolling_cointegration()` DataFrame output is correctly serialized (`.to_dicts()`) — not passed as raw Polars
- `compare_timeframes()` endpoint provides a closure that returns `None` on missing cache instead of raising
- `SpreadMethodResult.spread` (numpy array) is omitted from the API payload — only scalar diagnostics are serialized
- API contract tests verify all 7 new endpoints return 200 with correct structure on real cached data

## Proof Level

- This slice proves: contract + integration
- Real runtime required: yes (cached parquet data, localhost API + frontend)
- Human/UAT required: yes (visual inspection of all 8 module tabs rendering results)

## Verification

- `uv run pytest tests/test_research_api.py -q` — all new API contract tests pass (7 endpoint tests + envelope structure checks)
- `uv run pytest tests/ -q` — all existing tests still pass (no regressions)
- `cd frontend && npm run build` — no TypeScript errors, no SSR failures
- `cd frontend && REUSE_SERVERS=1 npm run test:e2e` — existing smoke tests pass + new research hub E2E test passes
- Live localhost: open `/research`, switch to each of the 8 module tabs, run at least one non-lookback module, confirm takeaway banner renders

## Observability / Diagnostics

- Runtime signals: Each endpoint logs failures via `logger.exception()` before returning structured HTTP errors
- Inspection surfaces: `POST /api/research/{module}` endpoints individually testable via curl/httpie; each returns `module` identifier for tracing
- Failure visibility: 404 on missing cache, 422 on insufficient data, 500 with logged traceback on analysis failure — consistent with S01 lookback pattern
- Redaction constraints: none (no secrets in research data)

## Integration Closure

- Upstream surfaces consumed: S01 shared result envelope (`ResearchTakeawayPayload`, `BacktestRequest`, `recommended_backtest_params`), S01 data loading helpers (`_load_pair_data`, `_get_cache_mgr`), S01 `PlotlyChart` wrapper and dark theme, S01 `buildBacktestSearchParams` URL helper
- New wiring introduced in this slice: 7 new `/api/research/*` routes registered on the existing `research` router, Research Hub page refactored from single-panel to multi-module tab picker with lazy-loaded panels
- What remains before the milestone is truly usable end-to-end: S03 (optimization/walk-forward) and S04 (final assembled integration closure)

## Tasks

- [ ] **T01: Add 7 research API endpoints, Pydantic schemas, and contract tests** `est:2h`
  - Why: The backend must expose all 7 remaining analysis functions through typed API endpoints before the frontend can render them. This closes the API breadth for R008.
  - Files: `api/schemas.py`, `api/routers/research.py`, `tests/test_research_api.py`
  - Do: Add 7 request/response Pydantic model pairs in `api/schemas.py` following the `LookbackSweepResponse` envelope pattern. Add 7 `@router.post(...)` handlers in `api/routers/research.py` that load pair data via `_load_pair_data()`, call the analysis function, generate takeaway, and wrap in the response model. For `rolling_cointegration`: pass timestamps from `_load_pair_data()` and serialize DataFrame via `.to_dicts()`. For `compare_timeframes`: build a closure that loads parquet files and returns `None` on missing cache. For `compare_spread_methods`: omit the numpy `spread` array from the response payload. For z-score threshold and tx-cost: pre-compute z-score from hedge ratio + spread + rolling window. Z-score threshold and tx-cost endpoints must return `recommended_backtest_params` with a valid `BacktestRequest`; all others return `null`. Add contract tests in `tests/test_research_api.py` that POST to each endpoint with a real cached pair and verify 200 + correct envelope structure.
  - Verify: `uv run pytest tests/test_research_api.py tests/test_backtest_api.py -q` — all pass, no regressions
  - Done when: All 7 endpoints return correctly shaped responses on `ETH/EUR × ETC/EUR 1h` cached data, z-score-threshold and tx-cost include valid `recommended_backtest_params`, and the existing lookback + backtest API tests still pass

- [ ] **T02: Build 7 React research panels, refactor Research Hub into module picker, and add E2E test** `est:2h30m`
  - Why: The frontend must render all 8 research modules in a navigable UI to close R008 and make R015/R022 visible to users. The E2E test gates future regressions.
  - Files: `frontend/lib/api.ts`, `frontend/components/research/RollingStabilityPanel.tsx`, `frontend/components/research/OOSValidationPanel.tsx`, `frontend/components/research/TimeframePanel.tsx`, `frontend/components/research/SpreadMethodPanel.tsx`, `frontend/components/research/ZScoreThresholdPanel.tsx`, `frontend/components/research/TxCostPanel.tsx`, `frontend/components/research/CointMethodPanel.tsx`, `frontend/app/(dashboard)/research/page.tsx`, `frontend/e2e/research-hub.spec.ts`
  - Do: Add 7 TypeScript request/response interfaces + `postXxx()` fetch functions in `api.ts` matching the T01 Pydantic models. Create 7 panel components in `frontend/components/research/` following `LookbackSweepPanel.tsx` pattern: props `{asset1, asset2, timeframe}`, loading/error/empty/result states, takeaway alert, stat cards, PlotlyChart visualization, data table. Z-score threshold and tx-cost panels include recommendation CTA with `buildBacktestSearchParams` deep-link. Diagnostic panels (rolling stability, OOS, timeframe, spread method, coint method) omit the recommendation CTA. Refactor `research/page.tsx` into a Mantine `Tabs` module picker with all 8 panels lazy-imported via `next/dynamic`. Add E2E test in `frontend/e2e/research-hub.spec.ts` that navigates to `/research`, verifies tabs exist, and switches to at least one non-lookback module. All Plotly charts must use `PlotlyChart` wrapper (SSR-safe). Use `as Data` casts for Plotly trace quirks. Spread `DARK_AXIS_STYLE` before overrides for secondary axes.
  - Verify: `cd frontend && npm run build` (type/SSR gate) + `cd frontend && REUSE_SERVERS=1 npm run test:e2e` (smoke + new research hub test)
  - Done when: `npm run build` succeeds, all E2E tests pass, and opening `/research` in the browser shows 8 module tabs with at least one non-lookback module rendering real results from cached data

## Files Likely Touched

- `api/schemas.py`
- `api/routers/research.py`
- `tests/test_research_api.py`
- `frontend/lib/api.ts`
- `frontend/components/research/RollingStabilityPanel.tsx`
- `frontend/components/research/OOSValidationPanel.tsx`
- `frontend/components/research/TimeframePanel.tsx`
- `frontend/components/research/SpreadMethodPanel.tsx`
- `frontend/components/research/ZScoreThresholdPanel.tsx`
- `frontend/components/research/TxCostPanel.tsx`
- `frontend/components/research/CointMethodPanel.tsx`
- `frontend/app/(dashboard)/research/page.tsx`
- `frontend/e2e/research-hub.spec.ts`
