# S03: Optimization, walk-forward, and overfitting visibility — Research

**Date:** 2026-03-18
**Depth:** Targeted

## Summary

S03 adds three new capabilities on top of S01's proven engine and S02's completed Research Hub: (1) bounded multi-parameter grid search with heatmap visualization, (2) walk-forward validation with rolling train/test windows, and (3) inline overfitting/fragility warnings on backtest and optimization results. The requirements owned are R011 (multi-parameter optimization), R012 (overfitting detection), R014 (walk-forward testing), and supporting R015/R022 (transparency in optimization results).

The engine (`backtesting/engine.py`) already accepts `StrategyParameters` and returns `BacktestResult` with `MetricSummary`, `warnings`, and `footer`. The grid-search layer is a loop that calls `run_backtest()` for each parameter combination, collects the per-cell metrics, then annotates the results with robustness/fragility labels. Walk-forward is a loop that slices the data into overlapping train/test windows, runs grid-search (or single backtest) on each train window, evaluates on the corresponding test window, and aggregates across folds. The overfitting detector is a set of threshold rules applied to `MetricSummary` fields plus train-vs-test divergence checks. All three are pure-Python computation — no Dash, no React imports.

The main complexity is in walk-forward: it must re-run `build_rolling_strategy_data()` and `run_backtest()` per fold per parameter set without leaking data across windows. The engine already enforces look-ahead safety per-run, so the walk-forward layer only needs to correctly slice timestamps/prices and collect results. Performance is bounded by limiting grid search to ≤3 parameter axes with small default ranges (the existing `sweep_zscore_thresholds` defaults are 9×5=45 combos — full grid-search with 3 axes might hit ~200-500 combos × ~5 folds = ~1000-2500 backtest runs, which is fast for the vectorized engine on <10k bars).

## Recommendation

Build bottom-up in three layers, each independently testable:

1. **Overfitting detector** — pure function from `MetricSummary` → `list[EngineWarning]`. Wire into the existing `run_backtest` pipeline so every single backtest gets overfitting screening immediately. This is the cheapest task and gives the most immediate safety value.
2. **Grid search engine** — pure function that accepts parameter ranges + data, runs backtest for each combo, returns a structured result with per-cell metrics, best/worst cells, and robustness annotation. New API endpoint + new React page/tab.
3. **Walk-forward engine** — pure function that accepts fold config + parameter ranges + data, runs train-window optimization + test-window evaluation per fold, returns per-fold and aggregate results. New API endpoint + new React page/tab.

API endpoints and frontend components follow the patterns established in S01/S02 exactly. The new `/optimize` and `/walkforward` pages should reuse the `/backtest` URL-param handoff pattern and the existing `BacktestResultView` for per-fold result rendering.

## Implementation Landscape

### Key Files

**Engine layer (new pure-Python modules):**

- `src/statistical_arbitrage/backtesting/overfitting.py` — **New.** Pure function: `detect_overfitting_warnings(metrics: MetricSummary, trade_count: int, ...) → list[EngineWarning]`. Thresholds: Sharpe > 3, profit factor > 5 with < 20 trades, win rate > 85% with < 10 trades, max drawdown < 1% with Sharpe > 2 (suspiciously smooth). Also: `detect_fragility(grid_results, best_cell) → list[EngineWarning]` for when the best parameter point is surrounded by poor neighbors.
- `src/statistical_arbitrage/backtesting/optimization.py` — **New.** Grid search runner: takes parameter axis definitions + price data, calls `run_backtest()` per combo, returns `GridSearchResult` with metric matrix, best cell, robustness score, and overfitting warnings.
- `src/statistical_arbitrage/backtesting/walkforward.py` — **New.** Walk-forward runner: takes fold config (window sizes, step), parameter ranges + data, runs grid-search on each train window, evaluates best params on test window, returns `WalkForwardResult` with per-fold metrics, aggregate summary, and stability verdict.
- `src/statistical_arbitrage/backtesting/models.py` — **Extend.** Add `GridSearchCell`, `GridSearchResult`, `WalkForwardFold`, `WalkForwardResult`, `OverfitWarningThresholds` models.

**Existing engine files (minor changes):**

