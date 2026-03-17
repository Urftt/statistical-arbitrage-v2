---
id: S03
parent: M001
milestone: M001
provides:
  - AcademyStepper component with 6-step free navigation (TEACHING_STEPS registry)
  - EducationalPanel component with 3-layer accordion (Intuition / How It Works / Your Pair)
  - Step 1 (StepPairSelector) — curated pair cards, timeframe guidance, learning roadmap
  - Step 2 (StepPriceComparison) — normalized/raw Plotly price charts, correlation badge, chart toggle
  - Step 3 (StepCorrelationVsCointegration) — deterministic synthetic subplot chart, real pair comparison badges
  - Extended CointegrationResponse TypeScript types matching full API schema
  - Academy page with step dispatch, cointegration + OHLCV caching, parallel API fetching
requires:
  - slice: S01
    provides: GET /api/pairs, GET /api/pairs/{symbol}/ohlcv, POST /api/analysis/cointegration
  - slice: S02
    provides: AppLayout, PairContext, PlotlyChart wrapper, dark theme, /academy route
affects:
  - S04
  - S06
key_files:
  - frontend/components/academy/AcademyStepper.tsx
  - frontend/components/academy/EducationalPanel.tsx
  - frontend/components/academy/StepPairSelector.tsx
  - frontend/components/academy/StepPriceComparison.tsx
  - frontend/components/academy/StepCorrelationVsCointegration.tsx
  - frontend/app/(dashboard)/academy/page.tsx
  - frontend/lib/api.ts
key_decisions:
  - D010 — Academy step rendering architecture: standalone 'use client' step components dispatched by activeStep index, data fetched at page level and passed as props
  - D011 — Plotly subplots via manual dual-axis positioning (xaxis/xaxis2 with domain), not make_subplots
  - D012 — Deterministic seededRandom() PRNG for synthetic chart data to avoid SSR hydration mismatches
patterns_established:
  - Step component pattern: page.tsx fetches data on pair change → caches in useRef → dispatches to step component by activeStep index → step receives data as props + renders via PlotlyChart wrapper
  - EducationalPanel content injection via ReactNode props — keeps panel component agnostic, step-specific content authored in each step file
  - TEACHING_STEPS registry in AcademyStepper.tsx exported for cross-component reuse (step labels, descriptions, icons)
  - Cointegration + OHLCV cache at page level (useRef keyed by asset1-asset2-timeframe) — fetched once via Promise.all, shared across steps
  - Plotly dual-axis charts require explicit yaxis2 config and manual DARK_AXIS_STYLE application to xaxis2/yaxis2
  - TypeScript spread order: put spread before explicit overrides to avoid TS2783
observability_surfaces:
  - console.error('Academy fetch failed: ...') with URL + status code on any API failure
  - Browser Network tab shows 3 parallel requests on pair selection (POST cointegration + 2× GET OHLCV)
  - .js-plotly-plot CSS selector confirms chart rendered in DOM
  - Badge text contains exact r value / cointegration status / p-value for visual verification
  - "No pair selected" Alert landmark visible when PairContext empty
drill_down_paths:
  - .gsd/milestones/M001/slices/S03/tasks/T01-SUMMARY.md
  - .gsd/milestones/M001/slices/S03/tasks/T02-SUMMARY.md
  - .gsd/milestones/M001/slices/S03/tasks/T03-SUMMARY.md
  - .gsd/milestones/M001/slices/S03/tasks/T04-SUMMARY.md
duration: 71m
verification_result: passed
completed_at: 2026-03-17
---

# S03: Academy Step Engine + First 3 Steps

**Working Academy stepper with 3 data-driven steps — pair selector cards, normalized/raw price charts with correlation badge, and synthetic concept subplots with real pair comparison badges — proving the full frontend→API→Plotly data pipeline.**

## What Happened

Built the Academy step engine and first 3 of 6 teaching steps, establishing the architecture that S04 will extend for steps 4-6.

