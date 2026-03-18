# Requirements

This file is the explicit capability and coverage contract for the project.

## Active

### R011 — The system can sweep parameters (z-score thresholds, lookback windows, etc.) across ranges and surface which combinations actually work on the user's data. Not just testing what the user asks — proactively showing what the data says.
- Class: differentiator
- Status: active
- Description: The system can sweep parameters (z-score thresholds, lookback windows, etc.) across ranges and surface which combinations actually work on the user's data. Not just testing what the user asks — proactively showing what the data says.
- Why it matters: This is the "data tells you what works" requirement. The system should discover, not just confirm.
- Source: user
- Primary owning slice: M002/S03
- Supporting slices: none
- Validation: unmapped
- Notes: Existing research modules do single-parameter sweeps. This extends to multi-parameter optimization with honest reporting.

### R012 — The backtester and research tools actively warn when results look too good: Sharpe > 3, profit factor > 5 with few trades, results that collapse with small parameter changes, in-sample vs out-of-sample divergence.
- Class: failure-visibility
- Status: active
- Description: The backtester and research tools actively warn when results look too good: Sharpe > 3, profit factor > 5 with few trades, results that collapse with small parameter changes, in-sample vs out-of-sample divergence.
- Why it matters: The platform must never give false confidence. Overfitting is the primary way backtests lie.
- Source: research
- Primary owning slice: M002/S03
- Supporting slices: none
- Validation: unmapped
- Notes: Research confirms these thresholds as standard overfitting indicators.

### R014 — Beyond simple train/test split: retrain strategy parameters on rolling windows and test on subsequent periods. This simulates what would actually happen if you re-optimized periodically.
- Class: differentiator
- Status: active
- Description: Beyond simple train/test split: retrain strategy parameters on rolling windows and test on subsequent periods. This simulates what would actually happen if you re-optimized periodically.
- Why it matters: Walk-forward is the gold standard for realistic backtesting. It surfaces regime changes and parameter decay.
- Source: research
- Primary owning slice: M002/S03
- Supporting slices: none
- Validation: unmapped
- Notes: The existing OOS validation module is a stepping stone. Walk-forward extends this concept.

### R015 — Every backtest result, research finding, and recommendation explicitly states its assumptions, sample size, confidence level, and limitations. No vanity metrics. No hiding bad results.
- Class: quality-attribute
- Status: active
- Description: Every backtest result, research finding, and recommendation explicitly states its assumptions, sample size, confidence level, and limitations. No vanity metrics. No hiding bad results.
- Why it matters: This is the "transparent + honest" constraint applied to every output. The platform should never give you more confidence than the evidence warrants.
- Source: user
- Primary owning slice: M002/S02
- Supporting slices: M002/S01, M002/S03
- Validation: S01: Backtest outputs expose assumptions, warnings, data-quality state, and honest-reporting footer. S02: All 8 research modules expose structured takeaway payloads with severity, observations count, date range, and fee assumptions. The transparency contract covers the full research surface. Remaining: S03 must extend this to optimization and walk-forward results.
- Notes: S01 established the trust-reporting contract. S02 extended it across all 8 research modules: every response includes sample size (observations, days_back), date range context, fee assumptions (tx-cost), takeaway severity, and module-specific limitations. Full validation requires S03 (optimization transparency with robustness annotations and overfitting warnings).

### R017 — Run strategies against live market data with simulated order execution. Track positions, fills, and P&L as if trading real money.
- Class: core-capability
- Status: active
- Description: Run strategies against live market data with simulated order execution. Track positions, fills, and P&L as if trading real money.
- Why it matters: Bridge between backtesting and live trading. Validates that the strategy works in real-time, not just historically.
- Source: user
- Primary owning slice: M003/S01
- Supporting slices: none
- Validation: unmapped
- Notes: Requires real-time or near-real-time data feed from Bitvavo.

