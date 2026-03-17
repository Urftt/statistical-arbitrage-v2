# Requirements

This file is the explicit capability and coverage contract for the project.

Use it to track what is actively in scope, what has been validated by completed work, what is intentionally deferred, and what is explicitly out of scope.

## Active

### R001 — Academy teaches stat arb with 6 structured steps using real pair data
- Class: primary-user-loop
- Status: active
- Description: The Academy walks the user through statistical arbitrage in 6 steps: pair selection → price comparison → correlation vs cointegration → cointegration test → spread → z-score & signals. Each step uses the user's actual pair data, not synthetic examples.
- Why it matters: This is how the user learns the domain — the prerequisite for everything else. Real data makes concepts concrete and memorable.
- Source: user
- Primary owning slice: M001/S03
- Supporting slices: M001/S04
- Validation: S03: Steps 1-3 working with real data and stepper infrastructure. Steps 4-6 needed (S04) for full validation.
- Notes: The 6 steps match the existing Dash implementation. Content is right, execution needs polish.

### R002 — Three-layer educational panels (Intuition → How It Works → Your Pair)
- Class: primary-user-loop
- Status: active
- Description: Each Academy step provides content at three depths: 💡 Intuition (analogy/everyday explanation), 🔧 How It Works (formula, mechanics, the actual math), 📊 Your Pair (what the numbers mean for the selected pair).
- Why it matters: Different learning depths for different moments. The user should never feel like the math is hidden — but shouldn't be forced to see it all at once either.
- Source: user
- Primary owning slice: M001/S03
- Supporting slices: M001/S04
- Validation: unmapped
- Notes: Accordion-based panels in the existing Dash app. Rebuild with React components.

### R003 — Interactive charts with live parameter sliders in Academy
- Class: primary-user-loop
- Status: active
- Description: Academy steps 5-6 (spread and z-score) have parameter sliders that update charts in real-time — lookback window, entry/exit thresholds, etc.
- Why it matters: Interactive parameter exploration is how the user builds intuition for what parameter values actually mean.
- Source: user
- Primary owning slice: M001/S04
- Supporting slices: none
- Validation: unmapped
- Notes: Existing Dash implementation has this but with callback jank. React state management should make this smoother.

### R004 — React frontend with full UX control (replaces Dash)
- Class: core-capability
- Status: active
- Description: The Dash app is replaced with a Next.js React frontend. This gives full control over layout, animations, state management, and component composition.
- Why it matters: Dash's callback model caused jank and limited what was possible for the Academy's guided learning experience. The look and feel of the learning flow is pedagogically important.
- Source: user
- Primary owning slice: M001/S02
- Supporting slices: M001/S03, M001/S04, M001/S05, M001/S06
- Validation: unmapped
- Notes: Migration motivated by callback jank, not aesthetics.

### R005 — FastAPI backend exposing analysis functions as API endpoints
- Class: core-capability
- Status: active
- Description: FastAPI wraps the existing Python analysis code (PairAnalysis, research functions, data pipeline) as REST API endpoints. The frontend calls these endpoints instead of running Python directly.
- Why it matters: Clean separation between analysis engine and UI. The analysis code is already UI-free — this makes the split explicit.
- Source: user
- Primary owning slice: M001/S01
- Supporting slices: none
- Validation: unmapped
- Notes: analysis/research.py already has zero Dash imports. Migration path is natural.

### R006 — Global pair selector and timeframe picker
- Class: primary-user-loop
- Status: active
- Description: A persistent pair selector (asset1, asset2, timeframe) in the app header that propagates to all pages. Pairs populated from cached data.
- Why it matters: Pair selection is the common entry point for every feature — Academy, Scanner, Deep Dive, Research. It should be always-visible and consistent.
- Source: user
- Primary owning slice: M001/S02
- Supporting slices: M001/S03, M001/S05
- Validation: unmapped
- Notes: Exists in current Dash layout. Needs rebuild in React with proper state propagation.

### R007 — Dark theme with Plotly chart integration
- Class: quality-attribute
- Status: active
- Description: Consistent dark theme across the entire app. Plotly charts use the existing mantine_dark template (or equivalent) for visual cohesion. Charts render in the React app via react-plotly.js.
- Why it matters: Visual consistency matters for a tool you use daily. The existing Plotly template is well-tuned.
- Source: user
- Primary owning slice: M001/S02
- Supporting slices: none
- Validation: unmapped
- Notes: The existing mantine_dark Plotly template defines colors, fonts, grid styling.

