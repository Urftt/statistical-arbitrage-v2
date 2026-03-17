---
depends_on: [M001, M002, M003]
---

# M004: Live Automated Trading — DRAFT CONTEXT

**Gathered:** 2026-03-17
**Status:** Draft — needs dedicated discussion before planning

## Seed Material

This milestone enables real automated trading on Bitvavo. The final pillar: from paper trading to real money. This is the highest-stakes milestone — errors cost actual money.

### Key requirements
- R019: Live automated trading on Bitvavo
- R020: Risk management and position limits
- R021: Monitoring, alerting, and graceful recovery

### What we know
- Bitvavo API via CCXT supports order placement (requires API keys with trade permissions)
- The strategy execution and signal generation from M002/M003 are reused — the only change is submitting real orders instead of simulated ones
- Risk management is critical: max position size, concurrent position limits, daily loss limits, stop-loss enforcement
- The system needs to be reliable: handle API errors, connection drops, partial fills, and restarts gracefully
- Eventually runs on a home server (R025, deferred) for 24/7 operation

### Open questions for dedicated discussion
- Order types: market only, or limit orders for better fills?
- How to handle partial fills and order rejection?
- Risk limits: what are sensible defaults for initial live trading?
- Monitoring: email/Telegram alerts? Dashboard-only? What triggers an alert?
- Kill switch: how to emergency-stop all trading?
- Gradual scaling: start with tiny positions? How to gain confidence?
- Regulatory considerations for automated crypto trading in the Netherlands?
- API key security: how to store and protect trade-enabled API keys?
