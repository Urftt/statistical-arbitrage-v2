# S01: Backtest core + first connected research handoff

**Goal:** Ship the first trustworthy research-to-backtest loop: one real research module runs on cached data, returns a recommendation in a shared envelope, and hands the user directly into a real backtest powered by a look-ahead-safe engine.
**Demo:** Open `/research`, run the lookback-window sweep on a real cached pair, click **Use recommended settings**, land on `/backtest` with the pair/timeframe/parameters prefilled, run the backtest, and see equity curve, signal overlay, trade log, metrics, data-quality status, warnings, and an honest-reporting footer.

Backtesting correctness and handoff integrity are the main risks in M002, so this slice is ordered to prove trust before breadth: first freeze the engine behavior with deterministic fixtures, then expose a stable API contract, then wire the first real React flow. The first connected module is the lookback-window sweep because it maps directly to the strategy’s rolling z-score window and can recommend a full backtest preset without waiting for the other seven modules.

## Must-Haves

- Pure-Python strategy/backtesting core that is look-ahead-safe by construction, fee-aware, serializable, and able to distinguish blocking data-quality issues from non-blocking warnings
- Shared FastAPI research/backtest envelopes that include recommendation payload, parameter snapshot, sample size, date range, fee assumption, warnings, confidence qualifier, and limitations
- First real research module (lookback-window sweep) callable from the React Research page, with a one-click handoff that deep-links the recommendation into the Backtester
- React Backtester page rendering completed results from the live API: equity curve, signal overlay, trade log, metrics, data-quality report, warnings, and honest-reporting footer

## Proof Level

- This slice proves: integration
- Real runtime required: yes
- Human/UAT required: yes

## Verification

- `uv run pytest tests/test_backtest_engine.py tests/test_backtest_api.py -q`
- `cd frontend && npm run build`
- Start `uv run python run_api.py` and `cd frontend && npm run dev`, open `/research`, run the lookback-window sweep on a cached pair, click the recommendation CTA, confirm `/backtest` opens with matching pair/timeframe/lookback defaults, then run the backtest and confirm equity curve, trade log, metrics, warnings, data-quality report, and honest-reporting footer all render from the live API
- Failure path: on `/backtest`, choose a history window shorter than the selected lookback/warmup requirement (or another deterministic blocking preflight case surfaced by the UI) and confirm the page shows a blocking data-quality state instead of empty charts or a silent failure

## Observability / Diagnostics

- Runtime signals: backtest responses expose explicit preflight status/blockers/warnings plus honest-reporting fields; research responses expose takeaway text and `recommended_backtest_params`
- Inspection surfaces: `tests/test_backtest_engine.py`, `tests/test_backtest_api.py`, FastAPI `/docs`, browser network logs, `/research` recommendation state, and `/backtest` warning/data-quality panels
- Failure visibility: blocking preflight issues, zero-trade/suspicious-result warnings, and last API error must all be visible inline rather than hidden in console-only output
- Redaction constraints: only public parquet-backed market data and parameter values may be shown; do not surface Bitvavo credentials if present in config

## Integration Closure

- Upstream surfaces consumed: `src/statistical_arbitrage/analysis/research.py`, `src/statistical_arbitrage/analysis/cointegration.py`, cached parquet conventions in `src/statistical_arbitrage/data/cache_manager.py`, existing FastAPI composition in `api/main.py` / `api/schemas.py`, and frontend pair context/api client surfaces in `frontend/contexts/PairContext.tsx` and `frontend/lib/api.ts`
- New wiring introduced in this slice: reusable strategy/backtest engine, new FastAPI research/backtest routers, and a deep-linkable React `/research` → `/backtest` handoff
- What remains before the milestone is truly usable end-to-end: the other 7 research modules (S02) and optimization/walk-forward robustness surfaces (S03)

## Tasks

