---
id: S03
parent: M002
milestone: M002
provides:
  - Overfitting detector (4 heuristic rules) wired into run_backtest() — every backtest surface automatically screens for suspicious results
  - Fragility detector for grid-search neighbor analysis — flags narrow spikes vs robust plateaus
  - Bounded multi-parameter grid search engine with robustness scoring and max-combo guard
  - Walk-forward validation engine with rolling train/test windows, stability verdict, and divergence analysis
  - POST /api/optimization/grid-search and POST /api/optimization/walk-forward API endpoints
  - "/optimize" page with tabbed Grid Search (Plotly heatmap) and Walk-Forward (fold cards) panels
  - Overfitting/fragility/walk-forward warning rendering in both BacktestResultView and Optimize page
requires:
  - slice: S01
    provides: run_backtest() engine, StrategyParameters/MetricSummary/EngineWarning models, BacktestResult structure, build_post_run_warnings(), _load_pair_data() helper, BacktestResultView.tsx, PlotlyChart wrapper, api/schemas.py envelope pattern
affects:
  - S04
key_files:
  - src/statistical_arbitrage/backtesting/overfitting.py
  - src/statistical_arbitrage/backtesting/optimization.py
  - src/statistical_arbitrage/backtesting/walkforward.py
  - src/statistical_arbitrage/backtesting/models.py
  - src/statistical_arbitrage/backtesting/engine.py
  - api/routers/optimization.py
  - api/schemas.py
  - frontend/app/(dashboard)/optimize/page.tsx
  - frontend/components/optimize/GridSearchPanel.tsx
  - frontend/components/optimize/WalkForwardPanel.tsx
  - frontend/components/backtest/BacktestResultView.tsx
  - frontend/lib/api.ts
  - frontend/components/layout/Sidebar.tsx
  - tests/test_overfitting.py
  - tests/test_optimization.py
  - tests/test_optimization_api.py
  - tests/test_walkforward.py
  - frontend/e2e/optimize.spec.ts
key_decisions:
  - "D024: Overfitting detection uses 4 independent heuristic rules (overfit_* codes) wired into run_backtest() — every surface gets screening without additional integration"
  - "D023: Walk-forward stability verdict uses train-test divergence ratio (test Sharpe / train Sharpe); ≥0.5=stable, 0.25-0.5=moderate, <0.25=fragile; fragile results don't recommend params"
  - "D025: Robustness = fraction of neighbors ≥80% of best metric; fragility = >50% of neighbors <50% of best metric; coordinate helpers shared in overfitting.py"
  - "Axis controls duplicated in both panels rather than extracted to shared component — panels are self-contained and axis UX may diverge"
patterns_established:
  - "overfit_ warning code prefix for overfitting signals, fragile_ for fragility, wf_ for walk-forward — each prefix gets distinct colored Alert styling in the frontend"
  - "OverfitWarningThresholds Pydantic model for configurable detection thresholds"
  - "optimization.py/walkforward.py follow same pure-function pattern as other backtesting modules — no IO, no Dash, reusable by any caller"
  - "/api/optimization/ router prefix groups grid-search and walk-forward endpoints"
  - "data-optimize-tab and data-optimize-panel attributes for E2E targeting"
observability_surfaces:
  - "POST /api/optimization/grid-search response: total_combinations, robustness_score, warnings (overfit_*, fragile_*), execution_time_ms, per-cell status (ok/blocked/no_trades)"
  - "POST /api/optimization/walk-forward response: stability_verdict, train_test_divergence, per-fold status (ok/no_train_trades/no_test_trades/blocked), warnings (wf_*), execution_time_ms"
  - "BacktestResult.warnings includes overfit_* codes for any backtest (standalone, grid-search cell, walk-forward test fold)"
  - "422 for invalid parameter ranges (too many combos, fold_count < 2, train_pct out of range)"
  - "Frontend: colored Alert components for overfit/fragile/wf warning codes, robustness score badge, stability verdict banner, divergence highlighting on fold cards"
