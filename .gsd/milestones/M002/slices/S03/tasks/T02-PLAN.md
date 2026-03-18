---
estimated_steps: 6
estimated_files: 7
---

# T02: Build grid search engine with API endpoint and tests

**Slice:** S03 — Optimization, walk-forward, and overfitting visibility
**Milestone:** M002

## Description

Build the bounded multi-parameter grid search engine as a pure-Python orchestration layer on top of `run_backtest()`, then expose it through a FastAPI endpoint. The grid search runner sweeps parameter combinations, collects per-cell metrics, identifies the best cell, computes a robustness score, and applies fragility detection from T01. This delivers R011 (multi-parameter optimization with honest reporting) and provides the reusable `run_grid_search()` function that walk-forward (T03) will call for train-window optimization.

## Steps

1. **Add grid search models to `backtesting/models.py`:**
   - `ParameterAxis(BacktestModel)`: `name: str` (must be a valid `StrategyParameters` field), `min_value: float`, `max_value: float`, `step: float`. Add a validator that `min_value < max_value` and `step > 0`.
   - `GridSearchCell(BacktestModel)`: `params: dict[str, float]` (axis name → value), `metrics: MetricSummary`, `trade_count: int`, `status: Literal["ok", "blocked", "no_trades"]`.
   - `GridSearchResult(BacktestModel)`: `cells: list[GridSearchCell]`, `grid_shape: list[int]` (per-axis dimension count), `axes: list[ParameterAxis]`, `best_cell_index: int | None`, `best_cell: GridSearchCell | None`, `optimize_metric: str`, `total_combinations: int`, `robustness_score: float | None` (fraction of best-cell neighbors within 80% of best metric), `warnings: list[EngineWarning]`, `execution_time_ms: float`.

2. **Create `src/statistical_arbitrage/backtesting/optimization.py`** with:
   - `run_grid_search(timestamps, prices1, prices2, axes: list[ParameterAxis], base_params: StrategyParameters, optimize_metric: str = "sharpe_ratio", max_combinations: int = 500) → GridSearchResult`
   - Implementation: (a) Generate all parameter combinations from the axes using `itertools.product` over `numpy.arange(axis.min, axis.max + step/2, step)` for each axis. (b) If total combos > `max_combinations`, raise `ValueError` with a descriptive message. (c) For each combo: copy `base_params`, override the axis fields, call `run_backtest()`. (d) Collect cells into a flat list. (e) Find the best cell by the `optimize_metric` field (skip cells with no trades or blocked status; handle `None` metric values). (f) If a best cell exists, compute robustness score: fraction of neighbor cells whose metric is ≥ 80% of best. Use `detect_fragility()` from T01 for the fragility warning. (g) Run `detect_overfitting_warnings()` on the best cell's metrics and add to warnings. (h) Return `GridSearchResult`.
   - Helper: `_get_metric_value(metrics: MetricSummary, metric_name: str) → float | None` to extract a named metric field.
   - Important: The function must handle zero-trade combos (status `"no_trades"`) and blocked combos (status `"blocked"`) without crashing. Cells with `None` for the optimize metric are excluded from best-cell selection.

3. **Add API schemas to `api/schemas.py`:**
   - `ParameterAxisPayload(BaseModel)`: mirrors `ParameterAxis`
   - `GridSearchCellPayload(BaseModel)`: mirrors `GridSearchCell`
   - `GridSearchRequest(BaseModel)`: `asset1`, `asset2`, `timeframe`, `days_back`, `axes: list[ParameterAxisPayload]`, `base_strategy: StrategyParametersPayload` (with default factory), `optimize_metric: str = "sharpe_ratio"`, `max_combinations: int = 500`
   - `GridSearchResponse(BaseModel)`: `grid_shape`, `axes`, `cells: list[GridSearchCellPayload]`, `best_cell_index`, `best_cell`, `optimize_metric`, `total_combinations`, `robustness_score`, `warnings: list[EngineWarningPayload]`, `execution_time_ms`, `footer: HonestReportingFooterPayload`, `recommended_backtest_params: BacktestRequest | None`

