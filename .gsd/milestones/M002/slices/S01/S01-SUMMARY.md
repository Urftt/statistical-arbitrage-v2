---
id: S01
parent: M002
milestone: M002
provides:
  - First live cached-data research→backtest loop with a look-ahead-safe engine, directly postable recommendation handoff, and explicit trust diagnostics across success and blocked runs
requires: []
affects:
  - S02
  - S03
  - S04
key_files:
  - src/statistical_arbitrage/strategy/zscore_mean_reversion.py
  - src/statistical_arbitrage/backtesting/preflight.py
  - src/statistical_arbitrage/backtesting/engine.py
  - api/routers/research.py
  - api/routers/backtest.py
  - frontend/components/research/LookbackSweepPanel.tsx
  - frontend/app/(dashboard)/backtest/page.tsx
  - frontend/components/backtest/BacktestResultView.tsx
key_decisions:
  - D018: use trailing-window OLS hedge ratios/z-scores plus next-bar-close execution to keep the first backtest core look-ahead-safe with close-only candle data
  - D019: shape the research handoff as a fully valid nested BacktestRequest and keep blockers, warnings, and footer metadata in structured API payloads instead of exceptions
  - D020: encode the full research recommendation in /backtest URL search params so presets are shareable, refresh-safe, and directly inspectable
patterns_established:
  - The research→backtest contract is reuse-first: `recommended_backtest_params` is already a valid backtest request object, not a partial blob that needs adapter glue
  - Backtest trust surfaces are first-class UI states: blocked, warning, empty, and successful runs each render explicit product states instead of blank charts or silent failure
  - Browser/runtime verification of Mantine Select controls must confirm committed hidden values, not just visible typed text
observability_surfaces:
  - tests/test_backtest_engine.py
  - tests/test_backtest_api.py
  - POST /api/research/lookback-window → `recommended_backtest_params`
  - POST /api/backtest → `data_quality`, `warnings`, `footer`, `signal_overlay`, `trade_log`, `equity_curve`, `metrics`
  - /research recommendation card + CTA and /backtest blocked/success states
  - Direct localhost probes of blocker codes and footer sections against the running API
drill_down_paths:
  - .gsd/milestones/M002/slices/S01/tasks/T01-SUMMARY.md
  - .gsd/milestones/M002/slices/S01/tasks/T02-SUMMARY.md
  - .gsd/milestones/M002/slices/S01/tasks/T03-SUMMARY.md
duration: 5h35m
verification_result: passed
completed_at: 2026-03-17 23:05 CET
---

# S01: Backtest core + first connected research handoff

**S01 shipped the first real cached-data research→backtest loop: a look-ahead-safe engine, a directly postable recommendation contract, and a live React backtester that shows both completed and blocked runs honestly.**

## What Happened

This slice retired the main M002 risk in the narrowest useful way: one real research module now feeds one real backtest surface through a stable shared contract.

At the engine layer, S01 extracted a pure-Python z-score mean-reversion strategy and backtest core from the teaching flow, but tightened the execution model instead of copying the old helper logic. The engine now computes trailing-window hedge ratios and z-scores using only historically available data, emits signals at bar close, and executes them on the next bar's close. It returns strict Pydantic models for signals, trades, equity points, metrics, warnings, preflight diagnostics, and the honest-reporting footer. Preflight separates blockers from warnings, so short histories, null gaps, non-finite/impossible prices, and non-monotonic timestamps surface as structured data rather than generic failures.

At the API boundary, S01 added the first real research endpoint (`POST /api/research/lookback-window`) and the first real backtest endpoint (`POST /api/backtest`). The research endpoint runs the existing lookback sweep on cached parquet data and returns a `recommended_backtest_params` object that is already a valid nested `BacktestRequest`. The backtest endpoint reads parquet cache directly, runs the engine, and returns a stable envelope with `data_quality`, `warnings`, `footer`, `signal_overlay`, `trade_log`, `equity_curve`, `metrics`, and `spread_summary`. One environment issue surfaced during this work: the worktree-local `data/cache` directory was empty even though the shared repo cache existed, so `DataCacheManager` was updated to fall back to the repo-root cache when the worktree copy has no parquet files.