drill_down_paths:
  - .gsd/milestones/M002/slices/S03/tasks/T01-SUMMARY.md
  - .gsd/milestones/M002/slices/S03/tasks/T02-SUMMARY.md
  - .gsd/milestones/M002/slices/S03/tasks/T03-SUMMARY.md
  - .gsd/milestones/M002/slices/S03/tasks/T04-SUMMARY.md
duration: ~1.5h across 4 tasks
verification_result: passed
completed_at: 2026-03-18
---

# S03: Optimization, walk-forward, and overfitting visibility

**Shipped bounded grid search with robustness scoring, walk-forward validation with stability verdicts, and overfitting detection wired into every backtest surface — all accessible through a tabbed /optimize page with Plotly heatmaps, fold cards, and inline warnings.**

## What Happened

The slice built three layers bottom-up: detection → optimization engines → frontend surface.

**T01 — Overfitting detector.** Created `backtesting/overfitting.py` with two pure functions. `detect_overfitting_warnings()` screens any `MetricSummary` against 4 heuristic rules: high Sharpe (>3), high profit factor (>5 with <20 trades), high win rate (>85% with <10 trades), and suspiciously smooth equity (drawdown <1% with Sharpe >2). Each fires a distinct `overfit_*` warning code with metric details. `detect_fragility()` checks whether a grid-search best cell is a narrow spike by analyzing n-dimensional neighbors — flags when >50% perform at <50% of best. Added `OverfitWarningThresholds` model for configurable thresholds. Wired `detect_overfitting_warnings()` into `engine.py` after `build_post_run_warnings()` so every `run_backtest()` call — standalone, grid-search, walk-forward — gets automatic screening. Extended `BacktestResultView.tsx` to render overfitting warnings with distinct orange styling and "⚠️ Overfitting Signal" title.

**T02 — Grid search engine.** Created `backtesting/optimization.py` with `run_grid_search()` that generates parameter combinations via `itertools.product` over `numpy.arange` per axis, enforces a max-combo guard (default 500), runs `run_backtest()` per combo, finds the best cell, computes a robustness score (fraction of neighbors within 80% of best metric), and calls both `detect_fragility()` and `detect_overfitting_warnings()` on the best result. Added `ParameterAxis`, `GridSearchCell`, `GridSearchResult` models with validators. Created `POST /api/optimization/grid-search` endpoint with structured request/response schemas following the shared envelope pattern, including `recommended_backtest_params` for direct handoff to `/api/backtest`.

**T03 — Walk-forward engine.** Created `backtesting/walkforward.py` with `run_walk_forward()` as a pure orchestration layer over `run_grid_search()` and `run_backtest()`. Slices data into rolling windows with advancing start positions. Each fold: grid-search on train → extract best params → backtest on non-overlapping test window. Aggregates mean train/test Sharpe, computes divergence ratio (test/train), classifies as stable/moderate/fragile. Emits structured warnings for short test windows, zero test trades, insufficient valid folds, and high divergence. Added `POST /api/optimization/walk-forward` endpoint with stability verdict, per-fold details, and honest-reporting footer. Fragile results intentionally don't populate `recommended_backtest_params`.

**T04 — Frontend optimize page.** Built `/optimize` with Mantine Tabs (Grid Search / Walk-Forward) following the research page pattern with `keepMounted={false}` and `next/dynamic` lazy-loading. Grid Search panel: up to 3 axis pickers, live combination counter, Plotly heatmap (Viridis colorscale, star annotation for best cell, null z-values for no-trade cells), robustness score badge (green/yellow/red), overfitting/fragility warning alerts, and "Use best params" CTA linking to `/backtest`. Walk-Forward panel: fold count, train % slider, axis pickers, per-fold cards with train/test comparison and divergence highlighting (red border when test Sharpe < 50% of train), aggregate summary cards, stability verdict banner (green/yellow/red), and CTA for stable/moderate results. Added "Optimize" nav item with `IconAdjustments` to the sidebar.

