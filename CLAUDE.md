# CLAUDE.md — Statistical Arbitrage Research Platform (V2)

## Project Overview
Personal crypto statistical arbitrage research and learning platform for Bitvavo exchange (EUR pairs). Next.js frontend + FastAPI backend with data collection, caching, cointegration analysis, 8 interactive research modules, a 6-step teaching flow (Academy), backtesting engine with grid search & walk-forward optimization, and a searchable glossary.

## Tech Stack

### Backend (Python)
- **Python 3.12** with **UV** package manager
- **FastAPI + Uvicorn** — REST API at `localhost:8000`
- **Polars** (not Pandas) for all dataframes
- **statsmodels/scipy** for statistical tests
- **ccxt** for exchange API (Bitvavo)
- **pydantic-settings** for config

### Frontend (TypeScript)
- **Next.js 16** (App Router) at `localhost:3000`
- **React 19** with **Mantine v8** component library
- **Plotly.js** via `react-plotly.js` for all charts
- **Playwright** for E2E tests

## Quick Commands
```bash
# Backend
uv sync --all-extras          # Install Python deps
uv run python run_api.py      # Start API server (http://localhost:8000)
uv run pytest                 # Run backend tests (164 tests)
uv run ruff check src/ api/   # Lint
uv run ruff format src/ api/  # Format

# Frontend
cd frontend
npm install                   # Install Node deps
npm run dev                   # Start Next.js dev server (http://localhost:3000)
npm run build                 # Production build (catches SSR issues)
npm run lint                  # ESLint

# E2E tests (auto-launches both servers if not running)
cd frontend
npx playwright test                    # Run all E2E tests (27 tests)
REUSE_SERVERS=1 npx playwright test    # Skip server launch if already running
```

## Project Structure
```
api/                                 # FastAPI backend
├── main.py                          # App factory, CORS, router registration, lifespan
├── schemas.py                       # Pydantic request/response models
└── routers/
    ├── health.py                    # GET /api/health
    ├── pairs.py                     # GET /api/pairs — available pairs + cached data
    ├── analysis.py                  # POST /api/analysis/cointegration, /zscore
    ├── research.py                  # POST endpoints for 8 research modules
    ├── backtest.py                  # POST /api/backtest — run backtests
    └── optimization.py             # POST /api/optimize/grid-search, /walk-forward

src/statistical_arbitrage/           # Core Python library (pure, no web framework imports)
├── data/
│   ├── bitvavo_client.py            # CCXT-based data collection from Bitvavo
│   └── cache_manager.py            # Query-once, cache-forever data layer (parquet)
├── analysis/
│   ├── cointegration.py            # PairAnalysis: Engle-Granger, ADF, z-scores, half-life, spread
│   └── research.py                 # 8 empirical research functions
├── strategy/
│   └── zscore_mean_reversion.py    # Z-score mean-reversion strategy
├── backtesting/
│   ├── engine.py                   # Backtesting engine — runs strategy over historical data
│   ├── models.py                   # Trade, BacktestResult, PerformanceMetrics (Pydantic)
│   ├── optimization.py            # Grid search over parameter space
│   ├── walkforward.py             # Walk-forward analysis (anchored/rolling windows)
│   ├── overfitting.py             # Overfitting detection metrics
│   └── preflight.py               # Pre-backtest validation checks
└── visualization/
    ├── spread_plots.py             # Price comparison, spread/z-score, scatter+regression
    └── educational_plots.py        # Concept explainers (cointegration vs correlation, ADF)

frontend/                            # Next.js frontend
├── app/
│   ├── layout.tsx                  # Root layout (Mantine provider, fonts)
│   └── (dashboard)/
│       ├── layout.tsx              # Dashboard shell (sidebar + header)
│       ├── page.tsx                # / — Scanner (home)
│       ├── scanner/page.tsx        # /scanner — Batch cointegration scanning
│       ├── deep-dive/page.tsx      # /deep-dive — Single pair full analysis
│       ├── research/page.tsx       # /research — 8 research modules
│       ├── backtest/page.tsx       # /backtest — Backtesting with equity curve + trade log
│       ├── optimize/page.tsx       # /optimize — Grid search + walk-forward optimization
│       ├── academy/page.tsx        # /academy — 6-step teaching flow
│       └── glossary/page.tsx       # /glossary — Searchable stat arb terms
├── components/
│   ├── layout/                     # Header.tsx, Sidebar.tsx
│   ├── charts/PlotlyChart.tsx      # Shared Plotly wrapper (dark theme, SSR-safe via next/dynamic)
│   ├── academy/                    # 6 step components + stepper + educational panels
│   ├── backtest/                   # BacktestResultView.tsx
│   ├── optimize/                   # GridSearchPanel.tsx, WalkForwardPanel.tsx
│   ├── research/                   # 8 research module panels
│   └── glossary/                   # GlossaryLink.tsx
├── contexts/PairContext.tsx         # Global pair selection state
├── lib/
│   ├── api.ts                      # API client (fetch wrappers for all backend endpoints)
│   ├── theme.ts                    # Mantine theme + Plotly dark template
│   └── glossary.ts                 # Glossary term definitions
├── e2e/                            # Playwright E2E tests (27 tests, 4 spec files)
└── playwright.config.ts            # Auto-launches both servers for E2E

config/
├── settings.py                     # Pydantic settings (Bitvavo creds, data paths, strategy params)
└── .env                            # Secrets (Bitvavo API keys — not needed for public data)

data/cache/                          # Cached OHLCV parquet files (~22 EUR pairs at 1h/4h)
notebooks/                           # Research notebooks (00-04)
tests/                               # 164 backend tests (pytest)
```

