# S03: Academy Step Engine + First 3 Steps — Research

**Date:** 2026-03-17
**Status:** Ready for planning

## Summary

This slice builds the Academy step engine and the first 3 Academy steps (pair selection, price comparison, correlation vs cointegration) on top of the S01 API and S02 app shell. The work is well-scoped: all infrastructure exists (API endpoints, PlotlyChart wrapper, PairContext, dark theme, routing). The Dash `learn.py` (1,946 lines) is the authoritative reference for step content, educational text, chart designs, and the three-layer panel structure.

The natural decomposition is: (1) shared components (stepper + educational panel), (2) step 1 (pair selection — static content, no API calls), (3) step 2 (price comparison — two OHLCV fetches + chart), (4) step 3 (correlation vs cointegration — synthetic concept chart + cointegration API results + side-by-side comparison). Each step is independent once the shared components exist.

The riskiest part is proving the Plotly chart integration works end-to-end with real API data — S02 only proved it with static demo data. Step 2 is the right place to retire that risk since it's the simplest data→chart path (fetch OHLCV, normalize, render).

## Recommendation

Build shared components first (AcademyStepper, EducationalPanel), then build steps 1→2→3 in order. Step 2 should be built before step 3 because it proves the data→chart pipeline with a simpler API shape (just OHLCV), while step 3 requires the full cointegration response.

The frontend `CointegrationResponse` TypeScript interface in `lib/api.ts` must be extended — it's missing `critical_values`, `intercept`, `interpretation`, `spread_stationarity`, `spread_properties`, and `half_life_note` that the API actually returns. Steps 3 and 4 need these fields.

Academy state (current step index) should live as local React state within the Academy page, not in URL or global context. Step params (slider values) are S04 scope. Pair selection is already global via PairContext.

## Implementation Landscape

### Key Files

- `src/statistical_arbitrage/app/pages/learn.py` — **1,946 lines.** Authoritative content source. Contains all educational text, step definitions, chart builders, and the 3-layer panel pattern. Extract text and chart logic from here when building React equivalents. Key functions per step:
  - Step 1: `_step_pair_selector()` (lines ~300-418) — curated pair cards, timeframe guidance, learning roadmap
  - Step 2: `_step_price_comparison()` (lines ~496-620) — normalized + raw dual-axis price charts, correlation badge, chart toggle
  - Step 3: `_step_correlation_vs_cointegration()` (lines ~700-835) — synthetic concept chart (`_build_concept_chart()`), side-by-side correlation vs cointegration badges, conditional pair analysis
  - Educational panel: `_educational_panel()` (lines ~84-135) — 3-layer Accordion (Intuition, How It Works, Your Pair)
  - Step definitions: `TEACHING_STEPS` (lines ~21-56) — 6 step objects with label, description, icon name

- `frontend/app/(dashboard)/academy/page.tsx` — **Current placeholder.** Replace entirely with the Academy step engine. This is the main file to rewrite.

- `frontend/components/charts/PlotlyChart.tsx` — **Existing.** SSR-safe Plotly wrapper with dark theme auto-merge. Import and use as-is. All charts go through this component.

- `frontend/contexts/PairContext.tsx` — **Existing.** Provides `asset1`, `asset2`, `timeframe`, `coins`, `loading`, `error`. The Academy consumes this for pair selection state and API calls.

- `frontend/lib/api.ts` — **Needs extension.** Currently has `fetchPairs()`, `fetchOHLCV()`, `postCointegration()`. The `CointegrationResponse` interface is incomplete — missing 6 fields the API returns. Need to add these fields and potentially add `fetchOHLCV` for both assets in step 2.

- `frontend/lib/theme.ts` — **Existing.** `PLOTLY_DARK_TEMPLATE` is auto-merged by PlotlyChart. No changes needed.

- `frontend/components/layout/Header.tsx` — **Existing.** Global pair selects. No changes needed.

### New Files to Create

