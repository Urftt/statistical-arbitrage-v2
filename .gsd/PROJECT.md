# Project

## What This Is

A personal crypto statistical arbitrage platform for the Bitvavo exchange (EUR pairs). Three pillars: an Academy that teaches stat arb using real pair data, a Research & Backtest suite for data-driven strategy development, and a Trading system (paper → live automated).

Built as a Next.js React frontend + FastAPI Python backend, with an existing analytical core (Polars, statsmodels, scipy, CCXT) and parquet-cached OHLCV data for ~20 EUR pairs.

## Core Value

<!-- This is the primary value anchor for prioritization and tradeoffs.
     If scope must shrink, this should survive. -->

The platform must never feel like a black box. Every formula, assumption, and decision is visible and explained. Transparency and honesty in reporting are non-negotiable — from the Academy's educational panels to the backtester's performance metrics.

## Current State

The V1 Dash app is being migrated to V2 with a new tech stack. What exists and works:

- **Data pipeline**: CCXT → Bitvavo API → parquet cache with delta updates. ~20 EUR pairs cached at 1h and 4h timeframes (44 total datasets).
- **Analysis engine**: `PairAnalysis` class (Engle-Granger cointegration, ADF test, spread, z-score, half-life, correlation). 8 empirical research functions in `analysis/research.py` (938 lines, zero Dash imports).
- **FastAPI REST API** (S01 ✅): 7 endpoints wrapping PairAnalysis and DataCacheManager — health, pairs list, OHLCV, cointegration, spread, zscore, stationarity. 51 tests, Pydantic models, OpenAPI docs at /docs. CORS enabled for localhost:3000.
- **Next.js Frontend Shell** (S02 ✅): Dark-themed AppShell with Mantine v8, sidebar navigation (4 pages), global pair selector populated from API, SSR-safe PlotlyChart wrapper with ported mantine_dark template. `npm run build` passes clean.
- **Academy Steps 1-3** (S03 ✅): 6-step stepper with free navigation, step dispatch engine, data caching. Step 1: curated pair cards setting PairContext. Step 2: normalized/raw Plotly price charts with correlation badge. Step 3: synthetic concept subplot chart with real pair comparison badges. 3-layer EducationalPanel on every step. Full frontend→API→Plotly pipeline proven.
- **Academy Steps 4-6** (S04 ✅): Cointegration test visualization (ADF number line, regression scatter, pass/fail verdict), spread chart with rolling window slider and ±1σ/2σ/3σ bands, z-score chart with 3 parameter sliders and signal state machine. All slider interactions are client-side with zero API calls. Full 6-step Academy flow complete.
- **Scanner + Deep Dive** (S05 ✅): Scanner page now runs batch cointegration scans with progress feedback, sorted/highlighted result rows, a p-value histogram, and graceful ⚠️ failure rows. Deep Dive now fetches real single-pair analysis, renders 8 stat cards plus 4 dark-themed Plotly charts, and recomputes configurable z-scores client-side from spread data.
- **Visualization**: Plotly figure builders for spread plots and educational concepts.
- **Config**: Pydantic settings with Bitvavo creds, data paths, strategy params.
- **Tests**: 99 tests (48 research + 51 API) plus live runtime verification for Academy, Scanner, and Deep Dive pages.
- **Academy (steps 1-6)**: ~2900 lines across 10 files — AcademyStepper, EducationalPanel, StepPairSelector, StepPriceComparison, StepCorrelationVsCointegration, StepCointegrationTest, StepSpread, StepZScoreSignals, Academy page, extended API types.

The Dash frontend is being replaced with Next.js + FastAPI for better UX control and interactivity. Backend API (S01), frontend shell (S02), Academy (S03+S04), and Scanner + Deep Dive (S05) are complete. Next: S06 glossary, polish, and final milestone integration verification.

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

- [ ] M001: Frontend Foundation + Academy — Next.js/FastAPI stack with the 6-step Academy rebuilt for real interactivity
- [ ] M002: Research & Backtest — 8 research modules ported + backtesting engine with honest, data-driven reporting
- [ ] M003: Paper Trading — Real-time data feed, simulated execution, portfolio tracking
- [ ] M004: Live Automated Trading — Real order execution on Bitvavo with risk management and monitoring