## What's Built
1. **Data pipeline**: CCXT → Bitvavo API → parquet cache with delta updates. ~22 EUR pairs cached at 1h and 4h.
2. **Analysis engine**: `PairAnalysis` class — Engle-Granger cointegration, ADF test, spread calculation, z-score, half-life, correlation. Research module with 8 empirical functions.
3. **FastAPI backend**: REST API with routers for pairs, analysis, research, backtesting, and optimization.
4. **Next.js frontend**: Mantine v8 dark-themed dashboard with 7 pages (scanner, deep-dive, research, backtest, optimize, academy, glossary).
5. **Pair Scanner**: Select coins, run batch cointegration scan, see results.
6. **Pair Deep Dive**: Single-pair full analysis view.
7. **Research Hub**: 8 interactive modules (rolling stability, out-of-sample, timeframe, spread method, z-score threshold, lookback window, transaction costs, cointegration method).
8. **Backtester**: Run z-score mean-reversion strategy over historical data. Equity curve, trade log, performance metrics (Sharpe, Sortino, max drawdown, win rate, profit factor).
9. **Optimizer**: Grid search over parameter space + walk-forward analysis with overfitting detection.
10. **Academy**: 6-step guided learning path — pair selection → price comparison → correlation vs cointegration → cointegration test → spread → z-score/signals. Interactive charts and 3-layer educational panels.
11. **Glossary**: Searchable stat arb terms.
12. **Tests**: 164 backend tests (pytest) + 27 E2E tests (Playwright).

## Architecture Patterns
- **Two-process architecture**: FastAPI backend (`:8000`) serves JSON API; Next.js frontend (`:3000`) consumes it. No server-side rendering of data — all data flows through REST endpoints.
- **Config**: `config/settings.py` uses pydantic-settings with `config/.env` for secrets. Access via `from config.settings import settings`.
- **Data format**: Parquet storage. All backend data uses Polars DataFrames.
- **Exchange API**: Uses CCXT (not the native python-bitvavo-api). Public data doesn't need API keys.
- **Charts**: Frontend uses `react-plotly.js` loaded via `next/dynamic` with `{ ssr: false }` (plotly.js accesses `window` at import time). Custom dark template in `lib/theme.ts`.
- **Analysis**: `PairAnalysis` takes `pl.Series`, converts to numpy internally for statsmodels/scipy. Research functions in `analysis/research.py` are pure Python (zero framework imports).
- **Frontend routing**: Next.js App Router with `(dashboard)` route group for the shell layout.
- **Global state**: `PairContext` provides selected pair across all pages.
- **API client**: `frontend/lib/api.ts` — typed fetch wrappers for all backend endpoints.

## Coding Conventions
- Use **Polars** for dataframe ops, never Pandas
- Type hints on all Python function signatures
- Docstrings with Args/Returns sections
- Use `ruff` for Python linting and formatting
- Strategy/backtesting/analysis code must be **pure Python** — no web framework imports
- Frontend uses TypeScript strict mode
- All Plotly charts go through the `PlotlyChart` wrapper for consistent dark theming
- API timestamps are **epoch milliseconds** — use `new Date(ts)` directly, not `new Date(ts * 1000)`

## Key Domain Concepts
- **Cointegration**: Two assets whose spread is stationary (mean-reverting) — tested via Engle-Granger
- **Hedge ratio**: OLS regression slope between asset prices
- **Z-score**: Standardized spread = (spread - rolling_mean) / rolling_std
- **Half-life**: Mean reversion speed via Ornstein-Uhlenbeck process
- **Entry/exit thresholds**: Z-score levels for opening/closing positions (default: ±2.0 entry, ±0.5 exit)
- **Signal state machine**: flat → long/short entry (z-score crosses threshold) → exit (returns to mean) or stop-loss (z-score too extreme)
