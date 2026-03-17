# S04: Academy Steps 4-6 (Cointegration → Z-Score & Signals)

**Goal:** Complete all 6 Academy teaching steps — steps 4-6 display cointegration test results, spread visualization with rolling bands, and z-score chart with live parameter sliders and trading signals.
**Demo:** Navigate to Academy → select a pair → step through all 6 steps. Steps 4-6 show real data. Step 5 slider updates spread chart instantly. Step 6 sliders update z-score chart and signal summary instantly. Educational panels on all steps show 3-layer content.

## Must-Haves

- Step 4 (Cointegration Test): ADF number line chart, regression scatter with OLS line, hedge ratio badge, pass/fail traffic light alert, 3-layer EducationalPanel
- Step 5 (The Spread): Spread chart with rolling mean and ±1σ/2σ/3σ bands, spread histogram, half-life badge, rolling window slider (10-200), client-side recomputation on slider change, 3-layer EducationalPanel
- Step 6 (Z-Score & Signals): Z-score chart with threshold zones and signal markers, 3 parameter sliders (entry ±1.0-3.0, exit ±0.0-1.5, stop ±2.0-5.0), signal generation state machine, signal summary panel (total trades, long/short entries, stop losses), 3-layer EducationalPanel
- All step components follow established pattern: receive data as props from page.tsx, render via PlotlyChart wrapper, `'use client'` directive
- Slider state is local to step components (not page-level) for efficient re-renders
- All client-side computation (rolling stats, z-score, signal generation) from cointegration response data already fetched at page level — no new API calls on slider change
- `npm run build` exits 0 (SSR-safe, zero TypeScript errors)

## Proof Level

- This slice proves: integration (frontend renders real analysis data from API with interactive parameter controls)
- Real runtime required: yes (manual verification of charts + sliders with live API data)
- Human/UAT required: yes (visual verification of chart correctness, slider responsiveness)

## Verification

- `cd frontend && npx tsc --noEmit` — zero TypeScript errors
- `cd frontend && npm run build` — exits 0, all routes generated
- Manual: Academy → select pair → step 4 shows ADF number line with diamond marker, regression scatter with OLS line, hedge ratio badge, pass/fail alert
- Manual: Academy → step 5 → move rolling window slider → spread chart updates instantly without API call
- Manual: Academy → step 6 → move entry/exit/stop sliders → z-score chart zones shift, signal markers appear/disappear, signal summary counts change
- Manual: Educational panels on steps 4-6 each have all 3 layers (Intuition, How It Works, Your Pair) with populated content
- Manual: Steps 4-6 without pair selected show "No pair selected" info alert

## Observability / Diagnostics

- Runtime signals: `console.error('Academy fetch failed: ...')` already fires on API errors (from S03 page.tsx). No new API calls in S04.
- Inspection surfaces: `.js-plotly-plot` CSS selector count confirms charts rendered. Badge text shows exact values (ADF statistic, p-value, hedge ratio, half-life). Signal summary shows trade counts.
- Failure visibility: If step components fail to render, the switch statement falls through to the default placeholder text. Charts missing = PlotlyChart Skeleton remains visible.
- Redaction constraints: none

## Integration Closure

- Upstream surfaces consumed: `CointegrationResponse` from `lib/api.ts` (spread, zscore, timestamps, hedge_ratio, cointegration_score, p_value, critical_values, is_cointegrated, half_life, spread_stationarity, spread_properties, intercept, correlation). `OHLCVResponse` (close prices for regression scatter). `EducationalPanel` from S03. `PlotlyChart` wrapper from S02. Page-level data fetching + caching from S03's `page.tsx`.
- New wiring introduced in this slice: 3 imports + 3 switch cases in `academy/page.tsx` for step dispatch
- What remains before the milestone is truly usable end-to-end: S05 (Scanner + Deep Dive pages), S06 (Glossary + Polish + Integration)

## Tasks

