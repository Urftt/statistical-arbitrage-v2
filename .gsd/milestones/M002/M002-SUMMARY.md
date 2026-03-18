---
id: M002
provides:
  - Look-ahead-safe z-score mean-reversion backtesting engine with trailing-window hedge ratios, fee-aware trade accounting, and deterministic signal timing
  - Data-quality preflight system that separates blocking issues from warnings before backtest execution
  - 8 FastAPI research endpoints (lookback, rolling stability, OOS validation, timeframe, spread method, z-score threshold, tx cost, cointegration method) on a shared ResearchTakeawayPayload envelope
  - 8 React research panel components with loading/error/empty/result states, takeaway banners, and backtest parameter handoff
  - Bounded multi-parameter grid search engine (≤3 axes, ≤500 combos) with robustness scoring and Plotly heatmap visualization
  - Walk-forward validation engine with rolling train/test windows, stability verdicts, and divergence analysis
  - Overfitting detector (4 heuristic rules) wired into every backtest path with distinct warning rendering
  - Fragility detector for grid-search neighbor analysis flagging narrow parameter spikes
  - Complete /research, /backtest, and /optimize React pages with connected handoff flows via URL search params
  - Honest-reporting contract across all surfaces: assumptions, sample size, limitations, warnings, and footer metadata
  - 5 E2E integration flow tests proving the assembled Research → Backtest → Optimize workspace on real cached data
key_decisions:
  - "D018: Trailing-window OLS hedge ratios/z-scores plus next-bar-close execution for look-ahead-safe backtesting"
  - "D019: Research recommendation as a directly postable nested BacktestRequest; blockers/warnings/footer as structured API payloads"
  - "D020: Full research recommendation encoded in /backtest URL search params for shareable, refresh-safe presets"
  - "D021: Pre-computed z-score via Polars rolling_mean/rolling_std in shared _compute_zscore helper"
  - "D022: Research Hub uses Mantine Tabs with keepMounted={false} and next/dynamic lazy loading"
  - "D023/D025: Robustness = fraction of neighbors ≥80% of best; fragility = >50% of neighbors <50% of best"
  - "D024: Four independent overfit_* heuristic rules wired into run_backtest() for automatic screening"
patterns_established:
  - "recommended_backtest_params is a fully valid BacktestRequest — no adapter glue needed between research and backtest surfaces"
  - "All 8 research endpoints follow the same envelope: module identifier, pair metadata, typed results, takeaway with severity, optional recommended_backtest_params"
  - "Diagnostic modules (rolling-stability, oos, timeframe, spread-method, coint-method) return recommended_backtest_params=None; handoff modules (lookback, zscore-threshold, tx-cost) return valid BacktestRequest"
  - "Backtest trust surfaces are first-class UI states: blocked, warning, empty, and successful runs each render explicit product states"
  - "overfit_ warning code prefix for overfitting signals, fragile_ for fragility, wf_ for walk-forward — each prefix gets distinct Alert styling"
  - "URL is the source of truth for backtest presets — shareable, refresh-safe, debuggable via buildBacktestSearchParams()"
  - "Pure Python engines (strategy, backtesting, optimization, walkforward) have zero UI imports — dashboard pages are thin wrappers"
observability_surfaces:
  - "uv run pytest tests/ -q — 164 tests covering engine, API, research, optimization, walk-forward, and overfitting"
  - "cd frontend && npm run build — TypeScript/SSR gate for all frontend routes"
  - "cd frontend && npm run test:e2e — 27 E2E tests including 5 integration flow tests"
  - "POST /api/research/* endpoints — structured results with module identifier for request tracing"
  - "POST /api/backtest — data_quality, warnings, footer, signal_overlay, trade_log, equity_curve, metrics"
  - "POST /api/optimization/grid-search — total_combinations, robustness_score, per-cell status, warnings"
  - "POST /api/optimization/walk-forward — stability_verdict, train_test_divergence, per-fold status, warnings"
  - "GET /openapi.json — all endpoint schemas for API contract inspection"
