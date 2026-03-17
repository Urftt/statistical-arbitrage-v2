---
id: T01
parent: S01
milestone: M002
provides:
  - Look-ahead-safe pure-Python backtest core with typed result models, structured preflight diagnostics, fee-aware trade accounting, and deterministic regression coverage
key_files:
  - src/statistical_arbitrage/backtesting/models.py
  - src/statistical_arbitrage/strategy/zscore_mean_reversion.py
  - src/statistical_arbitrage/backtesting/preflight.py
  - src/statistical_arbitrage/backtesting/engine.py
  - tests/test_backtest_engine.py
  - tests/test_backtest_api.py
key_decisions:
  - D018: use trailing-window OLS hedge ratios/z-scores and next-bar-close execution to keep the first backtest core look-ahead-safe with close-only candle data
patterns_established:
  - Pydantic backtest envelopes with explicit blockers/warnings/footer metadata instead of raising generic exceptions
  - Deterministic price fixtures that assert signal timing, fee math, and equity progression directly rather than snapshotting opaque result blobs
observability_surfaces:
  - tests/test_backtest_engine.py
  - run_backtest(...).preflight.blockers / preflight.warnings / warnings / footer
  - uv run --extra dev python -m pytest tests/test_backtest_engine.py -q
  - direct runtime probe of warning codes and blocking codes via run_backtest(...)
duration: 1h25m
verification_result: passed
completed_at: 2026-03-17 22:09 CET
blocker_discovered: false
---

# T01: Build the look-ahead-safe strategy and backtest core with deterministic fixtures

**Added a look-ahead-safe backtest engine with typed outputs, structured diagnostics, honest-reporting metadata, and deterministic fee/accounting tests.**

## What Happened

I created strict Pydantic backtest models in `src/statistical_arbitrage/backtesting/models.py` so the engine now returns API-ready results without extra conversion glue. Those models cover parameters, signal events, trade ledger rows, equity points, metric summaries, preflight/data-quality status, warnings, and the honest-reporting footer.

I extracted the reusable strategy logic into `src/statistical_arbitrage/strategy/zscore_mean_reversion.py`, but hardened it beyond the teaching-flow helper: instead of using a full-sample hedge ratio, it now computes trailing-window OLS hedge ratios and z-scores bar by bar, using only information available through each signal bar. Signals are recorded at bar close and carry `execution_index = signal_index + 1`, so execution timing is explicitly next-bar and testable.

I added `src/statistical_arbitrage/backtesting/preflight.py` to separate blockers from non-blocking warnings. The engine now returns structured blocking reasons for length mismatches, too-short histories, null gaps, impossible/non-finite prices, and non-monotonic timestamps, plus softer warnings for limited post-warmup samples, too few trades, terminal signal drops, and open positions left unrealized at the end.

I implemented `src/statistical_arbitrage/backtesting/engine.py` to join strategy data generation, signal extraction, fee-aware pair accounting, equity-curve generation, trade log creation, summary metrics, and footer metadata into one `BacktestResult`. Fees are charged on both legs at entry and exit using traded notional, and open trades are not silently force-closed on the last bar.

I added deterministic regression coverage in `tests/test_backtest_engine.py`. The tests assert next-bar execution timing, long and short round trips, explicit fee-adjusted P&L math, equity progression, blocking preflight behavior, and warning/footer fields for fragile runs. I also added a skipped `tests/test_backtest_api.py` placeholder because the slice-level verification references that file even though the actual API work lands in T02.

## Verification

Passed:
- `uv run --extra dev python -m pytest tests/test_backtest_engine.py -q`
- `uv run --extra dev python -m pytest tests/test_backtest_engine.py tests/test_backtest_api.py -q` → `4 passed, 1 skipped`
- `uv run --extra dev ruff check src/statistical_arbitrage/backtesting src/statistical_arbitrage/strategy tests/test_backtest_engine.py tests/test_backtest_api.py`

Direct runtime observability probe passed:
- Successful run exposed warning codes `limited_post_warmup_sample`, `too_few_trades`, and `dropped_terminal_signals`
- Blocking run exposed preflight blocker code `insufficient_observations`
- Footer execution model explicitly states next-bar-close execution

Slice-level verification status after T01:
- `npm --prefix frontend run build` failed with `sh: next: command not found` in this worktree because frontend dependencies are not currently installed
- Live API + frontend browser flow was not executed in T01 because the backtest API/UI wiring belongs to T02/T03

## Diagnostics

To inspect this task later:
- Run `uv run --extra dev python -m pytest tests/test_backtest_engine.py -q`
- Inspect `run_backtest(...).preflight` for blocking/warning breakdowns
- Inspect `run_backtest(...).warnings` for suspicious-result/runtime warnings
- Inspect `run_backtest(...).footer` for execution assumptions and limitations
- Read `tests/test_backtest_engine.py` to see the deterministic signal-timing, accounting, metric, and preflight expectations

## Deviations

- Added `tests/test_backtest_api.py` as a skipped placeholder even though the task plan only required engine tests, because the slice-level verification command already references that file path and T02 is responsible for the real API coverage.

## Known Issues

- `npm --prefix frontend run build` currently fails in this worktree with `next: command not found`; the frontend package dependencies need to be installed before the slice-level frontend verification can pass.
- The localhost API/frontend handoff verification remains pending until T02/T03 implement the backtest API contract and React backtester flow.

## Files Created/Modified

- `src/statistical_arbitrage/backtesting/models.py` — strict serializable models for params, diagnostics, trades, equity, metrics, warnings, and footer metadata
- `src/statistical_arbitrage/strategy/zscore_mean_reversion.py` — pure trailing-window hedge-ratio/z-score builder plus next-bar signal extraction
- `src/statistical_arbitrage/backtesting/preflight.py` — reusable blocking/warning data-quality checks and post-run warning generation
- `src/statistical_arbitrage/backtesting/engine.py` — end-to-end backtest runner with fee-aware accounting, equity curve, metrics, and honest-reporting footer
- `src/statistical_arbitrage/backtesting/__init__.py` — package exports for the new backtesting surface
- `src/statistical_arbitrage/strategy/__init__.py` — package exports for the new strategy helpers
- `tests/test_backtest_engine.py` — deterministic regression tests for signal timing, accounting, metrics, preflight, and warnings/footer
- `tests/test_backtest_api.py` — skipped placeholder so slice-level verification resolves the future API test path
- `.gsd/KNOWLEDGE.md` — added the `uv run --extra dev python -m pytest ...` verification gotcha
