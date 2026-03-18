---
estimated_steps: 5
estimated_files: 5
---

# T03: Build walk-forward engine with API endpoint and tests

**Slice:** S03 — Optimization, walk-forward, and overfitting visibility
**Milestone:** M002

## Description

Build the walk-forward validation engine that slices historical data into rolling train/test windows, runs grid-search optimization on each train window, evaluates the best parameters on the corresponding test window, and aggregates results across folds with a stability verdict. This delivers R014 (walk-forward testing) and extends R015/R022 (transparency) with train-vs-test divergence reporting.

The walk-forward engine is an orchestration layer that calls T02's `run_grid_search()` for train-window optimization and `run_backtest()` for test-window evaluation. It adds no new computation — only temporal partitioning and aggregation.

## Steps

1. **Add walk-forward models to `backtesting/models.py`:**
   - `WalkForwardFold(BacktestModel)`: `fold_index: int`, `train_start_idx: int`, `train_end_idx: int`, `test_start_idx: int`, `test_end_idx: int`, `train_bars: int`, `test_bars: int`, `best_params: dict[str, float]` (axis name → optimized value), `train_metrics: MetricSummary`, `test_metrics: MetricSummary`, `train_trade_count: int`, `test_trade_count: int`, `status: Literal["ok", "no_train_trades", "no_test_trades", "blocked"]`.
   - `WalkForwardResult(BacktestModel)`: `folds: list[WalkForwardFold]`, `fold_count: int`, `train_pct: float`, `axes: list[ParameterAxis]`, `aggregate_train_sharpe: float | None`, `aggregate_test_sharpe: float | None`, `train_test_divergence: float | None` (ratio of test Sharpe to train Sharpe — <0.5 is suspicious), `stability_verdict: Literal["stable", "moderate", "fragile"]`, `warnings: list[EngineWarning]`, `execution_time_ms: float`.

2. **Create `src/statistical_arbitrage/backtesting/walkforward.py`** with:
   - `run_walk_forward(timestamps, prices1, prices2, axes: list[ParameterAxis], base_params: StrategyParameters, fold_count: int = 5, train_pct: float = 0.6, optimize_metric: str = "sharpe_ratio", max_combinations_per_fold: int = 500) → WalkForwardResult`
   - Implementation:
     a. Compute total bars `N = len(timestamps)`. Validate that `fold_count >= 2` and `train_pct` is between 0.3 and 0.9.
     b. Compute the step size so that folds advance through the data: `step = (N - min_window) // (fold_count - 1)` where `min_window` is the minimum total window (train + test). Each fold's train window starts at `fold_index * step` and the test window follows immediately after the train window with no overlap.
     c. For each fold: (i) slice `timestamps[train_start:train_end]`, `prices1[train_start:train_end]`, `prices2[train_start:train_end]` for training. (ii) Run `run_grid_search()` on the train slice. (iii) Extract best params from the grid search result. (iv) Slice `timestamps[test_start:test_end]`, etc. for testing (test_start = train_end, test_end = test_start + test_size). (v) Run `run_backtest()` with the best params on the test slice. (vi) Build the `WalkForwardFold`.
     d. After all folds: compute aggregate Sharpe (mean of per-fold test Sharpe, skipping None), train-test divergence ratio, and stability verdict: "stable" if divergence ≥ 0.5, "moderate" if 0.25–0.5, "fragile" if < 0.25 or insufficient data.
     e. Generate warnings for: train-test divergence < 0.5, any fold with zero test trades, total folds with valid test metrics < 3.
   - Critical constraint: **Each test window must start strictly after its train window ends.** The lookback warmup inside `run_backtest()` handles its own warmup from the beginning of the data it receives, so the test window's first usable signal is `lookback_window` bars into the test period. Validate that each test window has enough bars: `test_bars >= base_params.lookback_window + 10`. If not, emit a warning but still run (the engine will return zero trades naturally).