requirement_outcomes:
  - id: R008
    from_status: active
    to_status: validated
    proof: "All 8 research modules run from React against FastAPI with typed contracts, takeaway banners, and structured results from cached parquet data. 8 contract tests, 4 E2E research hub tests, 5 integration E2E tests, and frontend build gate."
  - id: R009
    from_status: active
    to_status: validated
    proof: "Z-score mean-reversion strategy runs over historical cached data returning structured equity curve, trade ledger, and cumulative returns. Deterministic fixtures verify signal timing and trade accounting. Live E2E backtest execution on cached data."
  - id: R010
    from_status: active
    to_status: validated
    proof: "Backtest engine computes and renders Sharpe, Sortino, max drawdown, win rate, profit factor, and average holding period. Verified in deterministic unit tests and live E2E."
  - id: R011
    from_status: active
    to_status: validated
    proof: "Grid search sweeps ≤3 axes with bounded combos, returns metric matrix with robustness score and fragility warnings, renders Plotly heatmap. 10 unit tests, 4 API tests, 3 E2E tests. Live E2E proves heatmap renders and CTA hands off to /backtest."
  - id: R012
    from_status: active
    to_status: validated
    proof: "Overfitting detector with 4 heuristic rules wired into every run_backtest() call. Fragility detector flags narrow parameter spikes. 21 unit tests prove all thresholds and negative cases. Both render with distinct warning styling."
  - id: R013
    from_status: active
    to_status: validated
    proof: "Look-ahead safety enforced architecturally: trailing-window OLS hedge ratios/z-scores use only historically available data, signals at bar close, execution on next bar close. Deterministic tests in test_backtest_engine.py."
  - id: R014
    from_status: active
    to_status: validated
    proof: "Walk-forward with rolling train/test windows, grid-search per train fold, per-fold and aggregate metrics, stability verdict, divergence warnings. 11 unit tests, API contract tests, live E2E proving stability verdict renders."
  - id: R015
    from_status: active
    to_status: validated
    proof: "Every backtest, research, and optimization output exposes assumptions, sample size, date range, fee assumptions, confidence qualifiers, and limitations. Honest-reporting footer verified in live E2E. Transparency chain covers all surfaces."
duration: ~8h across 4 slices (13 tasks)
verification_result: passed
completed_at: 2026-03-18
---

# M002: Research & Backtest

**Shipped the full research-and-validation workspace: 8 live research modules with takeaway-driven parameter recommendations, a look-ahead-safe backtesting engine with honest trust reporting, bounded grid search with robustness scoring, walk-forward validation with stability verdicts, and overfitting detection wired into every backtest surface — all connected end-to-end through the React frontend and FastAPI backend on real cached data.**

## What Happened

M002 turned the platform's existing analytical core into a trustworthy research-and-validation workspace across four slices.

**S01 retired the main risk first** by shipping the narrowest useful loop: one research module feeding one real backtest through a stable shared contract. It extracted a pure-Python z-score mean-reversion strategy from the teaching flow, tightened the execution model to prevent look-ahead bias (trailing-window OLS hedge ratios, signal at bar close, next-bar-close execution), and built a fee-aware trade ledger with strict Pydantic models for signals, trades, equity, metrics, warnings, and honest-reporting footer. The data-quality preflight separates blockers from warnings so short histories, null gaps, and impossible prices surface as structured data. The first research endpoint (lookback-window sweep) returns a `recommended_backtest_params` that is already a valid `BacktestRequest` — no adapter glue. The `/backtest` page hydrates controls from URL params, reruns against edited settings, and renders the full trust report including a deterministic blocked path when preflight fails.

**S02 expanded research breadth** by porting the remaining 7 research modules onto the same `ResearchTakeawayPayload` envelope. Each got a Pydantic request/response model, a FastAPI POST endpoint reading cached parquet, and a React panel with loading/error/empty/result states. Z-score threshold and transaction cost modules return `recommended_backtest_params` for backtest handoff; the other 5 diagnostic modules return `null`. The Research Hub page was refactored into a Mantine Tabs module picker with 8 lazy-loaded panels via `next/dynamic`. All 8 modules follow identical structural patterns while maintaining module-specific chart types and stat cards.

