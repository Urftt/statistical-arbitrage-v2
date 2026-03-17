# M002: Research & Backtest — Research

**Gathered:** 2026-03-17
**Status:** Ready for planning

## Summary

M002 has two co-equal pillars: (1) port the 8 existing pure-Python research modules to FastAPI endpoints + React UIs, and (2) build a complete backtesting engine from scratch. The research pillar is largely mechanical — the analysis functions exist, are tested, and need only thin API wrappers plus React rendering. The backtesting pillar is the real construction effort and the primary risk area.

The existing codebase provides strong foundations. `analysis/research.py` (938 lines) contains all 8 research functions plus 8 takeaway generators. The signal state machine in `learn.py:1333` is the seed for the strategy module. `config/settings.py` already defines `StrategySettings`. The `strategy/` and `backtesting/` packages exist as empty stubs.

The critical path is: extract signals → build strategy module → build backtest engine → build performance metrics → then everything else depends on those.

## Recommendation

Prove the backtesting engine first. Research API endpoints are mechanical wrappers with almost no risk. Build order: strategy module, backtest engine, performance metrics (Phase 1) → research API endpoints (Phase 2, parallelizable) → grid search, walk-forward, overfitting detection (Phase 3) → frontend pages (Phase 4).

## Key Files and Build Order

See M002-RESEARCH.md for full implementation landscape details.