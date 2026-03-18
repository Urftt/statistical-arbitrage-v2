---
id: T02
parent: S03
milestone: M002
provides:
  - run_grid_search() pure function for bounded multi-parameter optimization over run_backtest()
  - ParameterAxis, GridSearchCell, GridSearchResult models in backtesting/models.py
  - POST /api/optimization/grid-search endpoint with structured request/response
  - GridSearchRequest/GridSearchResponse API schemas
key_files:
  - src/statistical_arbitrage/backtesting/optimization.py
  - src/statistical_arbitrage/backtesting/models.py
  - api/schemas.py
  - api/routers/optimization.py
  - api/main.py
  - tests/test_optimization.py
  - tests/test_optimization_api.py
key_decisions:
  - Robustness score uses 80% of best metric as neighbor threshold (fraction of neighbors at ≥80% of best)
  - _compute_robustness imports flat↔nd helpers from overfitting.py to share grid coordinate logic
patterns_established:
  - optimization.py follows same pure-function pattern as overfitting.py — no IO, no Dash, reusable by walk-forward
  - API router at /api/optimization/ prefix — walk-forward endpoint (T03) will be added to same router
observability_surfaces:
  - POST /api/optimization/grid-search response contains total_combinations, robustness_score, warnings (overfit_* and fragile_best_cell codes), execution_time_ms
  - 422 response with descriptive message when max_combinations exceeded
  - per-cell status field: ok/blocked/no_trades for individual combo diagnosis
duration: ~20min
verification_result: passed
completed_at: 2026-03-18
blocker_discovered: false
---

# T02: Build grid search engine with API endpoint and tests

**Added bounded multi-parameter grid search engine with API endpoint, robustness scoring, fragility/overfitting integration, and 14 tests**

## What Happened

Built the grid search optimization layer in 6 steps per plan:

1. Added `ParameterAxis`, `GridSearchCell`, `GridSearchResult` models to `models.py` with a `model_validator` ensuring `min_value < max_value` and `step > 0`.

2. Created `optimization.py` with `run_grid_search()` that: generates parameter combos via `itertools.product` over `numpy.arange` per axis, enforces `max_combinations` guard, runs `run_backtest()` per combo, collects cells with `ok/blocked/no_trades` status, finds best cell by optimize metric, computes robustness score (fraction of neighbors ≥80% of best), calls `detect_fragility()` and `detect_overfitting_warnings()` from T01, and returns `GridSearchResult` with `execution_time_ms`.

3. Added `ParameterAxisPayload`, `GridSearchCellPayload`, `GridSearchRequest`, `GridSearchResponse` API schemas to `schemas.py`.

4. Created `api/routers/optimization.py` with `POST /api/optimization/grid-search` endpoint — loads pair data, converts types, calls engine, builds response with footer and `recommended_backtest_params` linking to `/api/backtest`.

5. Registered the optimization router in `api/main.py`.

6. Wrote 10 unit tests in `test_optimization.py` and 4 API contract tests in `test_optimization_api.py`.

## Verification

- `uv run pytest tests/test_optimization.py -q` — 10 passed
- `uv run pytest tests/test_optimization_api.py -q` — 4 passed
- `uv run pytest tests/ -q` — 153 passed, no regressions
- `uv run pytest tests/test_overfitting.py tests/test_optimization.py tests/test_optimization_api.py -q` — 35 passed (slice-level check)

Slice-level verification status (T02 is intermediate — not all checks apply yet):
- ✅ `tests/test_overfitting.py tests/test_optimization.py tests/test_optimization_api.py` — pass
- ⬜ `tests/test_walkforward.py` — T03 (not yet created)
- ⬜ `cd frontend && npm run build` — T04
- ⬜ E2E tests — T04
- ✅ `POST /api/optimization/grid-search` returns correct response shape
- ⬜ `POST /api/optimization/walk-forward` — T03
- ✅ `POST /api/backtest` overfitting warnings — T01 verified
- ✅ `uv run pytest tests/ -q` — no regressions (153 passed)

## Diagnostics

- POST `/api/optimization/grid-search` with valid axes → check `total_combinations`, `best_cell`, `robustness_score`, `warnings` in response
- POST with axes producing >500 combos → 422 with "exceeds the limit" message
- Inspect individual cell `status` field: `ok`, `blocked`, `no_trades`
- `recommended_backtest_params` in response can be posted directly to `/api/backtest`
- Warning codes in response: `fragile_best_cell`, `overfit_high_sharpe`, `overfit_high_profit_factor`, `overfit_high_winrate`, `overfit_smooth_equity`

## Deviations

None — implementation follows the plan exactly.

## Known Issues

None.

## Files Created/Modified

- `src/statistical_arbitrage/backtesting/models.py` — added ParameterAxis, GridSearchCell, GridSearchResult models with model_validator
- `src/statistical_arbitrage/backtesting/optimization.py` — new module with run_grid_search() pure function
- `api/schemas.py` — added ParameterAxisPayload, GridSearchCellPayload, GridSearchRequest, GridSearchResponse
- `api/routers/optimization.py` — new router with POST /api/optimization/grid-search
- `api/main.py` — registered optimization router
- `tests/test_optimization.py` — 10 unit tests for grid search engine
- `tests/test_optimization_api.py` — 4 API contract tests for grid search endpoint