## Verification

All slice-level checks pass:

- `uv run pytest tests/test_overfitting.py tests/test_optimization.py tests/test_walkforward.py tests/test_optimization_api.py -q` — **46 passed**
- `uv run pytest tests/ -q` — **164 passed**, 0 failed (full suite, no regressions)
- `cd frontend && npm run build` — compiled successfully, `/optimize` route generated, 0 TypeScript errors
- `cd frontend && npm run test:e2e` — **22/22 passed** (3 new optimize tests + 19 existing)
- Test coverage: 21 overfitting tests, 10 grid-search tests, 4 API contract tests, 11 walk-forward tests, 3 E2E smoke tests

## Requirements Advanced

- **R011** — Grid search engine sweeps ≤3 parameter axes simultaneously with bounded ranges, surfaces which combinations work via structured metric matrix, robustness score, and Plotly heatmap visualization. Moves from "unmapped" to "proven in tests and API."
- **R012** — Overfitting detector wired into every backtest path: Sharpe > 3, profit factor > 5 with few trades, win rate > 85% with few trades, smooth equity. Fragility detector flags narrow parameter spikes. Both render with distinct frontend warnings. Moves from "unmapped" to "proven in tests, API, and UI."
- **R014** — Walk-forward validation with rolling train/test windows, grid-search optimization per fold, per-fold and aggregate metrics, stability verdict, and divergence warnings. Moves from "unmapped" to "proven in tests and API."
- **R015** — Extended to optimization and walk-forward: both endpoints include honest-reporting footer, sample sizes, assumptions, robustness annotations, and overfitting/fragility/walk-forward warnings. The transparency contract now covers the full research + backtest + optimization surface.
- **R022** — Extended to optimization transparency: grid-search shows per-cell metrics, robustness scoring methodology, and fragility diagnosis. Walk-forward shows per-fold train vs test comparison, divergence ratio, and stability classification. All assumptions visible.

## Requirements Validated

- **R011** — Grid search runs bounded multi-parameter sweeps with robustness scoring, heatmap visualization, and honest reporting. 10 unit tests + 4 API tests + 3 E2E tests prove the capability. Frontend renders results with actionable recommendations.
- **R012** — Overfitting detection active on every backtest path (21 unit tests proving all thresholds + negative cases). Fragility detection active on grid-search results. Both render in BacktestResultView and Optimize page with distinct warning styling.
- **R014** — Walk-forward validation with rolling temporal windows, no data leaks, per-fold metrics, aggregate summary, and stability verdict. 11 unit tests prove correct fold splitting, temporal ordering, metrics, and edge cases. API endpoint delivers structured results.
- **R015** — With S03, the transparency contract covers backtest (S01), all 8 research modules (S02), and optimization/walk-forward (S03). Every output states assumptions, sample size, limitations, and warnings. Fully validated across the research & backtest surface.
- **R022** — Optimization transparency completes the visibility chain: Academy shows why, research shows evidence, backtest shows assumptions, optimization shows robustness and fragility. Every formula/parameter/decision is now visible across the full M002 surface.

## New Requirements Surfaced

- none

## Requirements Invalidated or Re-scoped

- none

## Deviations

None — all four tasks followed their plans exactly.

## Known Limitations

- Grid search is synchronous and single-threaded — acceptable for localhost ≤500 combos but would need parallelization for larger sweeps.
- Walk-forward fold windowing uses a simple advancing-start algorithm; more sophisticated anchored/expanding window strategies are not supported.
- Axis controls are duplicated between GridSearchPanel and WalkForwardPanel rather than extracted to a shared component.
- The Plotly heatmap shows only 2D slices (first two axes) when 3 axes are selected; the third axis's best value is used as a filter.
- No persistent optimization history — results exist only in component state during the session.

## Follow-ups

- S04 must exercise the full grid-search → walk-forward → backtest handoff flow live on localhost to close the milestone's integration proof.
- The "Use best params" CTA from the optimization panels should be verified end-to-end in S04's UAT (click through to /backtest with pre-filled params).

