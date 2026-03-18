# S03: Optimization, walk-forward, and overfitting visibility

**Goal:** A user can run bounded grid search and walk-forward validation on a real pair, inspect heatmap and rolling-window results, and see inline warnings when the best-looking results are fragile or suspicious.
**Demo:** On localhost, run a grid search on ETH/ETC at 1h, see a Sharpe heatmap with robustness annotations and fragility warnings, then run walk-forward validation and see per-fold train/test metrics with a stability verdict. Existing `/backtest` page now shows overfitting warnings when metrics trigger thresholds.

## Must-Haves

- Overfitting detector: pure function from `MetricSummary` → `list[EngineWarning]` with configurable thresholds (Sharpe > 3, profit factor > 5 with few trades, win rate > 85% with few trades, suspiciously smooth equity). Wired into `run_backtest()` so every backtest gets screening.
- Fragility detector: given grid search results and the best cell, flag when it is surrounded by poor-performing neighbors.
- Grid search engine: accepts ≤3 parameter axes with bounded ranges, runs `run_backtest()` per combo, returns structured metric matrix with per-cell results, best cell, robustness score, and warnings. Maximum combo guard (default ≤500).
- Walk-forward engine: rolling train/test windows with strict temporal ordering, runs grid-search on train, evaluates best params on test, returns per-fold and aggregate results with stability verdict.
- API endpoints: `POST /api/optimization/grid-search` and `POST /api/optimization/walk-forward` with structured request/response schemas on the shared envelope pattern.
- Frontend: `/optimize` page with Grid Search and Walk-Forward tabs, Plotly heatmap with dark theme, per-fold result cards, robustness and overfitting warnings, CTA to `/backtest` with best params.
- Overfitting warnings render with distinct styling in `BacktestResultView.tsx`.

## Proof Level

- This slice proves: contract + integration
- Real runtime required: yes (API endpoints on real cached parquet, frontend on localhost)
- Human/UAT required: yes (inspect heatmap, fold cards, overfitting warnings)

## Verification

- `uv run pytest tests/test_overfitting.py tests/test_optimization.py tests/test_walkforward.py tests/test_optimization_api.py -q` — all pass
- `cd frontend && npm run build` — SSR/type gate passes
- `uv run pytest tests/ -q` — no regressions across the full suite
- `cd frontend && REUSE_SERVERS=1 npm run test:e2e` — existing tests + new optimize smoke test pass
- `POST /api/optimization/grid-search` with a known pair returns metric matrix with correct dimensions, best cell, robustness annotation, and overfitting warnings
- `POST /api/optimization/walk-forward` with a known pair returns per-fold train/test metrics, aggregate summary, and stability verdict
- `POST /api/backtest` with parameters that yield suspiciously good metrics includes overfitting warning codes in `warnings`
- `POST /api/backtest` with normal/healthy metrics returns empty overfitting warnings — verifies thresholds don't false-positive on reasonable results
- `/optimize` page loads with two tabs; Grid Search tab shows controls and heatmap area; Walk-Forward tab shows fold config and results area

## Observability / Diagnostics

- Runtime signals: overfitting warnings in `BacktestResult.warnings` with codes `overfit_high_sharpe`, `overfit_high_profit_factor`, `overfit_high_winrate`, `overfit_smooth_equity`, `fragile_best_cell`; grid-search and walk-forward endpoints log run counts and execution time
- Inspection surfaces: `POST /api/optimization/grid-search` response contains `total_combinations`, `warnings`, and `robustness_score`; `POST /api/optimization/walk-forward` response contains `folds` with per-fold train/test metrics and `stability_verdict`; OpenAPI at `/openapi.json` exposes both endpoint schemas
- Failure visibility: 422 for invalid parameter ranges (too many combos, invalid axis bounds), 404 for missing cached data, structured blocker codes in walk-forward fold results when train/test windows are too short
- Redaction constraints: none

## Integration Closure

- Upstream surfaces consumed: `backtesting/engine.py` (`run_backtest()`), `backtesting/models.py` (all existing models), `backtesting/preflight.py` (`build_post_run_warnings()`), `api/routers/analysis.py` (`_load_pair_data()`, `_get_cache_mgr()`), `api/schemas.py` (existing payload types), `frontend/lib/api.ts` (existing types and helpers), `frontend/components/backtest/BacktestResultView.tsx` (existing warning rendering), `frontend/components/charts/PlotlyChart.tsx` (SSR-safe wrapper)
- New wiring introduced in this slice: `api/routers/optimization.py` registered in `api/main.py`, `/optimize` route and sidebar nav item in frontend, overfitting detector wired into `engine.py` post-run pipeline
- What remains before the milestone is truly usable end-to-end: S04 final integration closure (live research→backtest→optimization→walk-forward flow on localhost)