### R008 — 8 research modules for empirical parameter testing
- Class: primary-user-loop
- Status: active
- Description: Eight research modules: rolling stability, out-of-sample validation, timeframe comparison, spread method, z-score threshold sweep, lookback window sweep, transaction costs, cointegration method comparison. Each takes real data, runs analysis, returns structured results with auto-generated takeaway banners.
- Why it matters: These are the tools for data-driven decision making — testing what actually works vs what textbooks claim.
- Source: user
- Primary owning slice: M002/S01
- Supporting slices: none
- Validation: unmapped
- Notes: Analysis functions exist in research.py (938 lines). UI needs rebuild. Takeaway generators have 48 tests.

### R009 — Backtesting engine with equity curve, per-trade P&L, cumulative returns
- Class: core-capability
- Status: active
- Description: Run a z-score mean-reversion strategy over historical data. Track equity curve, individual trade outcomes, and cumulative returns. Results as a structured Pydantic model.
- Why it matters: Historical performance validation is the bridge between research and real trading.
- Source: user
- Primary owning slice: M002/S02
- Supporting slices: none
- Validation: unmapped
- Notes: StrategySettings already defined in config/settings.py with lookback, thresholds, capital, fees.

### R010 — Performance metrics: Sharpe, Sortino, max drawdown, win rate, profit factor
- Class: core-capability
- Status: active
- Description: Comprehensive performance metrics for backtest results. Must include risk-adjusted returns (Sharpe, Sortino), drawdown analysis, win rate, profit factor, average holding period.
- Why it matters: You can't evaluate a strategy without proper metrics. These are the standard quantitative measures.
- Source: user
- Primary owning slice: M002/S02
- Supporting slices: none
- Validation: unmapped
- Notes: none

### R011 — Strategy parameter sweeps with data-driven recommendations
- Class: differentiator
- Status: active
- Description: The system can sweep parameters (z-score thresholds, lookback windows, etc.) across ranges and surface which combinations actually work on the user's data. Not just testing what the user asks — proactively showing what the data says.
- Why it matters: This is the "data tells you what works" requirement. The system should discover, not just confirm.
- Source: user
- Primary owning slice: M002/S03
- Supporting slices: none
- Validation: unmapped
- Notes: Existing research modules do single-parameter sweeps. This extends to multi-parameter optimization with honest reporting.

### R012 — Overfitting detection — flag suspicious metrics, parameter sensitivity warnings
- Class: failure-visibility
- Status: active
- Description: The backtester and research tools actively warn when results look too good: Sharpe > 3, profit factor > 5 with few trades, results that collapse with small parameter changes, in-sample vs out-of-sample divergence.
- Why it matters: The platform must never give false confidence. Overfitting is the primary way backtests lie.
- Source: research
- Primary owning slice: M002/S03
- Supporting slices: none
- Validation: unmapped
- Notes: Research confirms these thresholds as standard overfitting indicators.

### R013 — Look-ahead bias prevention in backtesting engine
- Class: constraint
- Status: active
- Description: The backtesting engine must never use data from time t+1 to make decisions at time t. All indicators use only historically available data. Enforced by architecture, not just convention.
- Why it matters: Look-ahead bias is the most common way backtests produce false results. The platform's "honest" commitment requires structural prevention.
- Source: research
- Primary owning slice: M002/S02
- Supporting slices: none
- Validation: unmapped
- Notes: Architectural enforcement: signals computed from rolling windows only, no future data access possible.

### R014 — Walk-forward testing with rolling windows
- Class: differentiator
- Status: active
- Description: Beyond simple train/test split: retrain strategy parameters on rolling windows and test on subsequent periods. This simulates what would actually happen if you re-optimized periodically.
- Why it matters: Walk-forward is the gold standard for realistic backtesting. It surfaces regime changes and parameter decay.
- Source: research
- Primary owning slice: M002/S03
- Supporting slices: none
- Validation: unmapped
- Notes: The existing OOS validation module is a stepping stone. Walk-forward extends this concept.