4. **Create `api/routers/optimization.py`:**
   - Import `_load_pair_data` and `_get_cache_mgr` from `api.routers.analysis`.
   - `POST /api/optimization/grid-search`: load pair data via `_load_pair_data()`, convert axes/params from API types to engine types, call `run_grid_search()`, build the response. If the best cell exists, build a `recommended_backtest_params` BacktestRequest with those params. Return a 422 if `ValueError` (too many combos) is raised. Log execution time.
   - Include CORS-safe error handling: `ValueError` → 422, data not found → 404, other exceptions → 500 with `logger.exception`.

5. **Register the router in `api/main.py`:** Import `from api.routers import optimization` and add `application.include_router(optimization.router)`.

6. **Write tests:**
   - `tests/test_optimization.py`:
     - `test_grid_search_correct_cell_count`: 3 entry × 3 exit = 9 cells
     - `test_grid_search_best_cell_identification`: best cell has highest Sharpe
     - `test_grid_search_max_combo_guard`: axes that produce > 500 combos → ValueError
     - `test_grid_search_handles_zero_trade_combos`: combo with extreme threshold → status "no_trades", not crash
     - `test_grid_search_robustness_score`: known grid → expected score
     - `test_grid_search_single_axis`: 1D sweep works correctly
     - Use synthetic or fixture data (generate prices with `numpy` — 500+ bars, positively correlated with some noise). Import `StrategyParameters` and `ParameterAxis` from models.
   - `tests/test_optimization_api.py`:
     - `test_grid_search_endpoint_returns_200`: POST with valid axes → 200 + correct response shape
     - `test_grid_search_endpoint_too_many_combos_422`: POST with very large axes → 422
     - These tests need the FastAPI test client and real cached data. Follow the pattern in `tests/test_backtest_api.py`: use `TestClient(app)` from the `api.main` app.

## Must-Haves

- [ ] `run_grid_search()` produces the correct number of cells for given axes
- [ ] Best cell is correctly identified by the optimize metric
- [ ] Max combination guard prevents runaway computation (raises ValueError above limit)
- [ ] Zero-trade and blocked combos are handled gracefully
- [ ] Robustness score is computed as fraction of neighbors ≥ 80% of best metric
- [ ] Fragility warnings from T01 are included when applicable
- [ ] API endpoint returns structured `GridSearchResponse` with footer and recommended params
- [ ] Router registered in `api/main.py`
- [ ] All tests pass

## Verification

- `uv run pytest tests/test_optimization.py tests/test_optimization_api.py -q` — all pass
- `uv run pytest tests/ -q` — no regressions

## Observability Impact

- Signals added: `execution_time_ms` in grid search response; `total_combinations` for cost tracking; `fragile_best_cell` and `overfit_*` warnings in response
- How a future agent inspects this: POST to `/api/optimization/grid-search` with a known pair → check `total_combinations`, `best_cell`, `robustness_score`, and `warnings` in the response
- Failure state exposed: 422 with descriptive message when max combos exceeded; `status: "no_trades"` / `status: "blocked"` per-cell when individual combos fail

## Inputs

- `src/statistical_arbitrage/backtesting/overfitting.py` — T01's `detect_overfitting_warnings()` and `detect_fragility()` functions
- `src/statistical_arbitrage/backtesting/models.py` — T01's `OverfitWarningThresholds` plus existing `StrategyParameters`, `MetricSummary`, `EngineWarning`, `BacktestResult`
- `src/statistical_arbitrage/backtesting/engine.py` — `run_backtest()` is the inner loop
- `api/routers/analysis.py` — `_load_pair_data()` and `_get_cache_mgr()` helpers for the API endpoint
- `api/schemas.py` — existing payload patterns to follow
- `api/main.py` — router registration location
- `tests/test_backtest_api.py` — pattern for API contract tests using `TestClient`

## Expected Output

- `src/statistical_arbitrage/backtesting/optimization.py` — new module with `run_grid_search()`
- `src/statistical_arbitrage/backtesting/models.py` — extended with `ParameterAxis`, `GridSearchCell`, `GridSearchResult`
- `api/schemas.py` — extended with grid search request/response schemas
- `api/routers/optimization.py` — new router with `POST /api/optimization/grid-search`
- `api/main.py` — optimization router registered
- `tests/test_optimization.py` — unit tests for grid search engine
- `tests/test_optimization_api.py` — API contract tests for grid search endpoint
