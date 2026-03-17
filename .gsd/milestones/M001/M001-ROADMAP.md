# M001: Frontend Foundation + Academy

**Vision:** Rebuild the statistical arbitrage platform's UI as a Next.js React frontend with FastAPI Python backend. The Academy — a 6-step guided learning flow using real pair data — is the centerpiece. Every page should feel smooth, interactive, and transparent.

## Success Criteria

- User can walk through all 6 Academy steps with real pair data and see interactive charts at each step
- Parameter sliders in steps 5-6 update charts in real-time without jank
- Three-layer educational panels (Intuition → How It Works → Your Pair) expand/collapse smoothly
- Global pair selector propagates to all pages
- Scanner runs batch cointegration across multiple pairs
- Deep Dive shows full single-pair analysis
- Dark theme is consistent across all pages and charts
- No Dash code remains in the running application

## Key Risks / Unknowns

- **react-plotly.js rendering performance** — complex charts may behave differently than Dash's native Plotly. Need to prove this works early.
- **API latency for analysis endpoints** — cointegration tests take time. Need loading states or caching to keep UX smooth.
- **Chart data strategy** — sending raw data vs Plotly specs over API has tradeoffs for flexibility and payload size.

## Proof Strategy

- react-plotly.js performance → retire in S03 by rendering a real cointegration chart with live data and proving it renders under 500ms
- API latency → retire in S01 by measuring endpoint response times for cointegration analysis and adding appropriate caching
- Chart data strategy → retire in S03 by implementing the first chart endpoint and validating the data→chart pipeline

## Verification Classes

- Contract verification: pytest for API endpoints, component rendering tests
- Integration verification: frontend calls backend, receives real analysis data, renders correct charts
- Operational verification: none (local dev only)
- UAT / human verification: walk through Academy steps manually, verify charts match expected output

## Milestone Definition of Done

This milestone is complete only when all are true:

- All 6 Academy steps render with real pair data and interactive charts
- Parameter sliders in steps 5-6 produce smooth, real-time chart updates
- Educational panels show all 3 layers with real pair-specific content
- Global pair/timeframe selector works across all pages
- Scanner and Deep Dive pages produce correct analysis results
- The app runs cleanly on localhost (Next.js :3000, FastAPI :8000)
- No visible jank, broken states, or dead navigation links
- Success criteria are verified against live behavior, not just artifacts

## Requirement Coverage

- Covers: R001, R002, R003, R004, R005, R006, R007, R016, R022, R026
- Partially covers: none
- Leaves for later: R008-R015 (M002), R017-R018 (M003), R019-R021 (M004)
- Orphan risks: none

## Slices

- [x] **S01: FastAPI Backend + Data API** `risk:high` `depends:[]`
  > After this: `curl localhost:8000/api/pairs` returns the cached pair list; `/api/analysis/cointegration` returns real cointegration results for any pair.

- [x] **S02: Next.js App Shell + Navigation** `risk:high` `depends:[]`
  > After this: browser shows a dark-themed app at localhost:3000 with sidebar navigation, global pair selector, and page routing — all pages show placeholder content.

- [ ] **S03: Academy Step Engine + First 3 Steps** `risk:medium` `depends:[S01,S02]`
  > After this: Academy page has a working stepper; steps 1-3 (pair selection, price comparison, correlation vs cointegration) render with real data, interactive charts, and educational panels.

- [ ] **S04: Academy Steps 4-6 (Cointegration → Z-Score & Signals)** `risk:medium` `depends:[S03]`
  > After this: all 6 Academy steps work end-to-end — steps 4-6 include cointegration test results, spread visualization, and z-score with live parameter sliders.

- [ ] **S05: Pair Scanner + Deep Dive Pages** `risk:low` `depends:[S01,S02]`
  > After this: Scanner page runs batch cointegration across selected pairs and displays results; Deep Dive page shows full single-pair analysis with all metrics.

- [ ] **S06: Glossary + Polish + Integration Test** `risk:low` `depends:[S03,S04,S05]`
  > After this: all pages work together seamlessly — glossary with search, cross-links from Academy, consistent styling, no broken navigation or dead states.

## Boundary Map

### S01 → S03, S04, S05

Produces:
- `GET /api/pairs` — list of cached pairs with available timeframes
- `GET /api/pairs/{symbol}/ohlcv` — OHLCV data as JSON (timestamps, open, high, low, close, volume)
- `POST /api/analysis/cointegration` — full PairAnalysis results (cointegration test, hedge ratio, spread, z-score, half-life, correlation)
- `POST /api/analysis/spread` — spread calculation with configurable method (OLS, ratio)
- `POST /api/analysis/zscore` — z-score with configurable lookback window
- `POST /api/analysis/stationarity` — ADF test results
- `GET /api/health` — API health check

Consumes:
- nothing (first slice, wraps existing Python modules)

### S02 → S03, S04, S05, S06

Produces:
- Next.js app shell with `<AppLayout>` component (sidebar nav, header with pair selector, main content area)
- Global pair/timeframe state via React context (`usePairContext()` → `{asset1, asset2, timeframe}`)
- Page routing: `/academy`, `/scanner`, `/deep-dive`, `/glossary`
- Dark theme configuration (CSS variables, Plotly chart theme)
- `<PlotlyChart>` wrapper component for rendering Plotly figures from API data
- Loading state and error boundary patterns

Consumes:
- nothing (parallel with S01)

### S03 → S04

Produces:
- `<AcademyStepper>` component with step navigation (free navigation, not locked-linear)
- Step rendering engine: `TEACHING_STEPS` registry → step component dispatch
- `<EducationalPanel>` component (3-layer accordion: Intuition, How It Works, Your Pair)
- Steps 1-3 fully implemented: pair selection, price comparison chart, correlation vs cointegration explainer
- Pattern for connecting Academy steps to API data (fetch on step enter, loading states)

Consumes from S01:
- `GET /api/pairs` for pair selection
- `GET /api/pairs/{symbol}/ohlcv` for price comparison charts
- `POST /api/analysis/cointegration` for correlation and cointegration data

Consumes from S02:
- `<AppLayout>`, global pair context, `<PlotlyChart>`, dark theme, routing

### S04 → S06

Produces:
- Steps 4-6 fully implemented: cointegration test results, spread visualization with rolling bands, z-score chart with entry/exit signals
- Parameter sliders (lookback window, entry threshold, exit threshold, stop-loss) with real-time chart updates
- Signal generation and display on z-score chart
- Complete Academy flow: user can walk through all 6 steps

Consumes from S03:
- `<AcademyStepper>`, `<EducationalPanel>`, step rendering pattern, API connection pattern

Consumes from S01:
- `POST /api/analysis/cointegration`, `/api/analysis/spread`, `/api/analysis/zscore`

### S05 → S06

Produces:
- Scanner page: multi-pair selection, batch cointegration scan, results table with sorting
- Deep Dive page: single-pair full analysis (all metrics, charts, summary report)

Consumes from S01:
- All analysis API endpoints

Consumes from S02:
- `<AppLayout>`, global pair context, `<PlotlyChart>`, routing

### S06 (final integration)

Produces:
- Glossary page with search and term display
- Cross-links from Academy educational panels to glossary terms
- Visual polish pass across all pages
- Integration verification: all pages work together, navigation flows correctly

Consumes from S03, S04, S05:
- All page components and the complete Academy flow