3. **Add API schemas to `api/schemas.py`:**
   - `WalkForwardFoldPayload(BaseModel)`: mirrors `WalkForwardFold` with `MetricSummaryPayload` for metrics
   - `WalkForwardRequest(BaseModel)`: `asset1`, `asset2`, `timeframe`, `days_back`, `axes: list[ParameterAxisPayload]`, `base_strategy: StrategyParametersPayload` (default factory), `fold_count: int = 5`, `train_pct: float = 0.6`, `optimize_metric: str = "sharpe_ratio"`, `max_combinations_per_fold: int = 500`
   - `WalkForwardResponse(BaseModel)`: `folds: list[WalkForwardFoldPayload]`, `fold_count`, `train_pct`, `axes`, `aggregate_train_sharpe`, `aggregate_test_sharpe`, `train_test_divergence`, `stability_verdict`, `warnings: list[EngineWarningPayload]`, `execution_time_ms`, `footer: HonestReportingFooterPayload`, `recommended_backtest_params: BacktestRequest | None` (from the best fold's test params, if stable)

4. **Add `POST /api/optimization/walk-forward` to `api/routers/optimization.py`:**
   - Load pair data, convert request types to engine types, call `run_walk_forward()`, build the response.
   - Error handling: `ValueError` → 422 (bad fold config, too many combos), data not found → 404, other → 500.
   - If stability verdict is "stable" or "moderate", include `recommended_backtest_params` with the best-performing test-fold params. If "fragile", set to `None`.

5. **Write `tests/test_walkforward.py`:**
   - `test_fold_temporal_ordering`: every fold's test_start_idx >= train_end_idx (no overlap)
   - `test_correct_fold_count`: requesting 5 folds → 5 WalkForwardFold objects
   - `test_train_test_no_data_leak`: train and test index ranges don't overlap for any fold
   - `test_per_fold_metrics_present`: each fold has train_metrics and test_metrics
   - `test_aggregate_summary`: aggregate test Sharpe is mean of per-fold test Sharpes
   - `test_stability_verdict_fragile`: mock scenario where test metrics are much worse than train → "fragile"
   - `test_stability_verdict_stable`: mock scenario where test tracks train → "stable"
   - `test_short_test_window_warning`: fold with very short test window → warning emitted
   - Use synthetic price data (500+ bars with correlated noise, similar to T02 test fixtures). Import `run_walk_forward` from `backtesting/walkforward`, `ParameterAxis` and `StrategyParameters` from `models`.

## Must-Haves

- [ ] Walk-forward correctly partitions data into non-overlapping train/test windows
- [ ] Each test window starts strictly after its corresponding train window ends
- [ ] Grid search runs on train window only; best params evaluated on test window
- [ ] Per-fold results include both train and test metrics
- [ ] Aggregate summary computes mean test Sharpe and train-test divergence
- [ ] Stability verdict classifies results as stable/moderate/fragile
- [ ] Warnings for train-test divergence, zero test trades, insufficient valid folds
- [ ] API endpoint returns structured `WalkForwardResponse` on the shared router
- [ ] All tests pass

## Verification

- `uv run pytest tests/test_walkforward.py -q` — all pass
- `uv run pytest tests/ -q` — no regressions

## Observability Impact

- Signals added: `stability_verdict` (stable/moderate/fragile) in walk-forward results; `train_test_divergence` ratio for quick overfit assessment; per-fold `status` field (ok/no_train_trades/no_test_trades/blocked)
- How a future agent inspects this: POST to `/api/optimization/walk-forward` with a known pair → check `stability_verdict`, `folds[].status`, `train_test_divergence`, and `warnings`
- Failure state exposed: 422 for invalid fold config; per-fold status codes for individual fold failures; aggregate warnings when too few folds produce valid results

## Inputs

- `src/statistical_arbitrage/backtesting/optimization.py` — T02's `run_grid_search()` function for train-window optimization
- `src/statistical_arbitrage/backtesting/models.py` — T02's `ParameterAxis`, `GridSearchResult` plus existing `StrategyParameters`, `MetricSummary`, `EngineWarning`
- `src/statistical_arbitrage/backtesting/engine.py` — `run_backtest()` for test-window evaluation
- `api/routers/optimization.py` — T02's router file where the walk-forward endpoint will be added
- `api/schemas.py` — T02's `ParameterAxisPayload` and existing patterns

## Expected Output

- `src/statistical_arbitrage/backtesting/walkforward.py` — new module with `run_walk_forward()`
- `src/statistical_arbitrage/backtesting/models.py` — extended with `WalkForwardFold`, `WalkForwardResult`
- `api/schemas.py` — extended with walk-forward request/response schemas
- `api/routers/optimization.py` — extended with `POST /api/optimization/walk-forward`
- `tests/test_walkforward.py` — unit tests for walk-forward engine
