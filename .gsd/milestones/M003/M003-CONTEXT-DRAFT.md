---
depends_on: [M001, M002]
---

# M003: Paper Trading — DRAFT CONTEXT

**Gathered:** 2026-03-17
**Status:** Draft — needs dedicated discussion before planning

## Seed Material

This milestone builds the paper trading system — running strategies against live market data with simulated execution. Third pillar: the bridge between backtesting and live trading.

### Key requirements
- R017: Paper trading with simulated execution on real-time data
- R018: Portfolio/position tracking dashboard

### What we know
- Bitvavo provides real-time market data via CCXT (WebSocket or polling)
- The backtesting engine from M002 will define the strategy execution logic — paper trading reuses the same signal generation
- Position tracking, fill simulation, and P&L calculation need to work identically to how live trading would work (minus real order submission)
- The portfolio dashboard serves both paper and live trading (M004)

### Open questions for dedicated discussion
- Real-time data: WebSocket vs polling? What latency is acceptable for stat arb signals?
- Fill simulation: simple (execute at current price) vs realistic (add slippage, partial fills)?
- How long should paper trading run before trusting results? What metrics matter most?
- Should paper trading results be compared against backtest predictions to validate the backtester?
- State persistence: where do paper trades live? In-memory, SQLite, parquet?