At the frontend layer, S01 turned that contract into the first live user loop. `/research` now runs the lookback-window sweep against the FastAPI backend, shows the takeaway plus a recommended preset, and deep-links the full recommendation into `/backtest`. `/backtest` hydrates its controls from URL params, reruns the live engine against edited settings, rewrites the URL on each run, and renders the result as a full trust report: metrics, data-quality status, blockers/warnings, equity curve, signal overlay, trade log, and honest-reporting footer. The blocked path is explicit too: when preflight fails, charts disappear by design and the page explains why.

## Verification

Passed contract gates:
- `uv run --extra dev python -m pytest tests/test_backtest_engine.py tests/test_backtest_api.py -q` → `11 passed`
- `cd frontend && npm run build` → passed

Passed live localhost verification on the running stack:
- Confirmed `/research` loads, accepts a real cached pair selection (`ETH/EUR × ETC/EUR`, `1h`), and runs the live lookback sweep
- Confirmed the research response renders its takeaway plus a `Use recommended settings` CTA
- Clicked the CTA and confirmed `/backtest` opens with the handed-off preset encoded in the URL, including `lookback_window=50`
- Reloaded `/backtest` and confirmed the controls hydrate from the URL again with committed `ETH`, `ETC`, `1h`, and `lookback_window=50` values ready for rerun
- Ran the live backtest and confirmed the completed result renders metrics, data-quality status, signal overlay, equity curve, trade log, and the honest-reporting footer container
- Confirmed the successful run exposed `72 trade log rows · 144 signal events` and the inline `No warnings raised` state
- Forced the deterministic blocked path with `days_back=7` and `lookback_window=500`, reran the backtest, and confirmed the UI showed `Blocked preflight`, `Charts hidden by design`, `0 trade log rows · 0 signal events`, blocker code `insufficient observations`, and explicit footer sections instead of silent failure
- Confirmed browser diagnostics remained clean (`no_failed_requests`, `no_console_errors`)

Passed direct runtime API probe:
- `POST /api/research/lookback-window` returned `recommended_result.window == 50` and `recommended_backtest_params.strategy.lookback_window == 50`
- Posting that recommendation to `POST /api/backtest` with the deterministic short-history override returned `status="blocked"`, blocker code `insufficient_observations`, and footer sections `execution_model`, `fee_model`, `data_basis`, `assumptions`, `limitations`

## Requirements Advanced

- R008 — The first live research module (lookback-window sweep) now runs from the React frontend against FastAPI, returns a structured result, shows a takeaway banner, and hands off a directly usable preset to the backtester. The remaining seven modules still belong to later slices.
- R015 — Research and backtest outputs now expose recommendation context, assumptions, warnings, data-quality state, and limitations together instead of burying them behind charts.
- R022 — The backtester now makes the execution model, fee model, data basis, assumptions, and limitations visible in the product, not just in code or tests.
- R023 — Backtest preflight now reports blocking data-quality issues inline through both the API and UI, but the requirement stays active because explicit regular-interval candle-gap detection still needs closing.

## Requirements Validated

- R009 — The platform now runs a real z-score mean-reversion strategy over historical cached data and returns structured equity, trade, and cumulative-return outputs through both the engine and live `/backtest` page.
- R010 — Backtest results now include and render Sharpe, Sortino, max drawdown, win rate, profit factor, and average holding period.
- R013 — Look-ahead safety is now architectural: trailing-window inputs only, signal at bar close, execution on next bar close, with deterministic tests proving the timing contract.

## New Requirements Surfaced

- none

## Requirements Invalidated or Re-scoped

- none

## Deviations

The slice plan did not call out data-layer work, but `src/statistical_arbitrage/data/cache_manager.py` had to be updated so worktree-local runs can fall back to the shared repo-root parquet cache when `data/cache` is empty in the worktree. Without that, the “real cached data” proof would have been fake in this environment.

