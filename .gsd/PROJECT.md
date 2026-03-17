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

- **Data pipeline**: CCXT → Bitvavo API → parquet cache with delta updates. ~20 EUR pairs cached at 1h and 4h timeframes.
- **Analysis engine**: `PairAnalysis` class (Engle-Granger cointegration, ADF test, spread, z-score, half-life, correlation). 8 empirical research functions in `analysis/research.py` (938 lines, zero Dash imports).
- **Visualization**: Plotly figure builders for spread plots and educational concepts.
- **Config**: Pydantic settings with Bitvavo creds, data paths, strategy params.
- **Tests**: 48 unit tests for research analysis functions and takeaway generators.

The Dash frontend is being replaced with Next.js + FastAPI for better UX control and interactivity.

## Architecture / Key Patterns

- **Backend**: FastAPI (Python) wrapping existing analysis code. Polars for all dataframes. statsmodels/scipy for statistical tests. CCXT for Bitvavo exchange data.
- **Frontend**: Next.js (React) with dark theme and Plotly charts via react-plotly.js.
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