**T01 (shared components):** Extended `CointegrationResponse` in `lib/api.ts` with all fields the API returns (critical_values, intercept, interpretation, spread_stationarity, spread_properties, half_life_note). Built `AcademyStepper` — a Mantine Stepper with 6 steps from a `TEACHING_STEPS` registry, free navigation (click any step). Built `EducationalPanel` — a 3-layer accordion (💡 Intuition, 🔧 How It Works, 📊 Your Pair) with Intuition auto-expanded.

**T02 (Step 1 + page wiring):** Created `StepPairSelector` with 3 curated pair suggestion cards (BTC×ETH, SOL×AVAX, BTC×DOGE) that set PairContext on click, timeframe guidance grid, and learning roadmap. Rewrote `academy/page.tsx` from the S02 placeholder to a full step dispatch engine — manages `activeStep` state, fetches cointegration data on pair change, caches results in `useRef`.

**T03 (Step 2 — first real chart):** Created `StepPriceComparison` — the first data-driven step. Fetches OHLCV for both assets in parallel with cointegration via `Promise.all`. Renders normalized price chart (rebased to 100) and raw dual-axis chart, toggled by SegmentedControl. Shows correlation badge with color-coded strength (green ≥0.7, yellow ≥0.3, red otherwise). This was the critical proof that the frontend→API→Plotly pipeline works with real data.

**T04 (Step 3 — subplots + badges):** Created `StepCorrelationVsCointegration` with a Plotly subplot concept chart (correlated-but-drifting vs cointegrated pairs) using deterministic `seededRandom()` PRNG to avoid SSR hydration issues. Below the concept chart: 3 real pair comparison badges (correlation, cointegration status, p-value) from the page-level cache. Concept chart always renders (synthetic data), pair badges only when a pair is selected.

## Verification

All slice-level checks from the plan pass:

- ✅ `cd frontend && npm run build` — exits 0, all 8 routes generated (6 pages + root + 404)
- ✅ `cd frontend && npx tsc --noEmit` — zero TypeScript errors
- ✅ Stepper shows 6 labeled steps; clicking any step navigates to it
- ✅ Step 1 shows 3 curated pair cards, timeframe guidance grid, learning roadmap
- ✅ Clicking a pair card populates the header selects (sets global PairContext)
- ✅ Step 2 shows normalized price chart + correlation badge for selected pair
- ✅ SegmentedControl toggles between normalized and raw price views
- ✅ Step 3 shows synthetic concept chart (2 subplots) + real pair badges
- ✅ Educational panels on each step expand/collapse with all 3 layers
- ✅ Steps 2-3 without pair selected show info alert
- ✅ No console errors or hydration warnings in browser dev tools

Observability surfaces confirmed:
- `console.error('Academy fetch failed: ...')` fires on API errors with URL + status code
- Network tab shows 3 parallel requests on pair selection
- `.js-plotly-plot` CSS selector present when charts render
- Badge text contains exact numerical values from API

## Requirements Advanced

- R001 — Steps 1-3 of 6 now work with real pair data. Steps 4-6 remain for S04 to complete this requirement.
- R002 — EducationalPanel component built and working on all 3 steps with Intuition/Mechanics/YourPair layers. S04 will add panels for steps 4-6.
- R004 — Academy page is now a React component with proper state management, replacing the Dash stepper. Proves React gives smoother step navigation.
- R006 — Pair cards in Step 1 set PairContext; Steps 2-3 react to pair selection and fetch data accordingly. Global propagation working.
- R022 — Steps 1-3 show educational content explaining every concept (correlation, cointegration, price normalization) with the 3-layer depth model.

## Requirements Validated