## Known Limitations

- Only the lookback-window research module is live in the React Research page. The other seven research modules still need to be ported onto the shared result envelope.
- Preflight does not yet explicitly detect regular-interval timestamp gaps / missing candles; it catches nulls, non-finite values, impossible prices, short histories, and non-monotonic timestamps, but not a cleanly ordered series with missing intervals.
- Suspicious-result and overfitting visibility is still narrow. S01 surfaces trade-count/sample warnings and honest footer limitations, but the broader “too good to be true”, sensitivity, and walk-forward warnings remain S03 work.

## Follow-ups

- Port the remaining seven research modules onto the `recommended_backtest_params` contract and the same explicit loading/error/recommendation states in S02.
- Add explicit timeframe-gap / missing-candle detection to preflight before treating R023 as closed.
- Extend the existing warning/footer surfaces in S03 instead of inventing parallel trust-reporting payloads for optimization and walk-forward features.

## Files Created/Modified

- `src/statistical_arbitrage/strategy/zscore_mean_reversion.py` — pure trailing-window hedge-ratio/z-score builder plus next-bar signal extraction
- `src/statistical_arbitrage/backtesting/models.py` — strict serializable models for parameters, diagnostics, trades, equity, metrics, warnings, and footer metadata
- `src/statistical_arbitrage/backtesting/preflight.py` — reusable blocking/warning data-quality checks for trustworthy backtests
- `src/statistical_arbitrage/backtesting/engine.py` — fee-aware look-ahead-safe backtest runner with equity curve, trade ledger, metrics, warnings, and footer
- `api/routers/research.py` — parquet-backed lookback-window sweep endpoint plus recommended backtest handoff
- `api/routers/backtest.py` — live backtest execution endpoint with strict engine-to-API payload mapping
- `src/statistical_arbitrage/data/cache_manager.py` — repo-root parquet fallback for worktree runs with empty local cache
- `frontend/components/research/LookbackSweepPanel.tsx` — live research panel with takeaway banner and handoff CTA
- `frontend/app/(dashboard)/backtest/page.tsx` — URL-hydrated live backtest page with rerun/shareable preset behavior
- `frontend/components/backtest/BacktestResultView.tsx` — honest-reporting result surface for metrics, blockers, warnings, charts, trade log, and footer
- `frontend/lib/api.ts` — typed research/backtest contracts plus URL search-param handoff helper
- `frontend/components/layout/Sidebar.tsx` — navigation entrypoints for Research and Backtest

## Forward Intelligence

### What the next slice should know
- `recommended_backtest_params` is the canonical handoff seam now. Reuse it for every future research module instead of inventing per-module adapters or front-end-only preset shapes.
- `/backtest` treats the URL as the source of truth for presets. That makes the flow shareable, refresh-safe, and debuggable; S02/S03 should preserve that property.

### What's fragile
- Backtest preflight gap detection is still thinner than R023 wants — a strictly increasing series with missing regular intervals can slip through. That matters because later slices will broaden the pair/timeframe surface and make bad-data edge cases easier to hit.
- Mantine `Select` interactions are easy to misread in automation — visible typed text is not proof of committed selection state. Verify the committed value, especially when testing handoffs that depend on the shared pair context.

### Authoritative diagnostics
- `tests/test_backtest_engine.py` — this is the strongest proof for signal timing, fee math, trade accounting, and the anti-lookahead contract.
- `tests/test_backtest_api.py` — this is the strongest proof that the research recommendation and backtest request/response envelopes still fit together without UI glue.
- `/backtest` blocked-preflight state — this is the quickest runtime check that the trust surface still works when the engine refuses a run.

### What assumptions changed
- The worktree was assumed to have the same usable parquet cache layout as the main repo copy — in practice `data/cache` can be empty inside the worktree, so API/runtime code needed an explicit repo-root fallback.
- The pair selectors were assumed to be trivial textbox interactions during runtime verification — in practice they behave like real Mantine selects and need an explicit option commit before the shared state changes.
