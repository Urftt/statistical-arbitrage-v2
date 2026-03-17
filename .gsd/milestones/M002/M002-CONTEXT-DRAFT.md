---
depends_on: [M001]
---

# M002: Research & Backtest — DRAFT CONTEXT

**Gathered:** 2026-03-17
**Status:** Draft — needs dedicated discussion before planning

## Seed Material

This milestone ports the 8 existing research modules to the new React frontend and builds the backtesting engine. It's the second pillar: "Research & Backtest."

### What exists
- `analysis/research.py` — 8 empirical research functions (938 lines, zero Dash imports): rolling cointegration stability, out-of-sample validation, timeframe comparison, spread method comparison, z-score threshold sweep, lookback window sweep, transaction cost analysis, cointegration method comparison.
- Each function has a corresponding `_takeaway()` generator that produces colored insight banners.
- 48 unit tests cover all research functions and takeaway generators.
- `config/settings.py` has `StrategySettings` with lookback_window=60, entry_threshold=2.0, exit_threshold=0.5, stop_loss=3.0, initial_capital=10000, position_size=0.5, transaction_fee=0.0025.

### Key requirements
- R008: 8 research modules for empirical parameter testing
- R009: Backtesting engine with equity curve, per-trade P&L
- R010: Performance metrics (Sharpe, Sortino, max drawdown, win rate, profit factor)
- R011: Strategy parameter sweeps with data-driven recommendations
- R012: Overfitting detection (flag suspicious metrics)
- R013: Look-ahead bias prevention
- R014: Walk-forward testing with rolling windows
- R015: Honest reporting (always show assumptions and limitations)
- R023: Data quality validation before backtesting

### Key decisions from discussion
- The backtester must be "transparent + honest" — no vanity metrics, always show assumptions
- The system should both test hypotheses AND proactively surface insights ("data tells you what works")
- Overfitting detection is architecturally required, not optional
- Research functions stay as pure Python; UI is a thin wrapper

### Open questions for dedicated discussion
- Backtesting engine design: event-driven vs vectorized? How to enforce look-ahead bias prevention architecturally?
- How to present overfitting warnings without being annoying — when is a result "suspiciously good"?
- Multi-parameter optimization: grid search? Bayesian? How to avoid combinatorial explosion?
- Walk-forward testing: how many windows? How to present results meaningfully?
- Should research and backtest share a common result format for comparison?