- [x] **T01: Build the look-ahead-safe strategy and backtest core with deterministic fixtures** `est:1h15m`
  - Why: This is the trust-critical foundation for the entire milestone. If trade generation, fee accounting, or data-quality gating are wrong, every downstream research conclusion becomes misleading.
  - Files: `src/statistical_arbitrage/strategy/zscore_mean_reversion.py`, `src/statistical_arbitrage/backtesting/models.py`, `src/statistical_arbitrage/backtesting/preflight.py`, `src/statistical_arbitrage/backtesting/engine.py`, `tests/test_backtest_engine.py`
  - Do: Extract a reusable z-score mean-reversion strategy from the teaching flow into pure Python, define typed result/trade/preflight models, and implement the backtest engine so signals are generated from information available at bar close and executed on the next bar to prevent look-ahead. Add fee-aware trade accounting, equity-curve/metrics generation, confidence + limitation metadata, suspicious-result warnings, and deterministic pytest coverage for signals, ledger correctness, preflight blocking, and honest-reporting fields. Relevant skill: `test`.
  - Verify: `uv run pytest tests/test_backtest_engine.py -q`
  - Done when: the engine returns a serializable backtest result with trades, metrics, warnings, and footer metadata, and the deterministic engine tests pass
- [x] **T02: Expose the first research + backtest API contract and recommendation handoff** `est:1h`
  - Why: S01 must prove a stable boundary between the pure-Python engine and the UI. The first research module only becomes useful when its recommendation is already shaped like a valid backtest request.
  - Files: `api/schemas.py`, `api/routers/research.py`, `api/routers/backtest.py`, `api/main.py`, `tests/test_backtest_api.py`
  - Do: Add explicit Pydantic schemas for the shared result envelope, implement a real lookback-window sweep endpoint that wraps existing research logic and emits `recommended_backtest_params`, implement a backtest endpoint that reads parquet cache directly and returns equity curve/trade log/signal overlay/metrics/preflight/footer, and register both routers in FastAPI. Add API tests that prove schema shape, recommendation-to-backtest compatibility, and blocking-preflight behavior. Relevant skill: `test`.
  - Verify: `uv run pytest tests/test_backtest_api.py -q`
  - Done when: both endpoints are registered in FastAPI, the research response can be fed directly into the backtest request shape, and the API contract tests pass
- [x] **T03: Wire the first real React Research → Backtester flow** `est:1h30m`
  - Why: This slice is only valuable when a user can actually move from evidence to execution in the product. The UI must make the recommendation, assumptions, and warnings visible rather than implicit.
  - Files: `frontend/app/(dashboard)/research/page.tsx`, `frontend/app/(dashboard)/backtest/page.tsx`, `frontend/lib/api.ts`, `frontend/components/research/LookbackSweepPanel.tsx`, `frontend/components/backtest/BacktestResultView.tsx`, `frontend/components/layout/Sidebar.tsx`
  - Do: Add typed frontend API calls for the new endpoints, build the first live Research page around the lookback-window sweep, and surface its takeaway banner plus a deep-linkable “Use recommended settings” CTA. Build the Backtester page so it parses query params into prefilled controls, runs the live backtest, and renders data-quality status, metrics cards, equity curve, signal overlay, trade log, warnings, and an honest-reporting footer with assumptions/sample/confidence/limitations. Update navigation so Research and Backtest are reachable from the dashboard. Relevant skill: `frontend-design`.
  - Verify: `cd frontend && npm run build`, then run the localhost research → backtest handoff flow described above
  - Done when: the connected React flow works on localhost, the recommendation prefill survives navigation, and the frontend build passes

## Files Likely Touched

- `src/statistical_arbitrage/strategy/zscore_mean_reversion.py`
- `src/statistical_arbitrage/backtesting/engine.py`
- `src/statistical_arbitrage/backtesting/models.py`
- `api/routers/research.py`
- `api/routers/backtest.py`
- `frontend/app/(dashboard)/backtest/page.tsx`