### R018 — Dashboard showing current positions, unrealized P&L, trade history, and portfolio equity over time. For both paper and live trading.
- Class: primary-user-loop
- Status: active
- Description: Dashboard showing current positions, unrealized P&L, trade history, and portfolio equity over time. For both paper and live trading.
- Why it matters: You need to see what the system is doing and how it's performing at a glance.
- Source: user
- Primary owning slice: M003/S02
- Supporting slices: M004
- Validation: unmapped
- Notes: none

### R019 — Execute real buy/sell orders on Bitvavo based on strategy signals. Automated position management.
- Class: core-capability
- Status: active
- Description: Execute real buy/sell orders on Bitvavo based on strategy signals. Automated position management.
- Why it matters: The end goal of the entire platform.
- Source: user
- Primary owning slice: M004/S01
- Supporting slices: none
- Validation: unmapped
- Notes: Requires Bitvavo API keys for trading (not just public data).

### R020 — Configurable risk limits: max position size, max concurrent positions, daily loss limits, stop-loss enforcement.
- Class: constraint
- Status: active
- Description: Configurable risk limits: max position size, max concurrent positions, daily loss limits, stop-loss enforcement.
- Why it matters: Automated trading without risk limits is a fast way to lose money.
- Source: user
- Primary owning slice: M004/S02
- Supporting slices: none
- Validation: unmapped
- Notes: none

### R021 — The trading system monitors its own health, alerts on anomalies (missed signals, API errors, position drift), and recovers gracefully from restarts or connection drops.
- Class: operability
- Status: active
- Description: The trading system monitors its own health, alerts on anomalies (missed signals, API errors, position drift), and recovers gracefully from restarts or connection drops.
- Why it matters: An automated trader that silently fails is worse than no trader at all.
- Source: user
- Primary owning slice: M004/S03
- Supporting slices: none
- Validation: unmapped
- Notes: Especially important for always-on server deployment later.

### R022 — Every formula, statistical test, parameter choice, and trading decision is visible and explainable. The Academy shows the why. The research tools show the evidence. The backtester shows the assumptions.
- Class: quality-attribute
- Status: active
- Description: Every formula, statistical test, parameter choice, and trading decision is visible and explainable. The Academy shows the why. The research tools show the evidence. The backtester shows the assumptions.
- Why it matters: This is the philosophical anchor. The user wants to understand what's happening, not just trust a number.
- Source: user
- Primary owning slice: M001/S03
- Supporting slices: M001/S04, M002/S01, M002/S02
- Validation: S03: Steps 1-3 explain correlation, cointegration, price normalization with 3-layer depth. S04: Steps 4-6 show ADF test, Engle-Granger, spread formula, z-score formula, and signal rules. S01: Backtest execution model, fee model, assumptions, and limitations visible in honest-reporting footer. S02: All 8 research modules show data, charts, stat cards, and contextual takeaway for evidence visibility. Full validation requires S03 (optimization transparency).
- Notes: Academy visibility proven in M001. S01 made backtest execution model, fee model, data basis, and limitations visible. S02 extended evidence visibility to all 8 research modules: each shows stat cards, charts, data tables, and contextual takeaway alongside recommendations. Still needs S03 (optimization transparency) for full validation.

### R023 — Before running a backtest, validate the input data for completeness: check for missing candles, timestamp gaps, and anomalous values. Report issues clearly.
- Class: failure-visibility
- Status: active
- Description: Before running a backtest, validate the input data for completeness: check for missing candles, timestamp gaps, and anomalous values. Report issues clearly.
- Why it matters: Bad data produces misleading results. The platform should catch this before wasting time on a flawed backtest.
- Source: research
- Primary owning slice: M002/S01
- Supporting slices: none
- Validation: S01: Preflight validates input data with structured blocker/warning separation, surfaced in both API and UI. Partial — missing-candle gap detection not yet implemented.
- Notes: S01 built preflight checking for nulls, non-finite values, impossible prices, short histories, and non-monotonic timestamps. Explicit regular-interval candle-gap detection still needed before closing. Gap detection should be addressed in S02 or S03.

## Validated

