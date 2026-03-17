# CLAUDE.md — Statistical Arbitrage Research Platform (V2)

## Project Overview
Personal crypto statistical arbitrage research and learning platform for Bitvavo exchange (EUR pairs). Fully working Dash web app with data collection, caching, cointegration analysis, 8 interactive research modules, a 6-step teaching flow, and a searchable glossary. Next up: strategy implementation + backtesting engine.

## Tech Stack
- **Python 3.12** with **UV** package manager
- **Polars** (not Pandas) for all dataframes
- **Dash + Dash Mantine Components (DMC)** for the web UI
- **Plotly** for all visualization (custom `mantine_dark` template)
- **statsmodels/scipy** for statistical tests
- **ccxt** for exchange API (Bitvavo)
- **pydantic-settings** for config
- **Jupyter** for research notebooks

## Quick Commands
```bash
uv sync --all-extras      # Install all deps
source .venv/bin/activate  # Activate venv
python run_dashboard.py    # Launch Dash app (http://localhost:8050)
pytest                     # Run tests (48 tests)
ruff check src/            # Lint
ruff format src/           # Format
```

## Project Structure
```
src/statistical_arbitrage/
├── data/
│   ├── bitvavo_client.py        # CCXT-based data collection from Bitvavo
│   └── cache_manager.py         # Query-once, cache-forever data layer (parquet cache)
├── analysis/
│   ├── cointegration.py         # PairAnalysis: Engle-Granger, ADF, z-scores, half-life, spread
│   └── research.py              # 8 empirical research functions (938 lines, zero Dash imports)
├── visualization/
│   ├── spread_plots.py          # Price comparison, spread/z-score, scatter+regression
│   └── educational_plots.py     # Concept explainers (cointegration vs correlation, ADF)
├── app/
│   ├── main.py                  # Dash app entry point, routing (/scanner, /deep-dive, /research, /learn, /glossary)
│   ├── layout.py                # DMC AppShell, sidebar, Plotly dark template, global pair selector
│   ├── components/research_ui.py # Shared UI components for research modules
│   └── pages/
│       ├── pair_scanner.py      # Batch cointegration scanning
│       ├── pair_deep_dive.py    # Single pair full analysis
│       ├── research_hub.py      # 8 research modules with takeaway banners
│       ├── learn.py             # 6-step teaching flow (1948 lines)
│       └── glossary.py          # 17 searchable stat arb terms
├── strategy/                    # TODO: Trading strategy implementations
└── backtesting/                 # TODO: Backtesting engine
config/settings.py               # Pydantic settings (Bitvavo creds, data paths, strategy params)
run_dashboard.py                 # Launch script for Dash app
notebooks/                       # 00-04: data collection → cointegration → pair discovery → timeframes
data/cache/                      # Cached OHLCV timeseries (symlinked, ~20 EUR pairs at 1h/4h)
tests/                           # 48 tests for research analysis functions and takeaway generators
```

## What's Built (Complete)
1. **Data pipeline**: CCXT → Bitvavo API → parquet cache with delta updates. ~20 EUR pairs cached at 1h and 4h.
2. **Analysis engine**: `PairAnalysis` class — Engle-Granger cointegration, ADF test, spread calculation, z-score, half-life, correlation. Research module with 8 empirical functions.
3. **Pair Scanner**: Select coins, run batch cointegration scan, see results.
4. **Pair Deep Dive**: Single-pair full analysis view.
5. **Research Hub**: 8 interactive modules (rolling stability, out-of-sample, timeframe, spread method, z-score threshold, lookback window, transaction costs, cointegration method). Each has controls, results area, and auto-generated colored takeaway banner.
6. **Teaching Flow**: 6-step guided learning path — pair selection → price comparison → correlation vs cointegration → cointegration test → spread → z-score/signals. Each step has interactive charts and 3-layer educational panels (💡 Intuition → 🔧 How It Works → 📊 Your Pair). Steps 5-6 have live parameter sliders.
7. **Glossary**: 17 searchable stat arb terms with cross-links from teaching panels.
8. **Tests**: 48 unit tests covering all research analysis functions and takeaway generators.

## What's Next: Strategy & Backtesting (Phase 2)

### Strategy module (`strategy/`)
- Extract `_generate_signals()` from `learn.py` into a reusable strategy class
- Z-score mean-reversion strategy: pure function taking price series + parameters → list of `Trade` objects
- Position sizing with configurable capital and transaction fees (Bitvavo: 0.25%)

### Backtesting engine (`backtesting/`)
- Run strategy over historical data from cache
- Track equity curve, per-trade P&L, cumulative returns
- Performance metrics: Sharpe, Sortino, max drawdown, win rate, profit factor, avg holding period
- Results container (Pydantic model, serializable)

### Dashboard page (`pages/backtester.py`)
- New `/backtest` page with pair selector, parameter inputs, "Run Backtest" button
- Equity curve chart, trade log table, metrics summary cards
- Entry/exit signal overlay on price chart

### Config already has
`StrategySettings` in `config/settings.py`: `lookback_window=60`, `entry_threshold=2.0`, `exit_threshold=0.5`, `stop_loss=3.0`, `initial_capital=10000`, `position_size=0.5`, `transaction_fee=0.0025`

## Architecture Patterns
- **Config**: `config/settings.py` uses pydantic-settings with `config/.env` for secrets. Access via `from config.settings import settings`.
- **Data format**: Parquet storage. All data uses Polars DataFrames.
- **Exchange API**: Uses CCXT (not the native python-bitvavo-api). Public data doesn't need API keys.
- **Visualization**: All plots return Plotly `Figure` objects using the `mantine_dark` template.
- **Analysis**: `PairAnalysis` takes `pl.Series`, converts to numpy internally for statsmodels/scipy. Research functions in `analysis/research.py` are pure Python (zero Dash imports).
- **App layout**: DMC AppShell with sidebar navigation, global pair selector in header, `dcc.Store` for state.
- **App routing**: URL-based in `main.py`. Each page module has `layout()` + `register_callbacks(app)`.
- **Teaching flow**: `TEACHING_STEPS` registry drives stepper. `_render_step_content()` dispatches by index.

## Coding Conventions
- Use **Polars** for dataframe ops, never Pandas
- Type hints on all function signatures
- Docstrings with Args/Returns sections
- Use `ruff` for linting and formatting
- Strategy/backtesting code must be **pure Python** — no Dash imports. Dashboard pages are thin wrappers.

## Key Domain Concepts
- **Cointegration**: Two assets whose spread is stationary (mean-reverting) — tested via Engle-Granger
- **Hedge ratio**: OLS regression slope between asset prices
- **Z-score**: Standardized spread = (spread - rolling_mean) / rolling_std
- **Half-life**: Mean reversion speed via Ornstein-Uhlenbeck process
- **Entry/exit thresholds**: Z-score levels for opening/closing positions (default: ±2.0 entry, ±0.5 exit)
- **Signal state machine**: flat → long/short entry (z-score crosses threshold) → exit (returns to mean) or stop-loss (z-score too extreme)