- `src/statistical_arbitrage/backtesting/engine.py` — Integrate overfitting detector into `run_backtest()` so its warnings appear in `result.warnings` alongside the existing preflight/runtime warnings. No structural changes.
- `src/statistical_arbitrage/backtesting/preflight.py` — `build_post_run_warnings()` gains an overfitting check call. Minimal.
- `src/statistical_arbitrage/strategy/zscore_mean_reversion.py` — No changes needed. Grid search and walk-forward use the existing `build_rolling_strategy_data()` and engine as-is.

**API layer:**

- `api/schemas.py` — **Extend.** Add `GridSearchRequest`, `GridSearchResponse`, `WalkForwardRequest`, `WalkForwardResponse`, and their sub-payloads. Follow the exact pattern of `BacktestRequest`/`BacktestResponse` with `footer`, `warnings`, and `recommended_backtest_params`.
- `api/routers/optimization.py` — **New.** `POST /api/optimization/grid-search` and `POST /api/optimization/walk-forward`. Both read parquet cache via `_load_pair_data()`, delegate to the pure-Python engines, return structured payloads. Follow `api/routers/backtest.py` pattern.

**Frontend layer:**

- `frontend/lib/api.ts` — **Extend.** Add TypeScript interfaces and `postGridSearch()` / `postWalkForward()` API functions.
- `frontend/app/(dashboard)/optimize/page.tsx` — **New.** Optimization page with two tabs: Grid Search and Walk-Forward. Each tab has controls, a run button, and a results area. Follow the `research/page.tsx` tabbed-module pattern with `next/dynamic` + `ssr: false`.
- `frontend/components/optimize/GridSearchPanel.tsx` — **New.** Controls for parameter axes (lookback, entry, exit thresholds with min/max/step), heatmap Plotly chart (colorscale by Sharpe or another chosen metric), robustness annotation, overfitting warnings, and recommended-settings CTA linking to `/backtest`.
- `frontend/components/optimize/WalkForwardPanel.tsx` — **New.** Controls for fold count, train/test window sizes, parameter ranges. Per-fold result cards with train vs test metrics. Aggregate summary. Stability verdict banner. Overfitting/divergence warnings.
- `frontend/components/backtest/BacktestResultView.tsx` — **Extend.** Add rendering for overfitting warning codes (new colored banners). The component already renders `result.warnings` — it just needs overfitting-specific styling (red/orange inline alerts).
- `frontend/components/layout/Sidebar.tsx` — **Extend.** Add "Optimize" nav item linking to `/optimize`.

**Tests:**

- `tests/test_overfitting.py` — **New.** Unit tests for overfitting detector: known-suspicious metrics trigger warnings, healthy metrics don't, fragility detection on grid results.
- `tests/test_optimization.py` — **New.** Unit tests for grid search: correct number of cells, best cell identification, robustness scoring, parameter axis validation.
- `tests/test_walkforward.py` — **New.** Unit tests for walk-forward: correct fold splitting, no data leak between train/test, per-fold metrics, aggregate summary.
- `tests/test_optimization_api.py` — **New.** API contract tests for grid-search and walk-forward endpoints.
- `frontend/e2e/optimize.spec.ts` — **New.** E2E smoke test: page loads, tabs render, controls visible.

### Build Order

**T01: Overfitting detector + integration into existing backtest engine.**
Build `backtesting/overfitting.py` with the pure detection function. Wire it into `engine.py` so every `run_backtest()` call now includes overfitting warnings when metrics trigger thresholds. Add `tests/test_overfitting.py`. Extend `BacktestResultView.tsx` to render overfitting warnings with distinct styling. This is the cheapest, safest task and immediately adds safety to all existing backtest surfaces.

**T02: Grid search engine + API + frontend.**
Build `backtesting/optimization.py` with the grid-search runner. Add models to `models.py`. Add `api/routers/optimization.py` with `POST /api/optimization/grid-search`. Add schemas to `api/schemas.py`. Add types and `postGridSearch()` to `frontend/lib/api.ts`. Build `frontend/app/(dashboard)/optimize/page.tsx` and `frontend/components/optimize/GridSearchPanel.tsx` with heatmap visualization, robustness annotations, fragility warnings, and CTA to `/backtest` with best params. Add `tests/test_optimization.py` and `tests/test_optimization_api.py`. Add sidebar nav item.

