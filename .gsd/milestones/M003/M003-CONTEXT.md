# M003: Paper Trading — Context

**Gathered:** 2026-03-18
**Status:** Ready for planning

## Project Description

Paper trading system that runs z-score mean-reversion strategies against live Bitvavo market data with simulated execution. Multiple pairs run simultaneously as background tasks inside the existing FastAPI process, with state persisted in SQLite so sessions survive restarts. A new `/paper-trading` dashboard page shows live positions, equity curve, trade log, and per-pair status.

## Why This Milestone

The backtesting engine (M002) proves strategies work on historical data. Paper trading proves they work in real-time — on data the system hasn't seen before, with real polling latency and clock-aligned signal generation. This is the trust-building step between "backtest looks promising" and "I'll risk real money on this." Without it, going from M002 to live trading (M004) is a leap of faith.

## User-Visible Outcome

### When this milestone is complete, the user can:

- Start paper trading sessions for multiple pairs from the `/paper-trading` page, with configurable strategy parameters
- Leave the system running in the background — it polls Bitvavo, generates signals, and executes simulated trades automatically
- Check back anytime to see current positions, unrealized P&L, completed trade history, and equity curve over time
- Stop, restart, or reconfigure sessions without losing historical trade data
- See the same fill model (close price + 0.25% fee) as the backtester, so paper results are mentally comparable to backtest predictions

### Entry point / environment

- Entry point: `http://localhost:3000/paper-trading` (new Next.js page) + `http://localhost:8000` (FastAPI with background paper trading loop)
- Environment: local dev (laptop)
- Live dependencies involved: Bitvavo public REST API via CCXT (polling, no API keys required for public OHLCV)

## Completion Class

- Contract complete means: paper trading loop executes trades against real polling data, persists state in SQLite, and the dashboard renders positions/equity/trades — proven by pytest + Playwright E2E
- Integration complete means: the full loop works end-to-end — FastAPI polls Bitvavo, detects signals, simulates fills, persists to SQLite, and the Next.js dashboard shows live state from the API
- Operational complete means: the daemon survives FastAPI restarts (SQLite state recovery), handles connection drops gracefully, and runs for hours without degradation

## Final Integrated Acceptance

To call this milestone complete, we must prove:

- Start paper trading on 2+ pairs, let it run for at least a few polling cycles, verify trades accumulate and equity updates in the dashboard
- Kill and restart the FastAPI process, verify paper trading resumes with historical state intact from SQLite
- The system handles Bitvavo API errors (timeout, rate limit) without crashing the daemon or corrupting state

## Risks and Unknowns

- **First real-time data consumption** — no polling loop exists today. Lifecycle management (start, stop, error recovery) inside FastAPI is new territory.
- **First SQLite in the project** — new persistence pattern alongside existing parquet. Schema design and migration story need thought.
- **Multi-pair concurrency** — multiple polling/signal loops running simultaneously inside one FastAPI process. asyncio task management at scale of 5-10 pairs.
- **Process lifecycle** — daemon must handle restarts, connection drops, stale state, and clock alignment for candle boundaries.
- **CCXT polling rate limits** — Bitvavo has rate limits. Polling 10 pairs every minute means 10+ API calls per cycle. Need to stay within limits.

## Existing Codebase / Prior Art

- `src/statistical_arbitrage/strategy/zscore_mean_reversion.py` — the strategy logic. Paper trading reuses the same signal generation functions (`generate_signals`, `calculate_hedge_ratio`, `calculate_spread`).
- `src/statistical_arbitrage/backtesting/engine.py` — backtesting engine. The fill model (close price + fee) and accounting logic should be consistent between backtest and paper trading.
- `src/statistical_arbitrage/backtesting/models.py` — Pydantic models for `StrategyParameters`, `SignalEvent`, `TradeLedgerRow`, `EquityPoint`, `MetricSummary`. Paper trading should reuse or extend these — not reinvent.
- `src/statistical_arbitrage/data/bitvavo_client.py` — CCXT client with `fetch_ohlcv`. Currently REST-only. Paper trading will poll this for fresh candles.
- `src/statistical_arbitrage/data/cache_manager.py` — parquet cache layer. Paper trading may optionally append polled data to cache, but SQLite is the primary state store.
- `api/main.py` — FastAPI app factory with lifespan. The paper trading daemon will hook into the FastAPI lifespan for startup/shutdown.
- `api/routers/backtest.py` — backtest API router. Pattern reference for how paper trading endpoints should be structured.
- `frontend/components/backtest/BacktestResultView.tsx` — existing backtest result rendering. Reference for paper trading dashboard components (equity curve, trade log, metrics).
- `config/settings.py` — `StrategySettings` with default parameters. Paper trading sessions will use these as defaults.