### R015 — Honest reporting — always show assumptions, limitations, and confidence levels
- Class: quality-attribute
- Status: active
- Description: Every backtest result, research finding, and recommendation explicitly states its assumptions, sample size, confidence level, and limitations. No vanity metrics. No hiding bad results.
- Why it matters: This is the "transparent + honest" constraint applied to every output. The platform should never give you more confidence than the evidence warrants.
- Source: user
- Primary owning slice: M002/S02
- Supporting slices: M002/S01, M002/S03
- Validation: unmapped
- Notes: Applies to research module takeaways, backtest summaries, and parameter recommendations.

### R016 — Existing parquet cache + CCXT/Bitvavo data pipeline preserved
- Class: continuity
- Status: active
- Description: The working data pipeline (CCXT → Bitvavo → parquet cache with delta updates) and existing ~20 EUR pair cache are preserved and accessible through the new API layer.
- Why it matters: This is months of collected data. The pipeline works. Don't break it.
- Source: user
- Primary owning slice: M001/S01
- Supporting slices: none
- Validation: unmapped
- Notes: cache_manager.py and bitvavo_client.py stay as-is. API wraps them.

### R017 — Paper trading with simulated execution on real-time data
- Class: core-capability
- Status: active
- Description: Run strategies against live market data with simulated order execution. Track positions, fills, and P&L as if trading real money.
- Why it matters: Bridge between backtesting and live trading. Validates that the strategy works in real-time, not just historically.
- Source: user
- Primary owning slice: M003/S01
- Supporting slices: none
- Validation: unmapped
- Notes: Requires real-time or near-real-time data feed from Bitvavo.

### R018 — Portfolio/position tracking dashboard
- Class: primary-user-loop
- Status: active
- Description: Dashboard showing current positions, unrealized P&L, trade history, and portfolio equity over time. For both paper and live trading.
- Why it matters: You need to see what the system is doing and how it's performing at a glance.
- Source: user
- Primary owning slice: M003/S02
- Supporting slices: M004
- Validation: unmapped
- Notes: none

### R019 — Live automated trading on Bitvavo
- Class: core-capability
- Status: active
- Description: Execute real buy/sell orders on Bitvavo based on strategy signals. Automated position management.
- Why it matters: The end goal of the entire platform.
- Source: user
- Primary owning slice: M004/S01
- Supporting slices: none
- Validation: unmapped
- Notes: Requires Bitvavo API keys for trading (not just public data).

### R020 — Risk management and position limits
- Class: constraint
- Status: active
- Description: Configurable risk limits: max position size, max concurrent positions, daily loss limits, stop-loss enforcement.
- Why it matters: Automated trading without risk limits is a fast way to lose money.
- Source: user
- Primary owning slice: M004/S02
- Supporting slices: none
- Validation: unmapped
- Notes: none

### R021 — Monitoring, alerting, and graceful recovery
- Class: operability
- Status: active
- Description: The trading system monitors its own health, alerts on anomalies (missed signals, API errors, position drift), and recovers gracefully from restarts or connection drops.
- Why it matters: An automated trader that silently fails is worse than no trader at all.
- Source: user
- Primary owning slice: M004/S03
- Supporting slices: none
- Validation: unmapped
- Notes: Especially important for always-on server deployment later.

### R022 — Platform never feels like a black box — math and reasoning always visible
- Class: quality-attribute
- Status: active
- Description: Every formula, statistical test, parameter choice, and trading decision is visible and explainable. The Academy shows the why. The research tools show the evidence. The backtester shows the assumptions.
- Why it matters: This is the philosophical anchor. The user wants to understand what's happening, not just trust a number.
- Source: user
- Primary owning slice: M001/S03
- Supporting slices: M001/S04, M002/S01, M002/S02
- Validation: S03: Steps 1-3 explain correlation, cointegration, price normalization with 3-layer depth. Visibility pattern established. Full validation requires S04 (steps 4-6) and M002 (research/backtest transparency).
- Notes: Applies to every pillar. This is what "transparent + honest" means in practice.

### R023 — Data quality validation before backtesting (missing candles, gaps)
- Class: failure-visibility
- Status: active
- Description: Before running a backtest, validate the input data for completeness: check for missing candles, timestamp gaps, and anomalous values. Report issues clearly.
- Why it matters: Bad data produces misleading results. The platform should catch this before wasting time on a flawed backtest.
- Source: research
- Primary owning slice: M002/S02
- Supporting slices: none
- Validation: unmapped
- Notes: Research consistently flags data quality as a top backtesting pitfall.

## Validated

(none yet)

## Deferred