### R001 — The Academy walks the user through statistical arbitrage in 6 steps: pair selection → price comparison → correlation vs cointegration → cointegration test → spread → z-score & signals. Each step uses the user's actual pair data, not synthetic examples.
- Class: primary-user-loop
- Status: validated
- Description: The Academy walks the user through statistical arbitrage in 6 steps: pair selection → price comparison → correlation vs cointegration → cointegration test → spread → z-score & signals. Each step uses the user's actual pair data, not synthetic examples.
- Why it matters: This is how the user learns the domain — the prerequisite for everything else. Real data makes concepts concrete and memorable.
- Source: user
- Primary owning slice: M001/S03
- Supporting slices: M001/S04
- Validation: S03: Steps 1-3 working with real data and stepper infrastructure. S04: Steps 4-6 complete with real data, interactive charts, and educational panels. Full 6-step flow verified end-to-end with BTC/ETH pair.
- Notes: The 6 steps match the existing Dash implementation. Content is right, execution needs polish.

### R002 — Each Academy step provides content at three depths: 💡 Intuition (analogy/everyday explanation), 🔧 How It Works (formula, mechanics, the actual math), 📊 Your Pair (what the numbers mean for the selected pair).
- Class: primary-user-loop
- Status: validated
- Description: Each Academy step provides content at three depths: 💡 Intuition (analogy/everyday explanation), 🔧 How It Works (formula, mechanics, the actual math), 📊 Your Pair (what the numbers mean for the selected pair).
- Why it matters: Different learning depths for different moments. The user should never feel like the math is hidden — but shouldn't be forced to see it all at once either.
- Source: user
- Primary owning slice: M001/S03
- Supporting slices: M001/S04
- Validation: All 6 Academy steps have 3-layer EducationalPanel with populated content. Steps 1-3 proven in S03, steps 4-6 proven in S04. Accordion expand/collapse works on all steps.
- Notes: Accordion-based panels in the existing Dash app. Rebuild with React components.

### R003 — Academy steps 5-6 (spread and z-score) have parameter sliders that update charts in real-time — lookback window, entry/exit thresholds, etc.
- Class: primary-user-loop
- Status: validated
- Description: Academy steps 5-6 (spread and z-score) have parameter sliders that update charts in real-time — lookback window, entry/exit thresholds, etc.
- Why it matters: Interactive parameter exploration is how the user builds intuition for what parameter values actually mean.
- Source: user
- Primary owning slice: M001/S04
- Supporting slices: none
- Validation: Step 5 rolling window slider (10-200) updates spread chart with σ bands. Step 6 has 3 sliders (entry/exit/stop) updating z-score chart zones, signal markers, and summary counts. Zero API calls on slider change — all client-side. Verified via browser network tab.
- Notes: Existing Dash implementation has this but with callback jank. React state management should make this smoother.

### R004 — The Dash app is replaced with a Next.js React frontend. This gives full control over layout, animations, state management, and component composition.
- Class: core-capability
- Status: validated
- Description: The Dash app is replaced with a Next.js React frontend. This gives full control over layout, animations, state management, and component composition.
- Why it matters: Dash's callback model caused jank and limited what was possible for the Academy's guided learning experience. The look and feel of the learning flow is pedagogically important.
- Source: user
- Primary owning slice: M001/S02
- Supporting slices: M001/S03, M001/S04, M001/S05, M001/S06
- Validation: S02 established the Next.js app shell and routing. S03-S05 proved Academy, Scanner, and Deep Dive in React against the FastAPI backend. S06 final live UAT closed the route loop Academy → Glossary → Deep Dive → Scanner → Academy on localhost and confirmed the running app no longer depends on Dash surfaces.
- Notes: Advanced significantly by S05, but left active until S06 confirmed the complete frontend replacement experience.

