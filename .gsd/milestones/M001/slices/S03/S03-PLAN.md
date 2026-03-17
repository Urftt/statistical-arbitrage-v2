# S03: Academy Step Engine + First 3 Steps

**Goal:** Academy page has a working 6-step stepper with free navigation; steps 1-3 (pair selection, price comparison, correlation vs cointegration) render with real data, interactive charts, and 3-layer educational panels.
**Demo:** Navigate to localhost:3000/academy → stepper shows 6 steps → step 1 shows curated pair cards and educational content → select a pair in the header → step 2 shows normalized/raw price charts with correlation badge → step 3 shows synthetic concept chart and real pair comparison badges (correlation, cointegration, p-value) → educational panels expand/collapse with all 3 layers.

## Must-Haves

- AcademyStepper component with 6 labeled steps and free navigation (click any step)
- EducationalPanel component with 3-layer Accordion (💡 Intuition, 🔧 How It Works, 📊 Your Pair) — Intuition open by default
- Step 1: curated pair suggestion cards (BTC×ETH, SOL×AVAX, BTC×DOGE), timeframe guidance, learning roadmap — pair cards set global PairContext on click
- Step 2: fetch OHLCV for both assets + cointegration results, render normalized/raw price charts with toggle, show correlation badge with strength label
- Step 3: synthetic concept chart (side-by-side subplots: correlated-not-cointegrated vs cointegrated), real pair comparison badges (correlation, cointegration status, p-value), conditional Your Pair content
- Steps 2-3 show "select a pair" message when no pair is selected
- Steps 2-3 show loading state while API calls are in-flight
- CointegrationResponse TypeScript interface extended with all fields the API returns (critical_values, intercept, interpretation, spread_stationarity, spread_properties, half_life_note)
- All charts go through `<PlotlyChart>` wrapper — never import react-plotly.js directly

## Proof Level

- This slice proves: integration (frontend fetches real API data, builds charts, renders in Plotly)
- Real runtime required: yes (FastAPI + Next.js must both run for full verification)
- Human/UAT required: no (build check + visual spot-check are sufficient)

## Verification

- `cd frontend && npm run build` — must exit 0 (SSR safety for all new components)
- Start FastAPI (`uv run python run_api.py`) and Next.js (`cd frontend && npm run dev`)
- Navigate to http://localhost:3000/academy:
  - Stepper shows 6 labeled steps; clicking any step navigates to it
  - Step 1 shows 3 curated pair cards, timeframe guidance grid, learning roadmap
  - Clicking a pair card populates the header selects (sets global PairContext)
  - Step 2 shows normalized price chart + correlation badge for selected pair
  - SegmentedControl toggles between normalized and raw price views
  - Step 3 shows synthetic concept chart (2 subplots) + real pair badges
  - Educational panels on each step expand/collapse with 3 layers
  - Steps 2-3 without a pair selected show info alert
- No console errors or hydration warnings in browser dev tools
- No TypeScript errors: `cd frontend && npx tsc --noEmit` passes

## Observability / Diagnostics

- Runtime signals: browser console.error from apiFetch on API failures; network tab shows GET/POST to localhost:8000
- Inspection surfaces: `npm run build` exit code; browser Network tab for API calls; `.js-plotly-plot` CSS selector confirms chart rendered
- Failure visibility: API errors surface in console.error with URL + status; "select a pair" alert visible when PairContext empty; Mantine Skeleton visible during loading
- Redaction constraints: none

## Integration Closure

- Upstream surfaces consumed: `GET /api/pairs` (PairContext coin list), `GET /api/pairs/{symbol}/ohlcv` (step 2 price data), `POST /api/analysis/cointegration` (steps 2-3 analysis data), `<AppLayout>` + PairContext + PlotlyChart + dark theme from S02
- New wiring introduced: Academy page dispatches to step components; step components fetch from API on pair selection; educational panel pattern established for S04 reuse
- What remains before milestone is usable end-to-end: S04 (steps 4-6 with sliders), S05 (Scanner + Deep Dive pages), S06 (Glossary + polish)

## Tasks

- [x] **T01: Extend API types and build shared Academy components** `est:25m`
  - Why: Everything downstream depends on correct TypeScript types for the cointegration response and on the two shared components (AcademyStepper, EducationalPanel). Building these first unblocks all 3 steps.
  - Files: `frontend/lib/api.ts`, `frontend/components/academy/AcademyStepper.tsx`, `frontend/components/academy/EducationalPanel.tsx`
  - Do: (1) Add missing fields to `CointegrationResponse` interface in `lib/api.ts`: `critical_values`, `intercept`, `interpretation`, `half_life_note`, `spread_stationarity`, `spread_properties` — match the Pydantic models in `api/schemas.py`. (2) Build `AcademyStepper` — Mantine Stepper with 6 steps from TEACHING_STEPS registry (label, description, icon), free navigation via `allowNextStepsSelect`, controlled `active` prop + `onStepClick` handler. (3) Build `EducationalPanel` — Mantine Accordion with `multiple` variant, 3 items (💡 Intuition, 🔧 How It Works, 📊 Your Pair), `defaultValue={["intuition"]}` to auto-expand first panel. Props: `intuition: ReactNode`, `mechanics: ReactNode`, `pairSpecific: ReactNode`.
  - Verify: `cd frontend && npx tsc --noEmit` passes with zero errors; `npm run build` exits 0
  - Done when: CointegrationResponse has all fields from the API; AcademyStepper renders 6 steps; EducationalPanel renders 3 expandable sections

