# M001: Frontend Foundation + Academy

**Gathered:** 2026-03-17
**Status:** Ready for planning

## Project Description

Personal crypto statistical arbitrage research and learning platform. V2 rebuild: migrating the existing Dash app to a Next.js React frontend with FastAPI Python backend. The Academy is the centerpiece — a 6-step guided learning flow that teaches stat arb using real pair data from Bitvavo.

## Why This Milestone

The existing Dash app has a solid analytical core but the callback-based UI causes jank and limits what's possible for the guided learning experience. The Academy needs smooth interactivity — parameter sliders that update charts instantly, state that flows cleanly between steps, and full control over how information is presented. That requires React.

## User-Visible Outcome

### When this milestone is complete, the user can:

- Open the app in a browser and navigate between Academy, Scanner, Deep Dive, and Glossary
- Walk through all 6 Academy steps using real pair data, with interactive charts and educational panels
- Adjust parameters (lookback window, z-score thresholds) in steps 5-6 and see charts update smoothly
- Run a batch cointegration scan across multiple pairs
- Do a full deep-dive analysis on a single pair
- Select any pair and timeframe from the global header and have it propagate to all pages

### Entry point / environment

- Entry point: `http://localhost:3000` (Next.js) + `http://localhost:8000` (FastAPI)
- Environment: local dev (laptop)
- Live dependencies involved: none (all data from parquet cache)

## Completion Class

- Contract complete means: API endpoints return correct analysis results; React components render correctly; all 6 Academy steps work with real data
- Integration complete means: frontend and backend communicate correctly; global pair selection propagates to all pages; charts render from API data
- Operational complete means: none (local dev only)

## Final Integrated Acceptance

To call this milestone complete, we must prove:

- User can walk through all 6 Academy steps with a real pair (e.g. ETH-EUR / ETC-EUR at 1h) and see real analysis results at each step
- Changing the global pair updates all Academy charts and analysis without page reload
- Parameter sliders in steps 5-6 update charts smoothly (no visible lag or jank)
- Scanner page scans at least 5 pairs and displays cointegration results
- Deep Dive page shows full single-pair analysis with all metrics

## Risks and Unknowns

- **react-plotly.js performance** — rendering complex Plotly charts in React may have different performance characteristics than Dash's native Plotly integration
- **API response time** — cointegration analysis and research functions may be slow enough to need loading states or caching
- **Chart data serialization** — sending Plotly figure data over JSON API vs reconstructing charts client-side is a design choice with tradeoffs

## Existing Codebase / Prior Art

- `src/statistical_arbitrage/analysis/cointegration.py` — PairAnalysis class, 317 lines. Pure numpy/scipy/statsmodels. Zero UI dependencies.
- `src/statistical_arbitrage/analysis/research.py` — 8 research functions, 938 lines. Pure Python with Polars. Zero Dash imports.
- `src/statistical_arbitrage/visualization/spread_plots.py` — Plotly figure builders, 299 lines.
- `src/statistical_arbitrage/visualization/educational_plots.py` — Concept visualization, 379 lines.
- `src/statistical_arbitrage/data/cache_manager.py` — Parquet cache with delta updates, 337 lines.
- `src/statistical_arbitrage/data/bitvavo_client.py` — CCXT-based data collection, 294 lines.
- `src/statistical_arbitrage/app/pages/learn.py` — 1,948 lines of Academy content. Educational text and step definitions will be extracted for the React rebuild.
- `config/settings.py` — Pydantic settings with StrategySettings (lookback, thresholds, capital, fees).
- `data/cache/` — ~20 EUR pairs at 1h and 4h timeframes in parquet format.

> See `.gsd/DECISIONS.md` for all architectural and pattern decisions — it is an append-only register; read it during planning, append to it during execution.

## Relevant Requirements

- R001 — Academy 6-step learning flow (primary deliverable)
- R002 — Three-layer educational panels
- R003 — Interactive charts with live parameter sliders
- R004 — React frontend replacing Dash
- R005 — FastAPI backend exposing analysis functions
- R006 — Global pair selector and timeframe picker
- R007 — Dark theme with Plotly charts
- R016 — Preserve existing data pipeline
- R022 — Platform transparency (math always visible)
- R026 — Glossary (deferred to S06 polish)

## Scope

### In Scope

- FastAPI API layer wrapping all existing analysis code
- Next.js React app with dark theme, navigation, global pair selector
- Academy 6 steps rebuilt with proper React interactivity
- Pair Scanner and Deep Dive pages ported
- Glossary ported
- Plotly charts via react-plotly.js

### Out of Scope / Non-Goals

- Research hub modules (M002)
- Backtesting engine (M002)
- Paper trading (M003)
- Live trading (M004)
- Server deployment
- New analysis features — this milestone ports existing functionality to a better UI

## Technical Constraints

- Python 3.12, UV package manager
- Polars for all dataframe operations (not Pandas)
- Plotly for all charts (not D3, not Chart.js)
- Bitvavo only via CCXT
- No database — parquet file cache is the data layer
- No auth — personal tool, single user

## Integration Points

- **CCXT / Bitvavo** — existing data pipeline for OHLCV data. Read-only (public data, no API keys needed for M001)
- **Parquet cache** — `data/cache/*.parquet` files are the data source for all analysis
- **FastAPI ↔ Next.js** — REST API on localhost:8000, frontend on localhost:3000

## Open Questions

- **Chart rendering strategy** — should the API return raw data and the frontend build charts, or should the API return Plotly JSON specs? Leaning toward API returns data + chart config, frontend renders. More flexible and avoids sending huge figure JSONs.
- **Academy state management** — React context vs URL state vs component state for tracking current step, selected pair, and parameter values. Decide during S02/S03.