> See `.gsd/DECISIONS.md` for all architectural and pattern decisions — it is an append-only register; read it during planning, append to it during execution.

## Relevant Requirements

- R017 — Run strategies against live market data with simulated execution. **This is the primary requirement for M003.**
- R018 — Portfolio/position tracking dashboard. **Partially addressed here** — the paper trading dashboard covers paper positions. Shared with M004 for live positions.
- R021 — System health monitoring, anomaly alerting, graceful recovery. **Foundational work here** — the daemon needs restart recovery and connection error handling. Full operational monitoring deferred to M004.

## Scope

### In Scope

- Background paper trading daemon inside FastAPI (asyncio tasks)
- CCXT REST polling for live candle data (1-5 minute intervals)
- Z-score mean-reversion signal generation reusing existing strategy code
- Simple fill simulation (close price + 0.25% fee, matching backtester)
- SQLite persistence for sessions, positions, trades, equity history
- Multi-pair support — run paper trading on multiple pairs simultaneously
- `/paper-trading` dashboard page: session management (start/stop/configure), live positions with unrealized P&L, trade history table, equity curve chart, per-pair status
- FastAPI restart recovery — resume sessions from SQLite state
- Connection error handling — retry on Bitvavo API failures without crashing
- API endpoints for session CRUD, position queries, trade history, equity data

### Out of Scope / Non-Goals

- WebSocket or streaming data (polling is sufficient for stat arb signal latency)
- Realistic fill simulation (slippage, partial fills, order book)
- Backtest-vs-paper comparison dashboard
- Push notifications or alerting outside the dashboard
- Real order execution (that's M004)
- Multi-exchange support
- Server deployment (local-only for now)

## Technical Constraints

- Python 3.12, UV package manager
- Polars for dataframes (not Pandas) — though SQLite queries may return dicts/lists
- FastAPI + Uvicorn for the backend daemon
- Next.js 16 + Mantine v8 + react-plotly.js for the dashboard
- CCXT REST API for Bitvavo data (no API keys needed for public OHLCV)
- SQLite via Python stdlib `sqlite3` or `aiosqlite` — no ORM, keep it simple
- Strategy/paper-trading engine code must be pure Python — no web framework imports
- Bitvavo rate limit: ~10 requests/second (configurable in settings)

## Integration Points

- **Bitvavo via CCXT** — polling `fetch_ohlcv` for live candle data. Must handle rate limits, timeouts, and partial data.
- **Existing strategy code** — `zscore_mean_reversion.py` signal generation. Paper trading calls the same functions with fresh data.
- **Existing backtest models** — `StrategyParameters`, `SignalEvent`, `TradeLedgerRow`, etc. Reuse or extend for paper trading state.
- **FastAPI lifespan** — daemon startup/shutdown hooks. Background asyncio tasks for polling loops.
- **SQLite** — new persistence layer. Paper trading state lives here. Parquet cache remains for historical OHLCV.
- **Next.js frontend** — new `/paper-trading` page consuming new API endpoints. Dashboard components for positions, trades, equity.

## Open Questions

- **Polling interval granularity** — should it match the pair's timeframe (e.g., poll every 1h for 1h candles) or be a fixed shorter interval (e.g., every 1-5 min regardless of timeframe)? Leaning toward: poll frequently, only act on new completed candles.
- **SQLite schema evolution** — how to handle schema changes across project iterations? Leaning toward: simple version table + migration scripts, not an ORM.
- **Candle completion detection** — how to know when a candle is "complete" vs still forming? Leaning toward: only act on the previous completed candle, never the current in-progress one.
