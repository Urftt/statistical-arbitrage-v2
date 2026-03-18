# Project

## What This Is

A personal crypto statistical arbitrage platform for the Bitvavo exchange (EUR pairs). Three pillars: an Academy that teaches stat arb using real pair data, a Research & Backtest suite for data-driven strategy development, and a Trading system (paper → live automated).

Built as a Next.js React frontend + FastAPI Python backend, with an existing analytical core (Polars, statsmodels, scipy, CCXT) and parquet-cached OHLCV data for ~20 EUR pairs.

## Core Value

<!-- This is the primary value anchor for prioritization and tradeoffs.
     If scope must shrink, this should survive. -->

The platform must never feel like a black box. Every formula, assumption, and decision is visible and explained. Transparency and honesty in reporting are non-negotiable — from the Academy's educational panels to the backtester's performance metrics.

## Current State

M001 is complete. M002 is complete. The active user-facing application runs on the V2 stack: Next.js 16 frontend + FastAPI backend over the existing Python analysis core. What exists and works:

- **Data pipeline**: CCXT → Bitvavo API → parquet cache with delta updates. ~20 EUR pairs cached at 1h and 4h timeframes (44 total datasets).
- **Analysis engine**: `PairAnalysis` class (Engle-Granger cointegration, ADF test, spread, z-score, half-life, correlation). 8 empirical research functions in `analysis/research.py` (938 lines, zero Dash imports).
- **FastAPI REST API** (M001/S01 ✅): 7 endpoints wrapping PairAnalysis and DataCacheManager — health, pairs list, OHLCV, cointegration, spread, zscore, stationarity. 51 API tests, Pydantic models, OpenAPI docs at /docs, CORS enabled for localhost:3000.
- **Next.js frontend shell** (M001/S02 ✅): Dark-themed Mantine AppShell with sidebar navigation, global pair selector populated from API, and SSR-safe PlotlyChart wrapper using the ported `mantine_dark` template.
- **Academy** (M001/S03 + S04 ✅): Complete 6-step guided learning flow using real pair data, interactive Plotly charts, 3-layer EducationalPanels, and client-side slider-driven exploration for spread/z-score parameters.
- **Scanner + Deep Dive** (M001/S05 ✅): Batch cointegration scanner with progress/failure handling plus a full single-pair Deep Dive analysis view with stat cards and four diagnostic charts.
- **Glossary + integration proof** (M001/S06 ✅): Searchable 17-term glossary with stable deep links, Academy cross-links, hydration-noise fix in the shared shell, and final live route-loop UAT across Academy → Glossary → Deep Dive → Scanner → Academy.
- **Backtesting engine + first research handoff** (M002/S01 ✅): Look-ahead-safe z-score mean-reversion strategy, trade ledger, equity curve, performance metrics (Sharpe, Sortino, drawdown, etc.), data-quality preflight, honest-reporting footer, and live /backtest page with research→backtest parameter handoff.
- **Full Research Hub** (M002/S02 ✅): All 8 research modules (lookback, rolling stability, OOS validation, timeframe, spread method, z-score threshold, tx cost, cointegration method) run from React against FastAPI with typed contracts, takeaway banners, and backtest recommendation handoff for threshold/cost modules. 8 contract tests + 4 E2E tests.
- **Optimization & Walk-Forward** (M002/S03 ✅): Bounded grid search (≤3 axes, ≤500 combos) with Plotly heatmap, robustness scoring, and fragility detection. Walk-forward validation with rolling train/test windows, per-fold metrics, stability verdict. Overfitting detector (4 heuristic rules) wired into every backtest path. `/optimize` page with tabbed Grid Search and Walk-Forward panels, inline warnings, and backtest handoff CTAs. 46 engine/API tests + 3 E2E tests.
- **Workspace Integration** (M002/S04 ✅): 5 E2E integration flow tests exercising the connected Research → Backtest → Optimize paths on real cached BTC+ETH data. All 27 E2E tests pass. All M002 requirements closed with live integrated acceptance evidence.
- **Visualization**: Plotly figure builders for spread plots and educational concepts, rendered in React via `react-plotly.js`.
- **Config**: Pydantic settings with Bitvavo creds, data paths, and strategy parameters.
- **Verification**: 164 Python tests passing, 27 E2E tests passing, frontend build passing, and live runtime UAT recorded for the integrated app.

Next up: M003 planning (Paper Trading).

## Architecture / Key Patterns

- **Backend**: FastAPI (Python) wrapping existing analysis code. Polars for all dataframes. statsmodels/scipy for statistical tests. CCXT for Bitvavo exchange data.
- **Frontend**: Next.js 16 (React, App Router) with Mantine v8 dark theme. Plotly charts via react-plotly.js (SSR-safe via next/dynamic). Global pair state via PairContext.
- **Data**: Parquet storage in `data/cache/`. All data uses Polars DataFrames.
- **Config**: `config/settings.py` uses pydantic-settings with `config/.env` for secrets.
- **Analysis separation**: Analysis functions are pure Python (zero UI imports). UI is a thin wrapper.
- **Bitvavo only**: No multi-exchange abstraction. Public data doesn't need API keys.

## Capability Contract

See `.gsd/REQUIREMENTS.md` for the explicit capability contract, requirement status, and coverage mapping.

## Milestone Sequence

<!-- Check off milestones as they complete. One-liners should describe intent, not implementation detail. -->

- [x] M001: Frontend Foundation + Academy — Next.js/FastAPI stack with the 6-step Academy rebuilt for real interactivity
- [x] M002: Research & Backtest — 8 research modules ported + backtesting engine with honest, data-driven reporting
- [ ] M003: Paper Trading — Real-time data feed, simulated execution, portfolio tracking
- [ ] M004: Live Automated Trading — Real order execution on Bitvavo with risk management and monitoring