**S03 added optimization and trust infrastructure.** The overfitting detector (4 heuristic rules: high Sharpe, high profit factor with few trades, high win rate with few trades, suspiciously smooth equity) was wired into `run_backtest()` so every backtest surface — standalone, grid-search cell, walk-forward test fold — gets automatic screening. The bounded grid search engine generates parameter combinations across ≤3 axes (≤500 combos), runs each through the backtest engine, computes a robustness score via neighbor analysis, and calls the fragility detector on the best result. Walk-forward validation slices data into rolling train/test windows, grid-searches each train fold, backtests the best params on the non-overlapping test window, and classifies stability as stable/moderate/fragile based on train-test divergence. The `/optimize` page renders grid search results as a Plotly heatmap with robustness badge and fragility warnings, and walk-forward results as fold cards with divergence highlighting and a stability verdict banner.

**S04 closed the integration gap** by writing 5 Playwright E2E tests that exercise the connected flows end-to-end through the real Next.js and FastAPI entrypoints on real cached BTC+ETH data. Research produces results → CTA hands off to backtest with URL params → backtest renders equity curve and footer → grid search runs and CTA links to backtest → walk-forward renders stability verdict. No component or API bugs were discovered — all handoffs worked correctly on the first real end-to-end run. All M002 requirements were updated with integrated acceptance evidence.

## Cross-Slice Verification

**Success Criterion 1 — Research Hub → recommended params → Backtester flow:**
Verified. S01 proved the lookback→backtest handoff with live localhost inspection (pair selection, lookback sweep, CTA click, URL hydration, metrics/footer rendering, blocked path). S04 E2E tests #1-3 (`research lookback module runs`, `research CTA hands off to backtest`, `backtest executes and renders equity curve, metrics, and footer`) confirm the connected flow passes through real entrypoints. Evidence: 27/27 E2E tests passing in 43.6s.

**Success Criterion 2 — All 8 research modules on React/FastAPI:**
Verified. S02 delivered all 8 endpoints and panels with 8 contract tests (all return correct envelope) and 4 E2E tests (tab rendering and switching). Frontend build passes with 0 TypeScript errors and all routes generated. No Dash surface involved. Evidence: `uv run pytest tests/test_research_api.py -q` → 8/8 passed; `npm run build` → clean.

**Success Criterion 3 — Grid search + walk-forward with robustness/overfitting visibility:**
Verified. S03 delivered both engines with 46 unit/API tests. S04 E2E test #4 (`grid search runs and CTA links to backtest`) confirms heatmap renders and the "Use best params" CTA navigates to `/backtest`. S04 E2E test #5 (`walk-forward runs and renders stability verdict`) confirms stability verdict rendering. Evidence: 46 engine tests + 3 E2E optimize tests + 2 integration flow tests all passing.

**Success Criterion 4 — Trustworthy outputs:**
Verified. S01 proved preflight blocking/warning separation with a forced blocked path (days_back=7, lookback_window=500 → `status="blocked"`, blocker code `insufficient_observations`, charts hidden by design). S03 wired overfitting detection into every `run_backtest()` call (21 tests proving all thresholds + negative cases). S01 proved look-ahead safety architecturally with deterministic tests in `test_backtest_engine.py`. S04 confirmed all trust surfaces render in the live integrated flow.

**Definition of Done:**
- ✅ All 4 slices complete with summaries on disk
- ✅ Strategy engine, backtesting engine, research endpoints, and React pages wired through stable shared contracts (`ResearchTakeawayPayload`, `BacktestRequest`, `BacktestResult`)
- ✅ Real entrypoints exercised on localhost: 27 E2E tests run through `:3000` + `:8000`
- ✅ Success criteria verified against live runtime behavior
- ✅ Final integrated acceptance passed for research execution, one-click backtest handoff, grid search, walk-forward validation, and overfitting/data-quality visibility

**Contract gates:**
- `uv run pytest tests/ -q` → 164 passed (15.46s)
- `cd frontend && npm run build` → compiled successfully, 0 TypeScript errors
- `cd frontend && npm run test:e2e` → 27 passed (43.6s)