- [x] **T02: Build Step 1 (StepPairSelector) and wire Academy page** `est:30m`
  - Why: Step 1 is static content (no API calls) — the cheapest way to validate the stepper→step dispatch architecture. The Academy page must be rewritten from its placeholder to wire the stepper, step state, and step rendering. Building them together proves the component architecture works end-to-end.
  - Files: `frontend/components/academy/StepPairSelector.tsx`, `frontend/app/(dashboard)/academy/page.tsx`
  - Do: (1) Build `StepPairSelector` with: intro text, 3 curated pair cards (BTC×ETH green "Cointegrated", SOL×AVAX blue "Try it", BTC×DOGE orange "Likely fails") as clickable Paper components that call `setAsset1`/`setAsset2` from PairContext, timeframe guidance grid (15m/1h/4h/1d), learning roadmap list, and EducationalPanel. (2) Rewrite `academy/page.tsx`: manage `activeStep` as local useState(0), render AcademyStepper at top, dispatch to step components based on activeStep (step 0→StepPairSelector, steps 1-2→placeholder for now). Cache cointegration results in useRef keyed by `${asset1}-${asset2}-${timeframe}` to avoid re-fetching when navigating between steps.
  - Verify: `npm run build` exits 0; navigate to /academy → stepper visible with 6 steps → step 1 shows pair cards and educational content → clicking a pair card updates the header selects
  - Done when: Academy page renders with working stepper navigation; step 1 displays all content from learn.py step 1; clicking pair cards sets global PairContext

- [x] **T03: Build Step 2 (StepPriceComparison) — first data-driven chart** `est:35m`
  - Why: Step 2 is the first step that fetches real API data and renders Plotly charts. It retires the "can we render real cointegration charts from API data?" risk that the roadmap identified. This is the critical data→chart pipeline proof.
  - Files: `frontend/components/academy/StepPriceComparison.tsx`, `frontend/app/(dashboard)/academy/page.tsx`
  - Do: (1) Build `StepPriceComparison` that: shows "select a pair" Alert when asset1/asset2 are empty; fetches OHLCV for both assets + calls postCointegration on mount/pair change; shows Mantine Loader/Skeleton during fetch; builds normalized price chart (both prices rebased to 100) and raw dual-axis price chart from OHLCV close prices; SegmentedControl toggles between chart views; displays correlation badge with strength label and color (green ≥0.7, yellow ≥0.3, red <0.3); shows correlation explanation text; renders EducationalPanel with step-2 content from learn.py. (2) Wire into academy/page.tsx step dispatch for activeStep===1. Pass cached cointegration data from page-level cache to avoid redundant fetches.
  - Verify: `npm run build` exits 0; with backend running + pair selected: step 2 shows price chart with 2 traces and correlation badge; toggling SegmentedControl switches chart view; without pair: shows info alert
  - Done when: Step 2 renders real price charts from API data; correlation badge shows correct value; chart toggle works; loading state visible during fetch

- [x] **T04: Build Step 3 (StepCorrelationVsCointegration) — concept chart + pair badges** `est:35m`
  - Why: Step 3 validates Plotly subplot rendering in the PlotlyChart wrapper (identified risk) and completes the first-3-steps scope. It combines synthetic deterministic data (concept chart) with real API data (pair badges), exercising both patterns.
  - Files: `frontend/components/academy/StepCorrelationVsCointegration.tsx`, `frontend/app/(dashboard)/academy/page.tsx`
  - Do: (1) Build `StepCorrelationVsCointegration` that: renders a concept chart with 2 side-by-side subplots using Plotly's multi-axis layout (xaxis/xaxis2, yaxis/yaxis2) — left subplot shows correlated-but-drifting random walks, right shows cointegrated pair. Use deterministic pseudo-random number generator (port the `pseudoRandom` seeded pattern from the S02 demo, NOT Math.random()) to avoid hydration mismatches. (2) Below the concept chart, show real pair comparison section: 3 centered badges (correlation r=X.XXX, Cointegrated/Not Cointegrated, p=X.XXXX) using cointegration results from the page-level cache. Conditional interpretation text based on is_cointegrated. "Select a pair" alert when no pair selected — concept chart still shows since it uses synthetic data. (3) EducationalPanel with step-3 content from learn.py (correlation vs cointegration analogy, key differences list, conditional Your Pair text). (4) Wire into academy/page.tsx step dispatch for activeStep===2.
  - Verify: `npm run build` exits 0; step 3 shows concept chart with 2 subplots even without pair selected; with pair selected shows 3 comparison badges with correct values; educational panel has all 3 layers
  - Done when: Concept chart renders with 2 side-by-side subplots using deterministic data; pair badges show real API values; step 3 is the last piece — full slice demo works end-to-end

## Files Likely Touched

- `frontend/lib/api.ts`
- `frontend/components/academy/AcademyStepper.tsx`
- `frontend/components/academy/EducationalPanel.tsx`
- `frontend/components/academy/StepPairSelector.tsx`
- `frontend/components/academy/StepPriceComparison.tsx`
- `frontend/components/academy/StepCorrelationVsCointegration.tsx`
- `frontend/app/(dashboard)/academy/page.tsx`