- [x] **T01: Build StepCointegrationTest component and wire step 4 into Academy** `est:45m`
  - Why: Step 4 is the simplest of the three new steps (no sliders). It proves the data display pattern works for steps 4-6 and delivers ADF visualization, regression analysis, and the cointegration pass/fail verdict.
  - Files: `frontend/components/academy/StepCointegrationTest.tsx` (new), `frontend/app/(dashboard)/academy/page.tsx`
  - Do: Create StepCointegrationTest with: (1) ADF number line chart — Plotly shapes for colored zones (reject at 1%/5%/10%, fail to reject), vline annotations for critical values, diamond marker for test statistic. (2) Regression scatter plot — price scatter + OLS line from hedge_ratio and intercept. (3) Hedge ratio badge card. (4) Pass/fail traffic light Alert. (5) EducationalPanel with all 3 layers. Port content from Dash learn.py lines 837-1120. Wire step 4 into page.tsx switch (case 3). Step receives cointegrationData, ohlcv1, ohlcv2, loading, asset1, asset2 props.
  - Verify: `cd frontend && npm run build` exits 0. Step 4 renders ADF chart + scatter + badge when pair selected.
  - Done when: Step 4 shows ADF number line with diamond marker at test statistic position, colored zones for significance levels, regression scatter with OLS line, hedge ratio badge, pass/fail alert, and educational panel with all 3 layers.

- [x] **T02: Build StepSpread component with rolling window slider and wire step 5 into Academy** `est:50m`
  - Why: Step 5 introduces the first parameter slider and client-side rolling computation — the core pattern that R003 requires. It visualizes the spread with dynamic σ bands and proves real-time chart updates work without API calls.
  - Files: `frontend/components/academy/StepSpread.tsx` (new), `frontend/app/(dashboard)/academy/page.tsx`
  - Do: Create StepSpread with: (1) Rolling window Mantine Slider (min=10, max=200, step=5, marks at 20/60/120/200). (2) Client-side rolling mean/std computation from cointegrationData.spread array. (3) Spread chart with ±1σ/2σ/3σ fill bands, rolling mean dashed line, raw spread line. (4) Spread histogram with mean vline. (5) Half-life badge (teal if finite & < 100, orange otherwise). (6) EducationalPanel with all 3 layers. Slider state is local (useState), triggers useMemo recomputation. Handle null values in spread array. Port content from Dash learn.py lines 1127-1310. Wire step 5 into page.tsx switch (case 4).
  - Verify: `cd frontend && npm run build` exits 0. Step 5 slider moves → chart updates instantly (no network tab activity).
  - Done when: Step 5 shows spread chart with σ bands that shift when slider moves, spread histogram, half-life badge, and educational panel with all 3 layers. No API calls on slider change.

- [ ] **T03: Build StepZScoreSignals component with 3 parameter sliders, signal state machine, and wire step 6 into Academy** `est:1h`
  - Why: Step 6 is the culmination of the Academy — the most complex step with 3 sliders, a signal generation state machine, and the visual payoff of seeing trading signals on real data. This completes R003 (real-time parameter sliders) and the full 6-step flow (R001).
  - Files: `frontend/components/academy/StepZScoreSignals.tsx` (new), `frontend/app/(dashboard)/academy/page.tsx`
  - Do: Create StepZScoreSignals with: (1) Three Mantine Sliders in a SimpleGrid — entry (1.0-3.0, step 0.1, color red), exit (0.0-1.5, step 0.1, color yellow), stop (2.0-5.0, step 0.1, color orange). (2) Client-side z-score recomputation from spread using rolling window. (3) Signal generation state machine — flat→long/short entry→exit/stop_loss. Port exactly from Dash learn.py `_generate_signals()`. (4) Z-score chart with hrect threshold zones, hline threshold markers, z-score line, signal scatter markers (triangle-up green for long entry, triangle-down red for short entry, circle yellow for exits, x orange for stop-loss). (5) Signal summary panel — SimpleGrid with total trades, long entries, short entries, stop losses counts. (6) EducationalPanel with all 3 layers. All slider state local. Wire step 6 into page.tsx switch (case 5). Run final `npm run build` to verify all 3 new steps are SSR-safe.
  - Verify: `cd frontend && npm run build` exits 0. Step 6 sliders move → z-score chart zones shift + signal markers change + summary counts update. All 6 Academy steps navigate and render correctly.
  - Done when: Step 6 shows z-score chart with threshold zones and signal markers, 3 working sliders that update chart and signal summary in real-time, and educational panel with all 3 layers. Full Academy flow (steps 1-6) works end-to-end.

## Files Likely Touched

- `frontend/components/academy/StepCointegrationTest.tsx` (new)
- `frontend/components/academy/StepSpread.tsx` (new)
- `frontend/components/academy/StepZScoreSignals.tsx` (new)
- `frontend/app/(dashboard)/academy/page.tsx` (modified — 3 imports + 3 switch cases)
