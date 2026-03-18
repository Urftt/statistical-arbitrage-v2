---
id: T01
parent: S03
milestone: M002
provides:
  - detect_overfitting_warnings() pure function with 4 heuristic rules
  - detect_fragility() pure function for grid-search neighbor analysis
  - OverfitWarningThresholds Pydantic model with tunable thresholds
  - Overfitting screening wired into run_backtest() pipeline
  - Distinct orange/red overfitting alert styling in BacktestResultView.tsx
key_files:
  - src/statistical_arbitrage/backtesting/overfitting.py
  - src/statistical_arbitrage/backtesting/models.py
  - src/statistical_arbitrage/backtesting/engine.py
  - frontend/components/backtest/BacktestResultView.tsx
  - tests/test_overfitting.py
key_decisions:
  - Overfitting detection uses 4 independent heuristic rules rather than a composite score — each fires a distinct warning code for clarity
  - Fragility uses 50% of best metric as the "poor neighbor" cutoff and >50% poor ratio as the trigger
patterns_established:
  - overfit_ warning code prefix convention for overfitting-related EngineWarning objects
  - OverfitWarningThresholds model allows per-call threshold customization (used by tests, available for future UI controls)
observability_surfaces:
  - overfit_high_sharpe, overfit_high_profit_factor, overfit_high_winrate, overfit_smooth_equity codes in BacktestResult.warnings
  - fragile_best_cell code available for grid search results (T02)
duration: 12min
verification_result: passed
completed_at: 2026-03-18
blocker_discovered: false
---

# T01: Build overfitting detector and wire into backtest engine

**Added overfitting detection with 4 heuristic rules and fragility detector, wired into run_backtest() pipeline with distinct frontend warning styling**

## What Happened

Created `backtesting/overfitting.py` with two pure functions:
- `detect_overfitting_warnings(metrics, trade_count, thresholds)` checks 4 patterns: high Sharpe (>3), high profit factor (>5 with <20 trades), high win rate (>85% with <10 trades), and suspiciously smooth equity (drawdown <1% with Sharpe >2). Each returns a structured `EngineWarning` with `overfit_*` code and metric details.
- `detect_fragility(cells, best_index, grid_shape)` analyzes n-dimensional grid neighbors of the best cell, flagging when >50% have <50% of the best metric. Handles edge cells, variable dimensions, and None metrics.

Added `OverfitWarningThresholds` Pydantic model to `models.py` for tunable thresholds. Wired `detect_overfitting_warnings()` into `engine.py` after `build_post_run_warnings()` so every `run_backtest()` call now screens for overfitting. Extended `BacktestResultView.tsx` `WarningList` to render `overfit_*` warnings with distinct orange styling, left border accent, and "⚠️ Overfitting Signal" title.

## Verification

- `uv run pytest tests/test_overfitting.py -q` → 21 passed
- `uv run pytest tests/test_backtest_engine.py -q` → 4 passed (no regressions)
- `uv run pytest tests/ -q` → 139 passed (full suite, zero regressions)
- `cd frontend && npm run build` → compiled successfully, all routes generated

### Slice-level verification (T01 — intermediate task):
- ✅ `uv run pytest tests/test_overfitting.py -q` — all pass
- ⏳ `tests/test_optimization.py`, `tests/test_walkforward.py`, `tests/test_optimization_api.py` — not yet created (T02-T04)
- ✅ `cd frontend && npm run build` — SSR/type gate passes
- ✅ `uv run pytest tests/ -q` — no regressions (139 passed)
- ⏳ E2E optimize tests — not yet created (T04)
- ⏳ API endpoint tests — not yet created (T02-T03)

## Diagnostics

- Overfitting warnings appear in `BacktestResult.warnings` with codes `overfit_high_sharpe`, `overfit_high_profit_factor`, `overfit_high_winrate`, `overfit_smooth_equity`
- `fragile_best_cell` is available for grid search (T02 will call `detect_fragility()`)
- Inspect via `POST /api/backtest` → check `response.warnings` for `overfit_*` codes
- Frontend: overfitting alerts render in orange with "⚠️ Overfitting Signal" title in the Runtime warnings section

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `src/statistical_arbitrage/backtesting/overfitting.py` — new module with `detect_overfitting_warnings()` and `detect_fragility()` pure functions
- `src/statistical_arbitrage/backtesting/models.py` — added `OverfitWarningThresholds` model
- `src/statistical_arbitrage/backtesting/engine.py` — wired overfitting detection into `run_backtest()` after post-run warnings
- `frontend/components/backtest/BacktestResultView.tsx` — extended WarningList to render overfit_* warnings with distinct orange styling
- `tests/test_overfitting.py` — 21 test cases covering all 4 heuristic rules, fragility detection, custom thresholds, edge cases
- `.gsd/milestones/M002/slices/S03/S03-PLAN.md` — marked T01 done, added failure-path verification step
