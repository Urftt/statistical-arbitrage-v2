# M002: Research & Backtest

**Gathered:** 2026-03-17
**Status:** Ready for planning

## Project Description

The second pillar of the stat arb platform. Ports the 8 existing research modules to the React frontend and builds a complete backtesting engine from scratch. Research explores parameters (manually and automated); backtesting validates them historically with honest, transparent reporting. Together they answer: "What works, and can I trust the result?"

## Why This Milestone

The Academy (M001) teaches statistical arbitrage. This milestone equips the user to actually find profitable parameter sets and prove they work before risking real capital. Without it, paper trading (M003) would be guessing. Research modules give exploratory power; the backtester gives definitive historical evidence.

## User-Visible Outcome

### When this milestone is complete, the user can:

- Open the Research Hub, run any of 8 research modules on a pair, see structured results with auto-generated takeaway banners, and click to backtest recommended parameters
- Run a backtest on a pair with chosen parameters and see equity curve, trade log, performance metrics (Sharpe, Sortino, max drawdown, win rate, profit factor), honest-reporting metadata, and overfitting warnings
- Run a multi-parameter grid search, see heatmap results, and identify robust vs overfitted parameter regions
- Run walk-forward validation on a strategy to see how it performs across rolling time windows
- Trust the results because every output shows assumptions, sample size, date range, fee assumptions, and confidence qualifiers

### Entry point / environment

- Entry point: http://localhost:3000 (Next.js frontend) + http://localhost:8000 (FastAPI backend)
- Environment: local dev (laptop)
- Live dependencies involved: none — all data from cached parquet files, no live Bitvavo API calls

## Completion Class

- Contract complete means: backtesting engine produces correct trade signals, equity curves, and metrics verified against hand-calculated examples; research API endpoints return structured results matching existing Python function outputs; walk-forward produces rolling window results; overfitting detector flags known-bad scenarios
- Integration complete means: research modules in the React frontend fetch from FastAPI research endpoints, display results, and feed parameters into the backtester; backtester page renders equity curves, trade logs, and metrics from the engine; walk-forward results display meaningfully
- Operational complete means: none — local dev only, no deployment lifecycle

## Final Integrated Acceptance

To call this milestone complete, we must prove:

- A user can run a research module (e.g., z-score threshold sweep) on a real pair, see the recommended parameters, click to backtest them, and get a trustworthy result with equity curve, metrics, and honest-reporting footer — all in one connected flow
- Walk-forward validation produces rolling-window results on a real pair and the display communicates whether the strategy is stable across time periods
- Overfitting warnings fire on a backtest result with suspiciously good metrics (Sharpe > 3 or profit factor > 5 with few trades)

## Risks and Unknowns

- Walk-forward complexity — rolling window retraining with parameter re-optimization is computationally and conceptually heavier than basic backtesting. Risk of scope creep or slow execution on larger datasets
- Grid search combinatorial explosion — sweeping 3 parameters × many values can get slow fast. Need bounded defaults and clear UX for progress/cancellation
- 8 research modules is a lot of UI surface — each needs an API endpoint, a React component, and proper result rendering. Risk of repetitive but necessary work
- Look-ahead bias prevention in vectorized engine — must be enforced by rolling-window-only computation, not just convention. Easy to accidentally use future data

## Existing Codebase / Prior Art

- `src/statistical_arbitrage/analysis/research.py` — 938 lines, 8 pure-Python research functions + 8 takeaway generators. Zero Dash imports. This is the analytical core being exposed via API and rendered in React
- `src/statistical_arbitrage/analysis/cointegration.py` — `PairAnalysis` class with cointegration test, spread calc, z-score, half-life. Used by research functions and will be used by backtester
- `src/statistical_arbitrage/app/pages/learn.py:1333` — `_generate_signals()` is the signal state machine (flat → long/short → exit/stop). Must be extracted into strategy module for backtester reuse
- `config/settings.py` — `StrategySettings` already has lookback_window=60, entry_threshold=2.0, exit_threshold=0.5, stop_loss=3.0, initial_capital=10000, position_size=0.5, transaction_fee=0.0025
- `src/statistical_arbitrage/strategy/` — empty `__init__.py`, ready for strategy implementation
- `src/statistical_arbitrage/backtesting/` — empty `__init__.py`, ready for backtesting engine
- `api/routers/analysis.py` — existing FastAPI analysis endpoints. No research endpoints yet
- `frontend/app/(dashboard)/` — existing pages for Academy, Scanner, Deep Dive, Glossary. Research and backtest pages need to be added
- `data/cache/` — ~40+ cached parquet files (20+ EUR pairs at 1h and 4h timeframes). All data for research/backtesting comes from here

> See `.gsd/DECISIONS.md` for all architectural and pattern decisions — it is an append-only register; read it during planning, append to it during execution.

## Relevant Requirements

- R008 — Eight research modules ported to React frontend with API endpoints
- R009 — Backtesting engine: equity curve, per-trade P&L, cumulative returns
- R010 — Performance metrics: Sharpe, Sortino, max drawdown, win rate, profit factor, avg holding period
- R011 — Multi-parameter grid search with heatmap visualization and data-driven recommendations
- R012 — Overfitting detection: inline warning banners when results look suspiciously good
- R013 — Look-ahead bias prevention enforced by architecture (rolling windows only)
- R014 — Walk-forward testing with rolling windows (must-have for M002)
- R015 — Honest reporting: every result shows assumptions, sample size, confidence qualifier
- R022 — Platform transparency extends to research/backtest outputs (partially validated in M001 Academy)
- R023 — Data quality pre-flight check before backtesting (blocks on critical issues, warns on minor)