## Files Created/Modified

- `src/statistical_arbitrage/backtesting/overfitting.py` — new: detect_overfitting_warnings() and detect_fragility() pure functions with 4 heuristic rules and n-dimensional neighbor analysis
- `src/statistical_arbitrage/backtesting/optimization.py` — new: run_grid_search() bounded multi-parameter optimization engine
- `src/statistical_arbitrage/backtesting/walkforward.py` — new: run_walk_forward() rolling train/test validation engine
- `src/statistical_arbitrage/backtesting/models.py` — extended with OverfitWarningThresholds, ParameterAxis, GridSearchCell, GridSearchResult, WalkForwardFold, WalkForwardResult
- `src/statistical_arbitrage/backtesting/engine.py` — wired overfitting detection into run_backtest() after post-run warnings
- `api/schemas.py` — extended with ParameterAxisPayload, GridSearchCellPayload, GridSearchRequest/Response, WalkForwardRequest/Response, WalkForwardFoldPayload
- `api/routers/optimization.py` — new: POST /api/optimization/grid-search and POST /api/optimization/walk-forward endpoints
- `api/main.py` — registered optimization router
- `frontend/lib/api.ts` — added grid search and walk-forward TypeScript interfaces + API functions
- `frontend/app/(dashboard)/optimize/page.tsx` — new: tabbed optimize page with dynamic panel imports
- `frontend/components/optimize/GridSearchPanel.tsx` — new: grid search panel with axis controls, heatmap, robustness badge, warnings, CTA
- `frontend/components/optimize/WalkForwardPanel.tsx` — new: walk-forward panel with fold cards, stability verdict, divergence highlighting, CTA
- `frontend/components/backtest/BacktestResultView.tsx` — extended WarningList for overfit_* warning styling
- `frontend/components/layout/Sidebar.tsx` — added "Optimize" nav item
- `frontend/e2e/optimize.spec.ts` — new: 3 E2E smoke tests for optimize page
- `tests/test_overfitting.py` — new: 21 tests for overfitting and fragility detection
- `tests/test_optimization.py` — new: 10 tests for grid search engine
- `tests/test_optimization_api.py` — new: 4 API contract tests for grid search endpoint
- `tests/test_walkforward.py` — new: 11 tests for walk-forward engine

## Forward Intelligence

### What the next slice should know
- The optimization router at `/api/optimization/` exposes both grid-search and walk-forward endpoints. The response schemas include `recommended_backtest_params` that can be posted directly to `/api/backtest` — this is the handoff contract S04 should verify end-to-end.
- The `/optimize` page has CTAs ("Use best params") that navigate to `/backtest` with URL search params encoding the best configuration. S04 should click through this flow on real pair data.
- Overfitting warnings now appear in _every_ backtest — the `/backtest` page already renders them. S04 should verify this works with both normal and suspicious results.

### What's fragile
- Walk-forward fold windowing logic with very short datasets — the step calculation `(n - min_window) // (fold_count - 1)` can produce overlapping regions when data is barely above the minimum. Tests cover the edge cases but real cached data at 1h may hit boundary conditions on shorter pairs.
- The double-cast through `unknown` for Plotly heatmap `text` 2D arrays and `MetricSummaryPayload` to `Record<string, unknown>` — these work but are TypeScript escape hatches that could break if the Plotly types or metric shapes change.

### Authoritative diagnostics
- `uv run pytest tests/test_overfitting.py tests/test_optimization.py tests/test_walkforward.py tests/test_optimization_api.py -q` — 46 tests covering all S03 engine and API surfaces. If these pass, the computation layer is intact.
- `cd frontend && npm run build` — catches SSR crashes, TypeScript errors, and route generation issues for `/optimize`.
- E2E `optimize.spec.ts` — verifies the page loads with both tabs and controls render.

### What assumptions changed
- No assumptions changed — the slice plan was accurate and all four tasks shipped without deviations.