## Tasks

- [x] **T01: Build overfitting detector and wire into backtest engine** `est:1h`
  - Why: R012 is the safety net that prevents the platform from giving false confidence. Wiring it into `run_backtest()` means every backtest surface (including existing `/backtest` page and future grid-search/walk-forward) immediately benefits. This is the cheapest task with the most immediate safety value.
  - Files: `src/statistical_arbitrage/backtesting/overfitting.py`, `src/statistical_arbitrage/backtesting/models.py`, `src/statistical_arbitrage/backtesting/engine.py`, `tests/test_overfitting.py`, `frontend/components/backtest/BacktestResultView.tsx`
  - Do: (1) Create `backtesting/overfitting.py` with `detect_overfitting_warnings(metrics, trade_count, thresholds=None) → list[EngineWarning]` and `detect_fragility(cells, best_index, axes_sizes) → list[EngineWarning]`. Thresholds: Sharpe > 3, profit_factor > 5 with < 20 trades, win_rate > 0.85 with < 10 trades, max_drawdown < 0.01 with Sharpe > 2. (2) Add `OverfitWarningThresholds` model to `models.py`. (3) Call `detect_overfitting_warnings()` in `engine.py` after `build_post_run_warnings()` and append to the warnings list. (4) In `BacktestResultView.tsx`, add a distinct rendering section for overfitting-coded warnings (red/orange alert with a different icon). (5) Write `tests/test_overfitting.py` with cases for each threshold trigger and a healthy-metrics negative case.
  - Verify: `uv run pytest tests/test_overfitting.py tests/test_backtest_engine.py -q` — all pass with no regressions; `cd frontend && npm run build` passes
  - Done when: `detect_overfitting_warnings()` triggers on known-suspicious metrics and doesn't trigger on healthy ones; `run_backtest()` includes overfitting warning codes in its `warnings` list when appropriate; `BacktestResultView` renders overfitting alerts distinctly

- [x] **T02: Build grid search engine with API endpoint and tests** `est:1.5h`
  - Why: R011 requires multi-parameter optimization with honest reporting. The grid search runner is the core computation that both the grid-search API endpoint and the walk-forward engine (T03) will use.
  - Files: `src/statistical_arbitrage/backtesting/optimization.py`, `src/statistical_arbitrage/backtesting/models.py`, `api/schemas.py`, `api/routers/optimization.py`, `api/main.py`, `tests/test_optimization.py`, `tests/test_optimization_api.py`
  - Do: (1) Add `ParameterAxis`, `GridSearchCell`, `GridSearchResult` models to `models.py`. (2) Build `backtesting/optimization.py` with `run_grid_search(timestamps, prices1, prices2, axes, base_params, optimize_metric="sharpe_ratio") → GridSearchResult`. It generates all combinations from the axes, enforces a max_combinations guard (default 500), runs `run_backtest()` for each combo, collects per-cell metrics, identifies the best cell, computes a robustness score (fraction of neighbors within 80% of best metric), and calls `detect_fragility()` from T01. (3) Add `GridSearchRequest`/`GridSearchResponse` schemas to `api/schemas.py`. (4) Create `api/routers/optimization.py` with `POST /api/optimization/grid-search`. (5) Register the router in `api/main.py`. (6) Write `tests/test_optimization.py` (correct cell count, best cell identification, robustness scoring, max-combo guard, zero-trade handling) and `tests/test_optimization_api.py` (endpoint contract test).
  - Verify: `uv run pytest tests/test_optimization.py tests/test_optimization_api.py -q` — all pass
  - Done when: grid search returns correct-dimension metric matrix, identifies best cell, handles zero-trade combos gracefully, and the API endpoint returns a valid structured response on real cached data