## Scope

### In Scope

- FastAPI endpoints for all 8 research functions (wrapping existing pure-Python analysis)
- React pages for Research Hub (8 module UIs with controls, results, takeaway banners)
- Vectorized backtesting engine as pure Python (strategy/ and backtesting/ packages)
- Signal generation extracted from learn.py into reusable strategy module
- Backtest results page: equity curve, trade log table, metrics summary cards
- Entry/exit signal overlay on price chart
- Multi-parameter grid search with heatmap visualization (2-3 parameters)
- Walk-forward testing with rolling windows and meaningful result display
- Overfitting detection with inline warning banners (same visual language as research takeaways)
- Data quality pre-flight validation before backtesting
- Shared result format (Pydantic model envelope) for research and backtest results
- Honest-reporting metadata footer on every result: sample size, date range, fees assumed, confidence qualifier
- Research → backtest connected flow: one-click from research recommendation to backtest with pre-filled parameters

### Out of Scope / Non-Goals

- Event-driven backtesting engine (vectorized is sufficient for z-score mean-reversion)
- Slippage modeling beyond transaction fees (Bitvavo fees are the cost model)
- Multi-strategy orchestration or strategy composition
- Real-time or streaming data (all from cached parquet)
- Bayesian optimization (grid search is sufficient at this scale)
- Monte Carlo simulation
- Deployment or server-side execution — local dev only

## Technical Constraints

- Backtesting engine must be pure Python — no Dash or React imports. Same pattern as research.py
- All dataframe operations use Polars, not Pandas (D006)
- Charts use Plotly via react-plotly.js through the existing SSR-safe wrapper (D007, D011)
- Frontend follows M001 patterns: page-level fetch/cache, client-side derivation for interactive controls, shared typed contracts (M001 forward intelligence)
- Look-ahead bias prevention: signals computed from rolling windows only, no future data access possible in the engine's architecture
- Backend cointegration endpoint hardcodes 60-period z-score — backtester must compute its own z-scores from raw spread data with configurable windows

## Integration Points

- `analysis/research.py` — 8 functions exposed as FastAPI endpoints, consumed by React Research Hub
- `analysis/cointegration.py` (`PairAnalysis`) — used by backtesting engine for spread/z-score computation
- `data/cache/*.parquet` — all OHLCV data read directly from parquet (never via `get_candles()` to avoid API calls)
- `config/settings.py` (`StrategySettings`) — default parameters for strategy and backtesting
- Frontend `PairContext` — global pair/timeframe selector feeds into research and backtest pages
- Existing M001 UI patterns — dark theme, PlotlyChart wrapper, page layout conventions

## Open Questions

- Walk-forward window configuration: how many windows, what sizes? Needs experimentation — likely expose as user controls with sensible defaults
- Grid search bounds: what are reasonable default ranges for each parameter? Start from existing research sweep ranges and let user override
- Backtest execution time on large datasets: may need progress indicators or chunked execution for walk-forward × grid search combinations

## Implementation Decisions

- **Backtesting engine style:** Vectorized. Fast, simple, sufficient for z-score mean-reversion. Look-ahead prevention via rolling-window-only computation. Not event-driven.
- **Research ↔ backtest relationship:** Equally important, co-equal pillars. Connected flow — research modules surface parameter recommendations, one click pre-fills backtester.
- **Backtest results UX:** Single results dashboard — equity curve, trade log, metrics cards, honest-reporting footer, overfitting warnings. Not comparison-first.
- **Overfitting warnings:** Inline colored banners on the results page, same visual language as research takeaway banners (green/yellow/red).
- **Multi-parameter optimization:** Bounded grid search across 2-3 parameters with heatmap visualization. Automatic flagging when optimal point is surrounded by poor results. No Bayesian optimization.
- **Walk-forward priority:** Must-have for M002. Not deferred to later milestones.
- **Data quality validation:** Pre-flight check before every backtest. Blocks on critical issues (e.g., >20% missing data), warns on minor ones (a few interpolated candles).
- **Result format:** Shared Pydantic model envelope for both research and backtest results (pair, timeframe, parameters, timestamp, warnings).
- **Honest reporting:** Metadata footer on every result — sample size, date range, fees assumed, confidence qualifier. Not a separate expandable section.

## Agent's Discretion

- API endpoint design for research functions (route structure, request/response schemas)
- Exact overfitting thresholds (Sharpe > 3, profit factor > 5 are starting points — may adjust based on domain research)
- Walk-forward default window sizes and number of folds
- Grid search default parameter ranges
- How to chunk or parallelize slow grid-search + walk-forward combinations
- Internal architecture of the vectorized backtesting engine (data flow, class structure)
- How to extract `_generate_signals()` from learn.py (refactor approach)

## Deferred Ideas

- Monte Carlo simulation for confidence intervals on backtest results
- Strategy comparison view (run multiple strategies on the same pair)
- Parameter sensitivity surface plots (3D visualization of parameter landscape)
- Automated strategy selection ("given this pair, here's the best strategy")
