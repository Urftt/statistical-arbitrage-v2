---
estimated_steps: 5
estimated_files: 5
---

# T01: Build overfitting detector and wire into backtest engine

**Slice:** S03 — Optimization, walk-forward, and overfitting visibility
**Milestone:** M002

## Description

Create a pure-Python overfitting detection module that screens backtest metrics for suspiciously good results and wire it into the existing `run_backtest()` pipeline so every backtest run—including existing `/backtest` page and future grid search/walk-forward—immediately gets overfitting warnings. Also add a fragility detector (for later use by grid search in T02) and extend the frontend `BacktestResultView` to render overfitting warnings with distinct styling.

This task delivers R012 (overfitting detection) as the cheapest, safest increment with the most immediate safety value.

## Steps

1. **Add `OverfitWarningThresholds` model to `backtesting/models.py`.** This is a simple Pydantic model with tunable thresholds:
   - `sharpe_threshold: float = 3.0`
   - `profit_factor_threshold: float = 5.0`
   - `profit_factor_min_trades: int = 20`
   - `winrate_threshold: float = 0.85`
   - `winrate_min_trades: int = 10`
   - `smooth_equity_max_drawdown: float = 0.01`
   - `smooth_equity_min_sharpe: float = 2.0`

2. **Create `src/statistical_arbitrage/backtesting/overfitting.py`** with two pure functions:
   - `detect_overfitting_warnings(metrics: MetricSummary, trade_count: int, thresholds: OverfitWarningThresholds | None = None) → list[EngineWarning]`: Check each threshold rule against the metrics. Use warning codes: `overfit_high_sharpe`, `overfit_high_profit_factor`, `overfit_high_winrate`, `overfit_smooth_equity`. Each warning includes the actual metric value in `details`.
   - `detect_fragility(cells: list[dict], best_index: int, grid_shape: tuple[int, ...]) → list[EngineWarning]`: Given a flat list of per-cell metric dicts (from grid search), the index of the best cell, and the shape of the parameter grid, check if the best cell is surrounded by poor-performing neighbors. A neighbor is "poor" if its primary metric is < 50% of the best cell's metric. If more than half of the neighbors are poor (or null/zero-trade), emit a `fragile_best_cell` warning. Handle edge cells (fewer neighbors) without penalizing. Use standard n-dimensional neighbor offsets for the grid shape.

3. **Wire `detect_overfitting_warnings()` into `engine.py`:** In `run_backtest()`, after the existing `build_post_run_warnings()` call and before constructing the final `BacktestResult`, call `detect_overfitting_warnings(metrics, len(trades))` and extend the `warnings` list. Only call it when `status == "ok"` (not blocked). Import the function at the top of the file.

4. **Extend `BacktestResultView.tsx`:** The component already renders `result.warnings` as yellow/red alerts. Add a check: if a warning's `code` starts with `overfit_`, render it with a distinct orange/red `Alert` using `IconAlertTriangle` and a title like "⚠️ Overfitting Signal". This is a small conditional inside the existing warnings section — not a structural change.

5. **Write `tests/test_overfitting.py`** with these test cases:
   - `test_high_sharpe_triggers_warning`: MetricSummary with `sharpe_ratio=4.5` → warning code `overfit_high_sharpe`
   - `test_high_profit_factor_with_few_trades`: profit_factor=8.0, 10 trades → `overfit_high_profit_factor`
   - `test_high_profit_factor_with_many_trades_no_warning`: profit_factor=6.0, 50 trades → no warning
   - `test_high_winrate_with_few_trades`: win_rate=0.9, 5 trades → `overfit_high_winrate`
   - `test_smooth_equity`: max_drawdown=0.005, sharpe=2.5 → `overfit_smooth_equity`
   - `test_healthy_metrics_no_warnings`: normal MetricSummary → empty list
   - `test_multiple_triggers`: MetricSummary triggering 2+ thresholds → all codes present
   - `test_fragility_surrounded_by_poor`: best cell with poor neighbors → `fragile_best_cell`
   - `test_fragility_robust_cell`: best cell with strong neighbors → no warning
   - `test_custom_thresholds`: pass non-default `OverfitWarningThresholds` → thresholds respected
   - For MetricSummary construction, use the fields from `backtesting/models.py`: total_trades, winning_trades, losing_trades, win_rate, total_net_pnl, total_return_pct, average_trade_return_pct, average_holding_period_bars, max_drawdown_pct, profit_factor, sharpe_ratio, sortino_ratio, final_equity.

## Must-Haves

- [ ] `detect_overfitting_warnings()` triggers on each of the 4 suspicious patterns and returns structured `EngineWarning` objects with descriptive codes and metric details
- [ ] `detect_fragility()` correctly identifies when the best grid cell is surrounded by poor neighbors, handling edge cells and variable grid dimensions
- [ ] `run_backtest()` now includes overfitting warning codes in its `warnings` list when metrics trigger thresholds
- [ ] `BacktestResultView.tsx` renders overfitting-coded warnings with distinct styling
- [ ] All test cases pass in `tests/test_overfitting.py`
- [ ] No regressions in existing `tests/test_backtest_engine.py`
- [ ] `cd frontend && npm run build` passes (no TypeScript or SSR errors)

## Verification

- `uv run pytest tests/test_overfitting.py -q` — all tests pass
- `uv run pytest tests/test_backtest_engine.py -q` — no regressions
- `cd frontend && npm run build` — passes

## Observability Impact

- Signals added: overfitting warning codes (`overfit_high_sharpe`, `overfit_high_profit_factor`, `overfit_high_winrate`, `overfit_smooth_equity`, `fragile_best_cell`) appear in `BacktestResult.warnings` and are propagated through the API `BacktestResponse.warnings` array
- How a future agent inspects this: `POST /api/backtest` with extreme parameters → check `response.warnings` for `overfit_*` codes; visually inspect `/backtest` page for orange/red overfitting alert banners
- Failure state exposed: if thresholds are miscalibrated, warnings will fire on normal results — test_healthy_metrics_no_warnings guards against this

## Inputs

- `src/statistical_arbitrage/backtesting/models.py` — existing `EngineWarning`, `MetricSummary`, `BacktestResult` model definitions
- `src/statistical_arbitrage/backtesting/engine.py` — existing `run_backtest()` function where overfitting detection must be wired in
- `src/statistical_arbitrage/backtesting/preflight.py` — existing `build_post_run_warnings()` pattern to follow
- `frontend/components/backtest/BacktestResultView.tsx` — existing warning rendering to extend

## Expected Output

- `src/statistical_arbitrage/backtesting/overfitting.py` — new module with `detect_overfitting_warnings()` and `detect_fragility()` pure functions
- `src/statistical_arbitrage/backtesting/models.py` — extended with `OverfitWarningThresholds` model
- `src/statistical_arbitrage/backtesting/engine.py` — `run_backtest()` now calls overfitting detector and includes its warnings
- `tests/test_overfitting.py` — new test file with 10+ test cases
- `frontend/components/backtest/BacktestResultView.tsx` — overfitting warnings render with distinct styling