## Requirement Changes

- R008: active → validated — All 8 research modules run from React against FastAPI with typed contracts, takeaway banners, and structured results. 8 contract tests + 4 E2E research hub tests + 5 integration flow tests + frontend build gate.
- R009: active → validated — Z-score mean-reversion strategy runs over historical cached data with structured equity curve, trade ledger, and cumulative returns. Deterministic unit tests + live E2E backtest execution.
- R010: active → validated — Backtest engine computes and renders Sharpe, Sortino, max drawdown, win rate, profit factor, and average holding period. Verified in unit tests and live E2E.
- R011: active → validated — Grid search sweeps ≤3 axes with bounded combos, robustness scoring, fragility warnings, and Plotly heatmap. 10 unit + 4 API + 3 E2E tests. Live E2E proves heatmap + CTA handoff.
- R012: active → validated — Overfitting detector (4 rules) wired into every run_backtest() call. Fragility detector flags narrow parameter spikes. 21 unit tests + distinct warning rendering.
- R013: active → validated — Look-ahead safety enforced architecturally: trailing-window inputs only, signal at bar close, execution on next bar close. Deterministic tests prove timing contract.
- R014: active → validated — Walk-forward with rolling train/test windows, per-fold and aggregate metrics, stability verdict, divergence warnings. 11 unit tests + API tests + live E2E.
- R015: active → validated — Every output exposes assumptions, sample size, date range, fee assumptions, confidence qualifiers, and limitations. Honest-reporting footer verified in live E2E.
- R022: already validated (M001) → extended with optimization transparency (no status change)
- R023: stays active — Preflight validates nulls, non-finite values, impossible prices, short histories, and non-monotonic timestamps, but missing-candle gap detection not yet implemented.

## Forward Intelligence

### What the next milestone should know
- The backtesting engine (`backtesting/engine.py`) is the canonical entry point for historical strategy evaluation. It accepts `StrategyParameters` and raw price series, and returns a complete `BacktestResult` with trades, equity, metrics, warnings, and footer. M003 paper trading should reuse the same `StrategyParameters` model and signal generation logic for live signal production.
- `recommended_backtest_params` is a fully valid `BacktestRequest` — the pattern of returning a directly consumable downstream request object should extend to paper trading presets.
- The pair context (`PairContext`) drives asset selection across all pages. Paper trading pages should consume the same context rather than inventing their own selectors.
- All strategy/backtesting code is pure Python with zero UI imports. The same separation must hold for paper trading: the execution/tracking engine should be importable without any web framework dependency.
- The overfitting detection and honest-reporting footer patterns are established and wired in. Paper trading should extend (not duplicate) the warning/trust infrastructure.

### What's fragile
- **Preflight gap detection is incomplete** — R023 stays active because a strictly increasing timestamp series with missing regular intervals passes preflight. This matters for paper trading because live data feeds may have gaps that the current preflight would miss.
- **`_compute_zscore()` in research.py duplicates z-score logic** — it re-implements rolling z-score in Polars rather than reusing PairAnalysis. If the z-score formula or window semantics change, both paths must be updated.
- **Mantine Select commit pattern** — automation and E2E tests must type → ArrowDown → Enter to commit selections. If Mantine upgrades change dropdown behavior, the `selectPair()` helper and all tests break.
- **Grid search is synchronous and single-threaded** — acceptable for localhost ≤500 combos but would need parallelization for larger sweeps or real-time optimization in paper trading.
- **Walk-forward fold windowing with short datasets** — the step calculation `(n - min_window) // (fold_count - 1)` can produce overlapping regions when data is barely above the minimum.

### Authoritative diagnostics
- `uv run pytest tests/ -q` — 164 tests covering all engine, API, research, optimization, and walk-forward surfaces. If this passes, the computation layer is intact.
- `cd frontend && npm run build` — the definitive TypeScript/SSR gate; catches type errors and Plotly SSR issues that dev mode misses.
- `cd frontend && npm run test:e2e` — 27 tests proving the connected frontend→API flows work end-to-end. The 5 integration flow tests are the strongest proof of workspace integrity.
- `tests/test_backtest_engine.py` — the strongest proof for signal timing, fee math, trade accounting, and the anti-lookahead contract.
- `/backtest` blocked-preflight state — the quickest runtime check that the trust surface still works when the engine refuses a run.