### R024 — Multi-exchange support
- Class: core-capability
- Status: deferred
- Description: Support exchanges beyond Bitvavo (Binance, Kraken, etc.)
- Why it matters: Would expand the pair universe and liquidity options.
- Source: user
- Primary owning slice: none
- Supporting slices: none
- Validation: unmapped
- Notes: User explicitly chose Bitvavo-only for now. Revisit if trading scope expands.

### R025 — Server deployment (home server)
- Class: operability
- Status: deferred
- Description: Deploy the platform to a home server for always-on operation.
- Why it matters: Required for 24/7 automated trading. Not needed during development.
- Source: user
- Primary owning slice: none
- Supporting slices: none
- Validation: unmapped
- Notes: User confirmed: local during development, migrate to home server if live trading succeeds.

### R026 — Glossary with searchable terms and cross-links
- Class: primary-user-loop
- Status: deferred
- Description: Searchable glossary of 17+ stat arb terms with cross-links from Academy educational panels.
- Why it matters: Quick reference while learning. The existing Dash glossary works but is deprioritized for M001.
- Source: user
- Primary owning slice: M001/S06
- Supporting slices: none
- Validation: unmapped
- Notes: Already built in Dash. Port during M001/S06 polish slice.

## Out of Scope

### R027 — Mobile app
- Class: anti-feature
- Status: out-of-scope
- Description: Native mobile application for iOS or Android.
- Why it matters: Prevents scope creep. This is a desktop/laptop research and trading tool.
- Source: inferred
- Primary owning slice: none
- Supporting slices: none
- Validation: n/a
- Notes: Personal tool used on laptop/desktop.

### R028 — Multi-user / auth system
- Class: anti-feature
- Status: out-of-scope
- Description: User accounts, authentication, or multi-tenant support.
- Why it matters: This is a personal tool. Auth adds complexity with zero value.
- Source: inferred
- Primary owning slice: none
- Supporting slices: none
- Validation: n/a
- Notes: Single user, local development.

## Traceability

| ID | Class | Status | Primary owner | Supporting | Proof |
|---|---|---|---|---|---|
| R001 | primary-user-loop | active | M001/S03 | M001/S04 | S03: steps 1-3 proven |
| R002 | primary-user-loop | active | M001/S03 | M001/S04 | S03: 3-layer panels on steps 1-3 |
| R003 | primary-user-loop | active | M001/S04 | none | unmapped |
| R004 | core-capability | active | M001/S02 | M001/S03-S06 | unmapped |
| R005 | core-capability | active | M001/S01 | none | unmapped |
| R006 | primary-user-loop | active | M001/S02 | M001/S03, S05 | unmapped |
| R007 | quality-attribute | active | M001/S02 | none | unmapped |
| R008 | primary-user-loop | active | M002/S01 | none | unmapped |
| R009 | core-capability | active | M002/S02 | none | unmapped |
| R010 | core-capability | active | M002/S02 | none | unmapped |
| R011 | differentiator | active | M002/S03 | none | unmapped |
| R012 | failure-visibility | active | M002/S03 | none | unmapped |
| R013 | constraint | active | M002/S02 | none | unmapped |
| R014 | differentiator | active | M002/S03 | none | unmapped |
| R015 | quality-attribute | active | M002/S02 | M002/S01, S03 | unmapped |
| R016 | continuity | active | M001/S01 | none | unmapped |
| R017 | core-capability | active | M003/S01 | none | unmapped |
| R018 | primary-user-loop | active | M003/S02 | M004 | unmapped |
| R019 | core-capability | active | M004/S01 | none | unmapped |
| R020 | constraint | active | M004/S02 | none | unmapped |
| R021 | operability | active | M004/S03 | none | unmapped |
| R022 | quality-attribute | active | M001/S03 | M001/S04, M002 | S03: visibility in steps 1-3 |
| R023 | failure-visibility | active | M002/S02 | none | unmapped |
| R024 | core-capability | deferred | none | none | unmapped |
| R025 | operability | deferred | none | none | unmapped |
| R026 | primary-user-loop | deferred | M001/S06 | none | unmapped |
| R027 | anti-feature | out-of-scope | none | none | n/a |
| R028 | anti-feature | out-of-scope | none | none | n/a |

## Coverage Summary

- Active requirements: 23
- Mapped to slices: 23
- Validated: 0
- Unmapped active requirements: 0