**T03: Walk-forward engine + API + frontend.**
Build `backtesting/walkforward.py` with the rolling-window train/test runner. Add models to `models.py`. Add `POST /api/optimization/walk-forward` endpoint. Add schemas, types, `postWalkForward()` to the respective files. Build `frontend/components/optimize/WalkForwardPanel.tsx` with per-fold cards, aggregate summary, stability verdict, and train-vs-test divergence warnings. Add `tests/test_walkforward.py`. Add E2E smoke test `frontend/e2e/optimize.spec.ts` covering both tabs.

### Verification Approach

**Contract gates:**
- `uv run pytest tests/test_overfitting.py tests/test_optimization.py tests/test_walkforward.py tests/test_optimization_api.py -q` — all pass
- `cd frontend && npm run build` — SSR/type gate passes

**Integration gates:**
- `POST /api/optimization/grid-search` with a known pair returns a metric matrix with correct dimensions, best cell, robustness annotations, and overfitting warnings when applicable
- `POST /api/optimization/walk-forward` with a known pair returns per-fold train/test metrics, aggregate summary, and stability verdict
- `POST /api/backtest` now includes overfitting warnings for suspiciously good results

**Frontend gates:**
- `/optimize` page loads with Grid Search and Walk-Forward tabs
- Grid Search tab shows heatmap after a run, with fragility/robustness annotations and CTA to `/backtest`
- Walk-Forward tab shows per-fold results, aggregate verdict, and train-vs-test divergence warnings
- Existing `/backtest` page now renders overfitting warnings inline with distinct styling

**E2E:**
- `cd frontend && REUSE_SERVERS=1 npm run test:e2e` — existing tests still pass + new optimize smoke test

## Constraints

- Grid search must remain bounded for localhost use. Default parameter ranges should produce ≤500 combinations. The UI should show estimated run count before execution.
- Walk-forward folds must strictly partition time: each test window must come after its corresponding train window, with no data overlap. The engine already enforces look-ahead safety within a single backtest, but the walk-forward layer must enforce temporal ordering at the fold level.
- All new engine code must be pure Python — no Dash, no React, no FastAPI imports in `backtesting/` modules.
- Grid search and walk-forward both reuse `run_backtest()` from `engine.py` as-is — they are orchestration layers, not engine forks.
- Overfitting thresholds from R012: Sharpe > 3, profit factor > 5 with few trades, in-sample vs out-of-sample divergence. These are starting points, not gospel — the detector should be easily tunable.

## Common Pitfalls

- **Walk-forward data leakage at window boundaries** — The train window must end strictly before the test window starts. Since `build_rolling_strategy_data()` uses a lookback warmup, the test window's first usable signal is `lookback_window` bars into the test period. Account for this when sizing windows; too-small test windows will produce zero trades.
- **Grid search heatmap with missing cells** — Some parameter combos may produce zero trades (e.g., very high entry threshold on a low-volatility pair). The heatmap must handle null/missing metric values gracefully (e.g., gray cells for no-trade combos).
- **Fragility detection edge case** — "Surrounded by poor neighbors" requires a definition of the neighbor topology on the parameter grid. For a 2D grid, use the 8 adjacent cells. For a 1D sweep, use ±1 step. If the best cell is on the edge of the grid, it has fewer neighbors — don't penalize it just for being at the boundary.
- **Walk-forward fold count vs data length** — With default 365 days × 1h = ~8760 bars, a 5-fold walk-forward with 60% train / 40% test windows needs careful sizing. If the user picks too many folds or too large a train window, folds may overlap or produce too few test-window trades. Validate fold config before running.
- **Plotly heatmap SSR** — Same `next/dynamic` + `{ ssr: false }` pattern required for the heatmap component. Already established in S02 research panels.

## Open Risks

- Walk-forward × grid-search combined execution time on large datasets (e.g., 5 folds × 200 param combos = 1000 backtest runs). The vectorized engine is fast (~1ms per run on 5000 bars based on S01 evidence), so 1000 runs should take ~1-2 seconds. But if users pick extreme ranges, this could grow. Consider a maximum-combo guard in the API.
- The "right" metric for grid-search optimization is debatable. Sharpe ratio is the default, but profit factor, total return, or a custom objective could all be valid. Start with Sharpe as the default heatmap metric, with a dropdown to switch views.