### What assumptions changed
- **Worktree parquet cache may be empty** — `DataCacheManager` was updated with a repo-root fallback. Paper trading's real-time data feed should not assume the cache layout is identical across environments.
- **Mantine Select interactions are not simple textbox fills** — visible typed text is not proof of committed selection state. Any automation touching selectors must verify the committed hidden value.
- **S01-S03 per-slice verification was thorough enough that S04 integration found zero bugs** — this suggests the shared contract patterns (envelope, handoff, URL params) work well and should be preserved.

## Files Created/Modified

- `src/statistical_arbitrage/strategy/zscore_mean_reversion.py` — pure trailing-window z-score strategy with look-ahead-safe signal generation
- `src/statistical_arbitrage/backtesting/models.py` — strict Pydantic models for parameters, diagnostics, trades, equity, metrics, warnings, footer, optimization, and walk-forward
- `src/statistical_arbitrage/backtesting/preflight.py` — reusable blocking/warning data-quality checks
- `src/statistical_arbitrage/backtesting/engine.py` — fee-aware look-ahead-safe backtest runner with overfitting detection
- `src/statistical_arbitrage/backtesting/overfitting.py` — 4-rule overfitting detector and n-dimensional fragility detector
- `src/statistical_arbitrage/backtesting/optimization.py` — bounded multi-parameter grid search engine
- `src/statistical_arbitrage/backtesting/walkforward.py` — rolling train/test walk-forward validation engine
- `src/statistical_arbitrage/data/cache_manager.py` — repo-root parquet fallback for worktree environments
- `api/schemas.py` — Pydantic request/response schemas for all research, backtest, and optimization endpoints
- `api/routers/research.py` — 8 research POST endpoints with shared envelope pattern
- `api/routers/backtest.py` — live backtest execution endpoint
- `api/routers/optimization.py` — grid-search and walk-forward POST endpoints
- `api/main.py` — router registration for research, backtest, and optimization
- `frontend/lib/api.ts` — typed TypeScript interfaces and fetch functions for all API contracts
- `frontend/app/(dashboard)/research/page.tsx` — 8-tab Research Hub with lazy-loaded panels
- `frontend/app/(dashboard)/backtest/page.tsx` — URL-hydrated backtest page with rerun/preset behavior
- `frontend/app/(dashboard)/optimize/page.tsx` — tabbed Grid Search + Walk-Forward optimization page
- `frontend/components/research/*.tsx` — 8 research panel components (lookback, rolling stability, OOS, timeframe, spread method, z-score threshold, tx cost, coint method)
- `frontend/components/backtest/BacktestResultView.tsx` — honest-reporting result surface with overfitting warning rendering
- `frontend/components/optimize/GridSearchPanel.tsx` — heatmap, robustness badge, fragility warnings, backtest CTA
- `frontend/components/optimize/WalkForwardPanel.tsx` — fold cards, stability verdict, divergence highlighting, backtest CTA
- `frontend/components/layout/Sidebar.tsx` — navigation entries for Research, Backtest, Optimize
- `frontend/e2e/integration-flows.spec.ts` — 5 E2E integration flow tests
- `frontend/e2e/research-hub.spec.ts` — 4 E2E research hub tests
- `frontend/e2e/optimize.spec.ts` — 3 E2E optimize page tests
- `tests/test_backtest_engine.py` — deterministic signal/trade/metrics tests
- `tests/test_backtest_api.py` — API contract tests for research recommendation and backtest execution
- `tests/test_research_api.py` — 8 contract tests for all research endpoints
- `tests/test_overfitting.py` — 21 overfitting and fragility detection tests
- `tests/test_optimization.py` — 10 grid search engine tests
- `tests/test_optimization_api.py` — 4 API contract tests for optimization endpoints
- `tests/test_walkforward.py` — 11 walk-forward engine tests