### R005 — FastAPI wraps the existing Python analysis code (PairAnalysis, research functions, data pipeline) as REST API endpoints. The frontend calls these endpoints instead of running Python directly.
- Class: core-capability
- Status: validated
- Description: FastAPI wraps the existing Python analysis code (PairAnalysis, research functions, data pipeline) as REST API endpoints. The frontend calls these endpoints instead of running Python directly.
- Why it matters: Clean separation between analysis engine and UI. The analysis code is already UI-free — this makes the split explicit.
- Source: user
- Primary owning slice: M001/S01
- Supporting slices: none
- Validation: S01 delivered and tested the FastAPI REST layer: 7 endpoints wrap PairAnalysis/DataCacheManager with 51 API tests, OpenAPI docs, and live imports. The frontend consumed these endpoints across S03-S05, proving the UI no longer runs Python analysis directly.
- Notes: M001 covers the PairAnalysis/data-pipeline API surfaces needed by the new frontend. Research-module endpoints remain M002 scope.

### R006 — A persistent pair selector (asset1, asset2, timeframe) in the app header that propagates to all pages. Pairs populated from cached data.
- Class: primary-user-loop
- Status: validated
- Description: A persistent pair selector (asset1, asset2, timeframe) in the app header that propagates to all pages. Pairs populated from cached data.
- Why it matters: Pair selection is the common entry point for every feature — Academy, Scanner, Deep Dive, Research. It should be always-visible and consistent.
- Source: user
- Primary owning slice: M001/S02
- Supporting slices: M001/S03, M001/S05
- Validation: S06 live UAT verified the shared header asset1/asset2/timeframe selectors remained visible across Academy, Glossary, Deep Dive, and Scanner. Deep Dive consumed the BTC/ETH/1h header state, while Scanner intentionally kept its page-local scan controls for batch work.
- Notes: Scanner intentionally uses its own multi-pair/timeframe controls for batch work, but still depends on the shared coin list from PairContext.

### R007 — Consistent dark theme across the entire app. Plotly charts use the existing mantine_dark template (or equivalent) for visual cohesion. Charts render in the React app via react-plotly.js.
- Class: quality-attribute
- Status: validated
- Description: Consistent dark theme across the entire app. Plotly charts use the existing mantine_dark template (or equivalent) for visual cohesion. Charts render in the React app via react-plotly.js.
- Why it matters: Visual consistency matters for a tool you use daily. The existing Plotly template is well-tuned.
- Source: user
- Primary owning slice: M001/S02
- Supporting slices: none
- Validation: S06 live UAT verified the Mantine dark shell and styling stayed consistent across Academy, Glossary, Deep Dive, and Scanner, with no blank states or broken navigation during the Academy → Glossary → Deep Dive → Scanner → Academy route loop.
- Notes: The existing mantine_dark Plotly template defines colors, fonts, grid styling.

### R008 — Eight research modules: rolling stability, out-of-sample validation, timeframe comparison, spread method, z-score threshold sweep, lookback window sweep, transaction costs, cointegration method comparison. Each takes real data, runs analysis, returns structured results with auto-generated takeaway banners.
- Class: primary-user-loop
- Status: validated
- Description: Eight research modules: rolling stability, out-of-sample validation, timeframe comparison, spread method, z-score threshold sweep, lookback window sweep, transaction costs, cointegration method comparison. Each takes real data, runs analysis, returns structured results with auto-generated takeaway banners.
- Why it matters: These are the tools for data-driven decision making — testing what actually works vs what textbooks claim.
- Source: user
- Primary owning slice: M002/S01
- Supporting slices: none
- Validation: S01 delivered the first live module (lookback sweep) with shared envelope and backtest handoff. S02 completed all 7 remaining modules: rolling stability, OOS validation, timeframe comparison, spread method, z-score threshold, transaction cost, and cointegration method. All 8 run from React against FastAPI, return structured ResearchTakeawayPayload results from cached data, and render takeaway banners. Z-score threshold and tx-cost hand off recommended parameters to the backtester. Proven by 8 contract tests, 4 E2E tests, and frontend build gate.
- Notes: S01 delivered lookback sweep. S02 delivered the remaining 7 modules. All 8 follow the shared envelope pattern with typed results, takeaway banners, and optional recommended_backtest_params.