- `frontend/components/academy/AcademyStepper.tsx` — Mantine Stepper component with 6 steps from TEACHING_STEPS, free navigation (allowNextStepsSelect), click-to-navigate. This is the top-level step navigator.

- `frontend/components/academy/EducationalPanel.tsx` — 3-layer Accordion matching `_educational_panel()` from learn.py. Props: `intuition`, `mechanics`, `pairSpecific`, optional `stepId`. Uses Mantine Accordion with `multiple`, opens "Intuition" by default.

- `frontend/components/academy/StepPairSelector.tsx` — Step 1 content. Static content: intro text, curated pair suggestion cards (3 cards: BTC×ETH, SOL×AVAX, BTC×DOGE), timeframe guidance grid, learning roadmap list. No API calls — purely educational/navigational.

- `frontend/components/academy/StepPriceComparison.tsx` — Step 2. Fetches OHLCV for both assets, builds normalized + raw price charts, shows correlation badge, has chart toggle (SegmentedControl). Uses `postCointegration()` for the correlation value (or fetches two OHLCV and computes correlation client-side — API approach is cleaner since cointegration endpoint returns correlation).

- `frontend/components/academy/StepCorrelationVsCointegration.tsx` — Step 3. Renders synthetic concept chart (correlated-not-cointegrated vs cointegrated side-by-side subplot), fetches cointegration results for pair comparison badges (correlation, cointegration, p-value), educational panel with conditional Your Pair content.

### Data Flow: How Steps Get Their Data

Step 1 needs no data. Steps 2-3 need pair data from the API.

**Step 2 approach:** Call `postCointegration({ asset1: X/EUR, asset2: Y/EUR, timeframe })` which returns `correlation`, `timestamps`, `spread`, `zscore`, etc. Also call `fetchOHLCV(asset1)` and `fetchOHLCV(asset2)` for close prices to build price charts. The cointegration endpoint doesn't return raw prices — only spread/zscore. OHLCV endpoint returns close prices needed for the normalized chart.

**Step 3 approach:** Reuse the cointegration response from step 2 (or re-fetch). The concept chart uses synthetic data generated client-side (deterministic seed). The pair comparison section uses `is_cointegrated`, `p_value`, `correlation` from the cointegration response.

**State management:** The Academy page should cache the cointegration result after the first fetch so navigating between steps doesn't re-trigger API calls. A `useRef` or `useState` keyed by `${asset1}-${asset2}-${timeframe}` is sufficient.

### CointegrationResponse Interface Gap

The current TS interface is missing these fields that the API returns:

```typescript
// Fields to ADD to CointegrationResponse in lib/api.ts:
critical_values: { one_pct: number; five_pct: number; ten_pct: number };
intercept: number;
interpretation: string;
half_life_note: string | null;
spread_stationarity: {
  name: string;
  adf_statistic: number;
  p_value: number;
  critical_values: { one_pct: number; five_pct: number; ten_pct: number };
  is_stationary: boolean;
  interpretation: string;
};
spread_properties: {
  mean: number; std: number; min: number; max: number;
  median: number; skewness: number; kurtosis: number; autocorr_lag1: number;
};
```

S03 steps 2-3 don't strictly need all of these (step 2 uses correlation, step 3 uses is_cointegrated/p_value/correlation), but step 4 (S04) needs critical_values, interpretation, etc. Better to extend the interface now so S04 doesn't have to fix it later.

### Build Order

1. **Extend `lib/api.ts`** — Add missing fields to `CointegrationResponse`. This is a 2-minute change but unblocks correct typing for steps 2-3 and all of S04.

2. **Build `AcademyStepper` + `EducationalPanel`** — Shared components used by all steps. Stepper is a thin Mantine wrapper. Panel is a 3-slot Accordion. These are small, self-contained, and everything downstream depends on them.

3. **Build Step 1 (StepPairSelector)** — Static content only. No API calls, no charts. Proves the stepper→step dispatch works. This is the cheapest step to build and validates the component architecture.