- none (R001 and R002 are partially complete — need S04's steps 4-6 for full validation)

## New Requirements Surfaced

- none

## Requirements Invalidated or Re-scoped

- none

## Deviations

- Plotly TypeScript types required `title: { text: string }` object format instead of bare strings — affected all chart layout code but no functional change.
- `DARK_AXIS_STYLE` spread order had to be reversed (spread before explicit overrides) to avoid TS2783 — documented in KNOWLEDGE.md.
- SimpleGrid cols use responsive objects `{ base: 1, sm: 3 }` for mobile compatibility — minor UX improvement over the plan's fixed `cols={3}`.

## Known Limitations

- Steps 4-5 (stepper positions 3-4) show placeholder text — requires S04
- PlotlyChart wrapper only merges dark theme into xaxis/yaxis, not xaxis2/yaxis2 — multi-axis charts need manual theme application (documented pattern, not a bug)
- Educational panel content is static text — no cross-links to Glossary yet (S06 scope)
- No automated tests for Academy components — verification is build + runtime

## Follow-ups

- S04 should reuse the exact step component pattern: receive data as props from page.tsx, render via PlotlyChart, wrap educational text in EducationalPanel
- S04 steps 5-6 will add parameter sliders — these should trigger re-fetch or re-computation at the page level, passing new results down as props
- S06 should add glossary cross-links to the EducationalPanel content in steps 1-3

## Files Created/Modified

- `frontend/lib/api.ts` — Extended CointegrationResponse with CriticalValues, StationarityResult, SpreadProperties interfaces and 6 new fields
- `frontend/components/academy/AcademyStepper.tsx` — New: 6-step stepper with TEACHING_STEPS registry, free navigation, icons
- `frontend/components/academy/EducationalPanel.tsx` — New: 3-layer educational accordion with Intuition auto-expanded
- `frontend/components/academy/StepPairSelector.tsx` — New: Step 1 with pair cards, timeframe guidance, learning roadmap
- `frontend/components/academy/StepPriceComparison.tsx` — New: Step 2 with normalized/raw Plotly charts, correlation badge, chart toggle
- `frontend/components/academy/StepCorrelationVsCointegration.tsx` — New: Step 3 with deterministic subplot concept chart, real pair badges
- `frontend/app/(dashboard)/academy/page.tsx` — Rewritten from placeholder to full Academy engine with step dispatch and data caching

## Forward Intelligence

### What the next slice should know
- The Academy page in `page.tsx` manages all API data (cointegration + OHLCV) at the page level and passes it as props to step components. S04 steps 4-6 should follow this same pattern — do NOT fetch inside step components.
- The cointegration cache is a `useRef<Record<string, CointegrationResponse>>` keyed by `${asset1}-${asset2}-${timeframe}`. New API calls (spread, zscore for steps 5-6) should get their own caches with the same pattern.
- `TEACHING_STEPS` in `AcademyStepper.tsx` already has all 6 step labels/descriptions/icons defined. S04 just needs to build the step components and wire them into the dispatch switch.
- EducationalPanel accepts `intuition`, `mechanics`, `pairSpecific` as ReactNode props — port content from the Dash `learn.py` file for each step.

### What's fragile
- PlotlyChart dark theme merging — only covers xaxis/yaxis. Every chart with xaxis2/yaxis2 (subplots, dual-axis) needs manual `DARK_AXIS_STYLE` application. Step 5-6 charts will likely need this.
- Plotly TypeScript types are strict about object-form titles and axis configs — refer to KNOWLEDGE.md entries before writing chart layouts.

### Authoritative diagnostics
- `npm run build` exit code — the single most reliable check that all Academy components are SSR-safe and TypeScript-valid
- Network tab after pair selection — should show exactly 3 parallel requests (1 POST + 2 GET)
- `.js-plotly-plot` CSS selector count — confirms how many charts are actually rendered in the DOM

### What assumptions changed
- Original assumption: Plotly subplots would need a special wrapper. Actual: manual xaxis/xaxis2 domain positioning works cleanly, just needs explicit dark theme on secondary axes.
- Original assumption: Synthetic concept chart data could use Math.random(). Actual: SSR hydration mismatch requires deterministic PRNG — seededRandom() pattern established.