### R009 — Run a z-score mean-reversion strategy over historical data. Track equity curve, individual trade outcomes, and cumulative returns. Results as a structured Pydantic model.
- Class: core-capability
- Status: validated
- Description: Run a z-score mean-reversion strategy over historical data. Track equity curve, individual trade outcomes, and cumulative returns. Results as a structured Pydantic model.
- Why it matters: Historical performance validation is the bridge between research and real trading.
- Source: user
- Primary owning slice: M002/S01
- Supporting slices: none
- Validation: S01 delivered a pure-Python z-score mean-reversion strategy running over historical cached data, returning structured equity curve, trade ledger, and cumulative returns through both the engine and live /backtest page. Deterministic fixtures verify signal timing, fee math, and trade accounting.
- Notes: StrategySettings already defined in config/settings.py with lookback, thresholds, capital, fees.

### R010 — Comprehensive performance metrics for backtest results. Must include risk-adjusted returns (Sharpe, Sortino), drawdown analysis, win rate, profit factor, average holding period.
- Class: core-capability
- Status: validated
- Description: Comprehensive performance metrics for backtest results. Must include risk-adjusted returns (Sharpe, Sortino), drawdown analysis, win rate, profit factor, average holding period.
- Why it matters: You can't evaluate a strategy without proper metrics. These are the standard quantitative measures.
- Source: user
- Primary owning slice: M002/S01
- Supporting slices: none
- Validation: S01 backtest engine computes and renders Sharpe, Sortino, max drawdown, win rate, profit factor, and average holding period. Metrics are returned in a strict Pydantic model and displayed in the live /backtest page result view.
- Notes: none

### R013 — The backtesting engine must never use data from time t+1 to make decisions at time t. All indicators use only historically available data. Enforced by architecture, not just convention.
- Class: constraint
- Status: validated
- Description: The backtesting engine must never use data from time t+1 to make decisions at time t. All indicators use only historically available data. Enforced by architecture, not just convention.
- Why it matters: Look-ahead bias is the most common way backtests produce false results. The platform's "honest" commitment requires structural prevention.
- Source: research
- Primary owning slice: M002/S01
- Supporting slices: none
- Validation: S01 enforces look-ahead safety architecturally: trailing-window OLS hedge ratios and z-scores use only historically available data, signals are emitted at bar close, execution occurs on the next bar's close. Deterministic tests in test_backtest_engine.py prove the timing contract.
- Notes: Architectural enforcement: signals computed from rolling windows only, no future data access possible.

### R016 — The working data pipeline (CCXT → Bitvavo → parquet cache with delta updates) and existing ~20 EUR pair cache are preserved and accessible through the new API layer.
- Class: continuity
- Status: validated
- Description: The working data pipeline (CCXT → Bitvavo → parquet cache with delta updates) and existing ~20 EUR pair cache are preserved and accessible through the new API layer.
- Why it matters: This is months of collected data. The pipeline works. Don't break it.
- Source: user
- Primary owning slice: M001/S01
- Supporting slices: none
- Validation: S01 preserved the existing CCXT → Bitvavo → parquet cache pipeline and exposed all 44 cached datasets through GET /api/pairs and direct parquet-backed OHLCV reads. API routers intentionally read parquet files directly and never trigger Bitvavo fetches; S03-S05 consumed the cached data successfully in the running app.
- Notes: Continuity requirement satisfied for M001: the working cache and data pipeline remain intact and accessible through the API layer.

### R026 — Searchable glossary of 17+ stat arb terms with cross-links from Academy educational panels.
- Class: primary-user-loop
- Status: validated
- Description: Searchable glossary of 17+ stat arb terms with cross-links from Academy educational panels.
- Why it matters: Quick reference while learning. The existing Dash glossary works but is deprioritized for M001.
- Source: user
- Primary owning slice: M001/S06
- Supporting slices: none
- Validation: S06 live UAT verified /glossary renders all 17 terms, filters correctly for term/alias/definition queries (cointegration, beta, mean), shows the explicit empty state, resolves direct hashes like #glossary-cointegration and #glossary-z-score, and Academy steps 2-6 click through to the correlation, cointegration, hedge ratio, ADF test, spread, mean reversion, stationarity, and z-score anchors.
- Notes: Already built in Dash. Ported and proven live in M001/S06.

