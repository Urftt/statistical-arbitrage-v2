---
id: T03
parent: S03
milestone: M002
provides:
  - run_walk_forward() pure function for rolling train/test validation over run_grid_search() and run_backtest()
  - WalkForwardFold, WalkForwardResult models in backtesting/models.py
  - POST /api/optimization/walk-forward endpoint with structured request/response
  - WalkForwardRequest/WalkForwardResponse/WalkForwardFoldPayload schemas in api/schemas.py
key_files:
  - src/statistical_arbitrage/backtesting/walkforward.py
  - src/statistical_arbitrage/backtesting/models.py
  - api/schemas.py
  - api/routers/optimization.py
  - tests/test_walkforward.py
key_decisions:
  - Stability verdict uses train-test divergence ratio (test Sharpe / train Sharpe): >=0.5 stable, 0.25-0.5 moderate, <0.25 fragile; requires >=3 valid folds or defaults to fragile
  - Walk-forward recommended_backtest_params only populated for stable/moderate verdicts — fragile results get None to avoid recommending unreliable params
  - Fold windowing uses advancing start positions with step = (N - min_window) / (fold_count - 1), where min_window = 2 * (lookback_window + 10)
patterns_established:
  - wf_ warning code prefix convention for walk-forward-related EngineWarning objects (wf_train_test_divergence, wf_zero_test_trades, wf_insufficient_valid_folds, wf_short_test_window, wf_fold_skipped)
  - Walk-forward reuses run_grid_search() for train optimization and run_backtest() for test evaluation — pure orchestration, no new computation
observability_surfaces:
  - POST /api/optimization/walk-forward → check stability_verdict, folds[].status, train_test_divergence, warnings
  - Walk-forward logger.info with fold count, verdict, divergence, and execution time
  - Per-fold status codes: ok, no_train_trades, no_test_trades, blocked
duration: 20min
verification_result: passed
completed_at: 2026-03-18
blocker_discovered: false
---

# T03: Build walk-forward engine with API endpoint and tests

**Added walk-forward validation engine with rolling train/test windows, stability verdict, API endpoint, and 11 passing tests**

## What Happened

Built the walk-forward validation engine as a pure orchestration layer over T02's `run_grid_search()` and `run_backtest()`. The engine:

1. **Models** (`models.py`): Added `WalkForwardFold` (per-fold train/test indices, metrics, status) and `WalkForwardResult` (aggregate summary with divergence ratio, stability verdict, warnings).

2. **Engine** (`walkforward.py`): `run_walk_forward()` slices data into rolling windows with advancing start positions. Each fold runs grid search on its train window, extracts best params, evaluates on a non-overlapping test window. Aggregates mean test/train Sharpe, computes divergence ratio, and classifies as stable/moderate/fragile. Emits warnings for short test windows, zero test trades, insufficient valid folds, and high divergence.

3. **API schemas** (`schemas.py`): `WalkForwardRequest` (pair, axes, fold_count, train_pct), `WalkForwardResponse` (folds, aggregate metrics, verdict, footer), `WalkForwardFoldPayload`.

4. **API endpoint** (`optimization.py`): `POST /api/optimization/walk-forward` on the shared optimization router. Converts API types to engine types, handles ValueError→422, includes honest-reporting footer, populates `recommended_backtest_params` only for stable/moderate verdicts.

5. **Tests** (`test_walkforward.py`): 11 tests covering temporal ordering, correct fold count, no data leak, per-fold metrics, aggregate summary, stability verdicts (fragile + stable scenarios), short test window warnings, input validation, and execution time.

## Verification

- `uv run pytest tests/test_walkforward.py -v` — 11/11 passed
- `uv run pytest tests/test_overfitting.py tests/test_optimization.py tests/test_walkforward.py tests/test_optimization_api.py -q` — 42 passed (slice-level check)
- `uv run pytest tests/ -q` — 164 passed, 0 failed (full suite, no regressions)

### Slice-level verification status (T03 is intermediate, T04 remains):
- ✅ `uv run pytest tests/test_overfitting.py tests/test_optimization.py tests/test_walkforward.py tests/test_optimization_api.py -q` — all pass
- ⏳ `cd frontend && npm run build` — requires T04 frontend work
- ✅ `uv run pytest tests/ -q` — no regressions
- ⏳ `cd frontend && REUSE_SERVERS=1 npm run test:e2e` — requires T04 frontend work
- ⏳ `POST /api/optimization/walk-forward` live test — requires cached data / running server
- ⏳ `/optimize` page with Walk-Forward tab — requires T04

## Diagnostics

- `POST /api/optimization/walk-forward` with a pair and axes → check `stability_verdict`, `train_test_divergence`, `folds[].status`, and `warnings` in response
- Walk-forward logs: `Walk-forward complete: N folds, train_pct=X, verdict=Y, divergence=Z, Tms`
- Per-fold `status` field reveals individual fold health: `ok`, `no_train_trades`, `no_test_trades`, `blocked`
- Warning codes: `wf_train_test_divergence`, `wf_zero_test_trades`, `wf_insufficient_valid_folds`, `wf_short_test_window`, `wf_fold_skipped`
- 422 error for `fold_count < 2` or `train_pct` outside 0.3–0.9

## Deviations

None — implementation follows the plan exactly.

## Known Issues

None.

## Files Created/Modified

- `src/statistical_arbitrage/backtesting/walkforward.py` — new: walk-forward engine with `run_walk_forward()`
- `src/statistical_arbitrage/backtesting/models.py` — extended with `WalkForwardFold`, `WalkForwardResult`
- `api/schemas.py` — extended with `WalkForwardRequest`, `WalkForwardResponse`, `WalkForwardFoldPayload`
- `api/routers/optimization.py` — extended with `POST /api/optimization/walk-forward` endpoint + footer
- `tests/test_walkforward.py` — new: 11 unit tests for walk-forward engine