4. **Build Step 2 (StepPriceComparison)** — First real data step. Fetches OHLCV + cointegration, builds normalized/raw price charts via PlotlyChart, shows correlation badge. **This retires the chart data pipeline risk** (proof: real Plotly chart renders from real API data).

5. **Build Step 3 (StepCorrelationVsCointegration)** — Synthetic concept chart (Plotly subplot) + real pair comparison badges + conditional educational content. Depends on step 2 patterns (API fetch, chart rendering).

6. **Rewrite `academy/page.tsx`** — Wire stepper + steps together. Manage active step state, cache cointegration results, handle loading/error states, dispatch to step components.

**Alternative:** Steps could be built bottom-up within page.tsx as a single large file. But component separation is better because S04 adds steps 4-6 following the same pattern and needs clean extension points.

### Verification Approach

1. **Build check:** `cd frontend && npm run build` must pass (SSR safety for all new components)
2. **Visual verification with backend running:**
   - Start FastAPI: `cd /Users/luckleineschaars/repos/statistical-arbitrage-v2 && uv run python run_api.py`
   - Start Next.js: `cd frontend && npm run dev`
   - Navigate to http://localhost:3000/academy
   - Stepper shows 6 steps, clicking navigates between them
   - Step 1 shows curated pair cards and educational content
   - Select a pair (e.g., ETH + ETC, 1h) in the header
   - Step 2 shows real normalized price chart with correlation badge
   - Step 3 shows synthetic concept chart AND real pair badges (correlation, cointegration, p-value)
   - Educational panels expand/collapse with all 3 layers
3. **Error states:** Steps 2-3 show "select a pair" message when no pair is selected
4. **No console errors or hydration warnings**

## Constraints

- **PlotlyChart is mandatory** — all charts must go through the `<PlotlyChart>` wrapper for SSR safety and dark theme. Never import `react-plotly.js` directly.
- **PairContext is the single source of pair state** — don't create separate pair selectors inside Academy. Step 1's "suggested pairs" cards should set the global pair context when clicked (via `setAsset1`/`setAsset2`).
- **Mantine v8** — use Mantine components for all UI (Stepper, Accordion, Badge, Alert, Paper, SegmentedControl, etc.). Already installed.
- **No Dash imports** — this is React code. Extract text/logic from learn.py but never import it.
- **Asset symbols in API bodies use slash format** — `"ETH/EUR"` in POST body, `"ETH-EUR"` in URL path. The PairContext stores base currencies (`"ETH"`), so the Academy must construct full symbols: `${asset1}/EUR`.

## Common Pitfalls

- **Step 3 concept chart uses `make_subplots`** — Plotly subplots need a different layout structure. In React, this means building the data array with `xaxis: 'x2'`/`yaxis: 'y2'` for the second subplot and setting `grid` or `xaxis2`/`yaxis2` in layout. The PlotlyChart wrapper's deep-merge handles single xaxis/yaxis but may need explicit handling for multi-axis layouts. Test this carefully.
- **Hydration mismatch with synthetic data** — The Dash concept chart uses `np.random.seed(42)`. In React, use a deterministic PRNG (S02 already has the `pseudoRandom` pattern in the demo chart). Don't use `Math.random()`.
- **Null values in z-score/spread arrays** — The cointegration response contains `null` values for rolling warmup. Steps 2-3 don't chart z-scores, but the data is in the cached response. Step 2 uses only OHLCV close prices (no nulls). Step 3 uses only scalar values (correlation, p_value, is_cointegrated — no nulls).
- **Loading states** — `postCointegration()` may take 1-2 seconds. Show Mantine Skeleton or Loader while waiting. Don't render empty charts.

## Open Risks

- **Plotly subplot rendering in react-plotly.js** — Step 3's concept chart uses side-by-side subplots. While standard Plotly, this hasn't been tested in the PlotlyChart wrapper yet. The deep-merge for xaxis/yaxis may need care for xaxis2/yaxis2. Low risk (standard Plotly feature) but worth verifying early.