## Deferred

### R024 — Support exchanges beyond Bitvavo (Binance, Kraken, etc.)
- Class: core-capability
- Status: deferred
- Description: Support exchanges beyond Bitvavo (Binance, Kraken, etc.)
- Why it matters: Would expand the pair universe and liquidity options.
- Source: user
- Primary owning slice: none
- Supporting slices: none
- Validation: unmapped
- Notes: User explicitly chose Bitvavo-only for now. Revisit if trading scope expands.

### R025 — Deploy the platform to a home server for always-on operation.
- Class: operability
- Status: deferred
- Description: Deploy the platform to a home server for always-on operation.
- Why it matters: Required for 24/7 automated trading. Not needed during development.
- Source: user
- Primary owning slice: none
- Supporting slices: none
- Validation: unmapped
- Notes: User confirmed: local during development, migrate to home server if live trading succeeds.

## Out of Scope

### R027 — Native mobile application for iOS or Android.
- Class: anti-feature
- Status: out-of-scope
- Description: Native mobile application for iOS or Android.
- Why it matters: Prevents scope creep. This is a desktop/laptop research and trading tool.
- Source: inferred
- Primary owning slice: none
- Supporting slices: none
- Validation: n/a
- Notes: Personal tool used on laptop/desktop.

### R028 — User accounts, authentication, or multi-tenant support.
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
| R001 | primary-user-loop | validated | M001/S03 | M001/S04 | S03: Steps 1-3 working with real data and stepper infrastructure. S04: Steps 4-6 complete with real data, interactive charts, and educational panels. Full 6-step flow verified end-to-end with BTC/ETH pair. |
| R002 | primary-user-loop | validated | M001/S03 | M001/S04 | All 6 Academy steps have 3-layer EducationalPanel with populated content. Steps 1-3 proven in S03, steps 4-6 proven in S04. Accordion expand/collapse works on all steps. |
| R003 | primary-user-loop | validated | M001/S04 | none | Step 5 rolling window slider (10-200) updates spread chart with σ bands. Step 6 has 3 sliders (entry/exit/stop) updating z-score chart zones, signal markers, and summary counts. Zero API calls on slider change — all client-side. Verified via browser network tab. |
| R004 | core-capability | validated | M001/S02 | M001/S03, M001/S04, M001/S05, M001/S06 | S02 established the Next.js app shell and routing. S03-S05 proved Academy, Scanner, and Deep Dive in React against the FastAPI backend. S06 final live UAT closed the route loop Academy → Glossary → Deep Dive → Scanner → Academy on localhost and confirmed the running app no longer depends on Dash surfaces. |
| R005 | core-capability | validated | M001/S01 | none | S01 delivered and tested the FastAPI REST layer: 7 endpoints wrap PairAnalysis/DataCacheManager with 51 API tests, OpenAPI docs, and live imports. The frontend consumed these endpoints across S03-S05, proving the UI no longer runs Python analysis directly. |
| R006 | primary-user-loop | validated | M001/S02 | M001/S03, M001/S05 | S06 live UAT verified the shared header asset1/asset2/timeframe selectors remained visible across Academy, Glossary, Deep Dive, and Scanner. Deep Dive consumed the BTC/ETH/1h header state, while Scanner intentionally kept its page-local scan controls for batch work. |
| R007 | quality-attribute | validated | M001/S02 | none | S06 live UAT verified the Mantine dark shell and styling stayed consistent across Academy, Glossary, Deep Dive, and Scanner, with no blank states or broken navigation during the Academy → Glossary → Deep Dive → Scanner → Academy route loop. |
| R008 | primary-user-loop | validated | M002/S01 | none | S01 delivered the first live module (lookback sweep) with shared envelope and backtest handoff. S02 completed all 7 remaining modules: rolling stability, OOS validation, timeframe comparison, spread method, z-score threshold, transaction cost, and cointegration method. All 8 run from React against FastAPI, return structured ResearchTakeawayPayload results from cached data, and render takeaway banners. Z-score threshold and tx-cost hand off recommended parameters to the backtester. Proven by 8 contract tests, 4 E2E tests, and frontend build gate. |
| R009 | core-capability | validated | M002/S01 | none | S01 delivered a pure-Python z-score mean-reversion strategy running over historical cached data, returning structured equity curve, trade ledger, and cumulative returns through both the engine and live /backtest page. Deterministic fixtures verify signal timing, fee math, and trade accounting. |
| R010 | core-capability | validated | M002/S01 | none | S01 backtest engine computes and renders Sharpe, Sortino, max drawdown, win rate, profit factor, and average holding period. Metrics are returned in a strict Pydantic model and displayed in the live /backtest page result view. |
| R011 | differentiator | active | M002/S03 | none | unmapped |
| R012 | failure-visibility | active | M002/S03 | none | unmapped |
| R013 | constraint | validated | M002/S01 | none | S01 enforces look-ahead safety architecturally: trailing-window OLS hedge ratios and z-scores use only historically available data, signals are emitted at bar close, execution occurs on the next bar's close. Deterministic tests in test_backtest_engine.py prove the timing contract. |
| R014 | differentiator | active | M002/S03 | none | unmapped |
| R015 | quality-attribute | active | M002/S02 | M002/S01, M002/S03 | S01: Backtest outputs expose assumptions, warnings, data-quality state, and honest-reporting footer. S02: All 8 research modules expose structured takeaway payloads with severity, observations count, date range, and fee assumptions. The transparency contract covers the full research surface. Remaining: S03 must extend this to optimization and walk-forward results. |
| R016 | continuity | validated | M001/S01 | none | S01 preserved the existing CCXT → Bitvavo → parquet cache pipeline and exposed all 44 cached datasets through GET /api/pairs and direct parquet-backed OHLCV reads. API routers intentionally read parquet files directly and never trigger Bitvavo fetches; S03-S05 consumed the cached data successfully in the running app. |
| R017 | core-capability | active | M003/S01 | none | unmapped |
| R018 | primary-user-loop | active | M003/S02 | M004 | unmapped |
| R019 | core-capability | active | M004/S01 | none | unmapped |
| R020 | constraint | active | M004/S02 | none | unmapped |
| R021 | operability | active | M004/S03 | none | unmapped |
| R022 | quality-attribute | active | M001/S03 | M001/S04, M002/S01, M002/S02 | S03: Steps 1-3 explain correlation, cointegration, price normalization with 3-layer depth. S04: Steps 4-6 show ADF test, Engle-Granger, spread formula, z-score formula, and signal rules. S01: Backtest execution model, fee model, assumptions, and limitations visible in honest-reporting footer. S02: All 8 research modules show data, charts, stat cards, and contextual takeaway for evidence visibility. Full validation requires S03 (optimization transparency). |
| R023 | failure-visibility | active | M002/S01 | none | S01: Preflight validates input data with structured blocker/warning separation, surfaced in both API and UI. Partial — missing-candle gap detection not yet implemented. |
| R024 | core-capability | deferred | none | none | unmapped |
| R025 | operability | deferred | none | none | unmapped |
| R026 | primary-user-loop | validated | M001/S06 | none | S06 live UAT verified /glossary renders all 17 terms, filters correctly for term/alias/definition queries (cointegration, beta, mean), shows the explicit empty state, resolves direct hashes like #glossary-cointegration and #glossary-z-score, and Academy steps 2-6 click through to the correlation, cointegration, hedge ratio, ADF test, spread, mean reversion, stationarity, and z-score anchors. |
| R027 | anti-feature | out-of-scope | none | none | n/a |
| R028 | anti-feature | out-of-scope | none | none | n/a |

## Coverage Summary

- Active requirements: 11
- Mapped to slices: 11
- Validated: 13 (R001, R002, R003, R004, R005, R006, R007, R008, R009, R010, R013, R016, R026)
- Unmapped active requirements: 0
