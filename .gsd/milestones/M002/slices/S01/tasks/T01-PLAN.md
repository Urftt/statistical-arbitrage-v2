---
estimated_steps: 6
estimated_files: 5
---

# T01: Build the look-ahead-safe strategy and backtest core with deterministic fixtures

**Slice:** S01 — Backtest core + first connected research handoff
**Milestone:** M002

## Description

Implement the pure-Python engine that every later M002 surface depends on. This task extracts the reusable z-score mean-reversion logic from the teaching flow, wraps it in typed backtest/preflight/result models, and locks the behavior down with deterministic pytest fixtures before any API or UI wiring starts.

The critical constraint is trust: the engine must be look-ahead-safe by construction, fee-aware, and explicit about limitations. S01 does not need optimization yet, but it does need honest outputs the UI can display without inventing interpretation later.

**Relevant skill:** `test`

## Steps

1. Create typed, serializable domain models in `src/statistical_arbitrage/backtesting/models.py` for strategy parameters, trade ledger rows, equity points, metric summary, data-quality report, warnings, and honest-reporting footer metadata.
2. Extract the z-score mean-reversion signal state machine into `src/statistical_arbitrage/strategy/zscore_mean_reversion.py`, keeping it Dash-free and Polars-friendly. Signals should be generated from data available at bar close and executed on the next bar so the implementation cannot peek ahead.
3. Implement reusable preflight checks in `src/statistical_arbitrage/backtesting/preflight.py` that distinguish blocking issues from warnings (for example: insufficient overlapping candles, warmup shorter than lookback, null gaps, non-monotonic timestamps, impossible prices, or too few trades to trust the result).
4. Implement `src/statistical_arbitrage/backtesting/engine.py` to join the signal engine, fee-aware position accounting, equity-curve generation, trade log creation, performance metrics, and footer metadata into one result object.
5. Add `tests/test_backtest_engine.py` with deterministic fixtures that assert long/short entries and exits, trade P&L after fees, metrics/equity progression, preflight blocking behavior, and warning/footer fields for fragile or suspicious runs.
6. Run the targeted pytest file and tighten the model fields until the output shape is ready for the API layer without extra conversion glue.

## Must-Haves

- [ ] No Dash imports; all strategy/backtesting code stays pure Python and reusable
- [ ] Signal execution timing is look-ahead-safe and explicitly covered by tests
- [ ] Preflight distinguishes blocking issues from non-blocking warnings
- [ ] Backtest result includes trades, equity curve, metrics, warnings, and honest-reporting metadata
- [ ] `tests/test_backtest_engine.py` proves deterministic behavior instead of snapshotting opaque blobs

## Verification

- `uv run pytest tests/test_backtest_engine.py -q`
- Confirm at least one test covers a blocking preflight case and at least one test covers fee-adjusted trade/accounting behavior

## Observability Impact

- Signals added/changed: explicit preflight status, blocking reasons, suspicious-result warnings, and footer assumptions/limitations become first-class engine outputs
- How a future agent inspects this: run `uv run pytest tests/test_backtest_engine.py -q` and read the failing assertion for the exact engine stage (signal timing, ledger accounting, metrics, or preflight)
- Failure state exposed: the engine returns a structured blocking/warning breakdown instead of a generic exception or empty result

## Inputs

- `src/statistical_arbitrage/app/pages/learn.py` — current teaching-flow signal logic to extract and harden
- `config/settings.py` — existing default strategy parameters (lookback, thresholds, capital, fees)
- `src/statistical_arbitrage/analysis/cointegration.py` — existing spread/z-score conventions to stay consistent with
- `tests/test_research_modules.py` — existing pytest style and assertion patterns to mirror

## Expected Output

- `src/statistical_arbitrage/strategy/zscore_mean_reversion.py` — reusable strategy logic with no UI dependencies
- `src/statistical_arbitrage/backtesting/models.py` — serializable models for results and diagnostics
- `src/statistical_arbitrage/backtesting/preflight.py` — blocking/warning checks for backtest eligibility
- `src/statistical_arbitrage/backtesting/engine.py` — end-to-end backtest runner built on the extracted strategy
- `tests/test_backtest_engine.py` — deterministic regression tests for the new engine
