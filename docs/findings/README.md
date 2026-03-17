# Research Findings

This directory contains documented findings from our statistical arbitrage research. Each document focuses on a specific analysis topic and serves as a reference to avoid re-running notebooks and digging through data.

## Index

### Completed

1. **[01_pair_discovery_cointegration.md](01_pair_discovery_cointegration.md)** *(2025-11-03)*
   - Systematic testing of 40 cryptocurrency pairs
   - Identification of 10 cointegrated pairs at 1h timeframe
   - Multi-timeframe analysis (15m, 1h, 4h, 1d)
   - Discovery of temporal instability in cointegration relationships

### Planned

2. **02_rolling_window_stability.md** *(Pending)*
   - Time-series analysis of cointegration stability
   - Rolling window cointegration tests
   - Regime detection and breakpoint analysis

3. **03_spread_analysis.md** *(Pending)*
   - Spread distribution and stationarity verification
   - Z-score analysis for trading signals
   - Half-life validation across time periods

4. **04_backtesting_results.md** *(Pending)*
   - Strategy performance metrics
   - Transaction cost impact analysis
   - Risk-adjusted returns (Sharpe, Sortino, max drawdown)

5. **05_live_monitoring.md** *(Pending)*
   - Real-time cointegration monitoring framework
   - Alert systems and breakpoint detection
   - Performance tracking vs backtest expectations

---

## Document Template

Each findings document should follow this structure:

```markdown
# [Topic Title]

**Date**: YYYY-MM-DD
**Related Notebooks**: List notebook filenames
**Status**: [Research/Validated/Deprecated]

## Summary
Brief 2-3 sentence overview

## Methodology
- Data sources
- Time periods
- Statistical methods
- Parameters used

## Results
Key findings with tables/numbers

## Implications
What this means for trading strategy

## Limitations
Known issues or caveats

## Next Steps
Follow-up research needed

## References
- Notebook paths
- External papers/resources
```

---

*Last Updated: 2025-11-03*