- [x] **T03: Build walk-forward engine with API endpoint and tests** `est:1.5h`
  - Why: R014 requires rolling-window train/test validation — the gold standard for realistic backtesting. It surfaces regime changes and parameter decay that in-sample optimization misses.
  - Files: `src/statistical_arbitrage/backtesting/walkforward.py`, `src/statistical_arbitrage/backtesting/models.py`, `api/schemas.py`, `api/routers/optimization.py`, `tests/test_walkforward.py`
  - Do: (1) Add `WalkForwardFold`, `WalkForwardResult` models to `models.py`. (2) Build `backtesting/walkforward.py` with `run_walk_forward(timestamps, prices1, prices2, axes, base_params, fold_count, train_pct, ...) → WalkForwardResult`. It slices data into rolling windows where each test window strictly follows its train window with no overlap. For each fold: run grid-search on train window, take best params, run single backtest on test window. Collect per-fold train/test metrics. Compute aggregate summary: average test Sharpe, test-vs-train divergence, stability verdict (stable/moderate/fragile). (3) Add `WalkForwardRequest`/`WalkForwardResponse` schemas to `api/schemas.py`. (4) Add `POST /api/optimization/walk-forward` to the existing `api/routers/optimization.py`. (5) Write `tests/test_walkforward.py` with cases for correct fold splitting, no temporal data leak, per-fold metrics, aggregate summary, stability verdict, and edge case where test window produces zero trades.
  - Verify: `uv run pytest tests/test_walkforward.py -q` — all pass; `uv run pytest tests/ -q` — no regressions
  - Done when: walk-forward correctly partitions data into non-overlapping train/test windows, returns per-fold metrics with train-vs-test comparison, and the API endpoint returns a valid structured response

- [ ] **T04: Build frontend optimize page with grid search and walk-forward panels** `est:2h`
  - Why: The computation is useless without a product surface. This task turns the API into a usable research tool with heatmap visualization, fold inspection, robustness annotations, and actionable recommendations that link to `/backtest`.
  - Files: `frontend/lib/api.ts`, `frontend/app/(dashboard)/optimize/page.tsx`, `frontend/components/optimize/GridSearchPanel.tsx`, `frontend/components/optimize/WalkForwardPanel.tsx`, `frontend/components/layout/Sidebar.tsx`, `frontend/e2e/optimize.spec.ts`
  - Do: (1) Add TypeScript interfaces for `GridSearchRequest`, `GridSearchResponse`, `GridSearchCell`, `WalkForwardRequest`, `WalkForwardResponse`, `WalkForwardFold` and API functions `postGridSearch()`, `postWalkForward()` to `api.ts`. (2) Build `GridSearchPanel.tsx`: pair selectors from PairContext, parameter axis controls (lookback min/max/step, entry min/max/step, exit min/max/step), estimated combo count display, "Run Grid Search" button, loading/error/empty/result states, Plotly heatmap (entry × exit or any 2D slice, colorscale by Sharpe), robustness score badge, overfitting/fragility warnings as colored alerts, "Use best params" CTA linking to `/backtest` via `buildBacktestSearchParams()`. Use `next/dynamic` + `{ ssr: false }` for the panel. (3) Build `WalkForwardPanel.tsx`: fold count, train/test split controls, parameter ranges, "Run Walk-Forward" button, per-fold result cards showing train and test Sharpe/return/trade count, aggregate summary card, stability verdict banner (green/yellow/red), train-vs-test divergence warnings. Use `next/dynamic` + `{ ssr: false }`. (4) Build `optimize/page.tsx` with Mantine Tabs (Grid Search / Walk-Forward) following the research page pattern with `keepMounted={false}` and lazy-loaded panels. (5) Add "Optimize" nav item with `IconAdjustments` icon to `Sidebar.tsx`. (6) Write `frontend/e2e/optimize.spec.ts` — page loads, both tabs render, switching tabs changes panel. Relevant skill: `frontend-design`.
  - Verify: `cd frontend && npm run build` — SSR/type gate passes; `cd frontend && REUSE_SERVERS=1 npm run test:e2e` — new optimize tests + all existing tests pass
  - Done when: `/optimize` page loads with two tabs, Grid Search tab shows parameter axis controls and heatmap area, Walk-Forward tab shows fold config and results area, sidebar shows Optimize link, E2E tests pass

## Files Likely Touched

- `src/statistical_arbitrage/backtesting/overfitting.py` (new)
- `src/statistical_arbitrage/backtesting/optimization.py` (new)
- `src/statistical_arbitrage/backtesting/walkforward.py` (new)
- `src/statistical_arbitrage/backtesting/models.py` (extend)
- `src/statistical_arbitrage/backtesting/engine.py` (extend)
- `api/schemas.py` (extend)
- `api/routers/optimization.py` (new)
- `api/main.py` (extend)
- `tests/test_overfitting.py` (new)
- `tests/test_optimization.py` (new)
- `tests/test_optimization_api.py` (new)
- `tests/test_walkforward.py` (new)
- `frontend/lib/api.ts` (extend)
- `frontend/app/(dashboard)/optimize/page.tsx` (new)
- `frontend/components/optimize/GridSearchPanel.tsx` (new)
- `frontend/components/optimize/WalkForwardPanel.tsx` (new)
- `frontend/components/backtest/BacktestResultView.tsx` (extend)
- `frontend/components/layout/Sidebar.tsx` (extend)
- `frontend/e2e/optimize.spec.ts` (new)
