# S04: Academy Steps 4-6 (Cointegration → Z-Score & Signals) — Research

**Date:** 2026-03-17

## Summary

S04 is straightforward extension work — building 3 new step components (Steps 4, 5, 6) following the exact pattern established by S03 (Steps 1-3). The architecture is proven: page-level data fetching → cached via `useRef` → passed as props to standalone `'use client'` step components → rendered via `PlotlyChart` wrapper with `EducationalPanel` for educational content.

The main complexity is in Steps 5-6 which introduce **parameter sliders** that must trigger real-time chart updates. Unlike Steps 1-3 which use static data from the cointegration response, Steps 5-6 need to either (a) re-fetch from the `/api/analysis/zscore` endpoint with a new `lookback_window`, or (b) compute rolling stats client-side from the spread data already in the cointegration response. The cointegration response already includes `spread`, `zscore` (at window=60), `timestamps`, `half_life`, `spread_stationarity`, and `spread_properties` — enough for Step 4 and the initial render of Steps 5-6. For slider-driven updates in Step 5 (rolling window) and Step 6 (entry/exit/stop thresholds), client-side computation is the right choice: the spread is already available, rolling mean/std/z-score are trivial to compute in JS, and signal generation is a pure state machine. This avoids API round-trips on every slider change and keeps updates instant.

The Dash `learn.py` has complete content for all 3 steps (lines 837-1630): ADF number line chart, regression scatter, spread chart with σ bands, spread histogram, z-score chart with threshold zones and signal markers, signal summary panel, and full educational text for all 3 EducationalPanel layers. This content ports directly to React.

## Recommendation

Follow the S03 step component pattern exactly. Build three new components (`StepCointegrationTest`, `StepSpread`, `StepZScoreSignals`) and wire them into the existing `page.tsx` step dispatch switch. Keep Steps 5-6 slider state local to the step component (not at page level) since the parameters only affect chart rendering, not API fetching. Compute rolling stats and signals client-side from the cointegration response data that's already fetched at page level.

No new API calls needed — `POST /api/analysis/cointegration` already returns everything Steps 4-6 need (spread, zscore, timestamps, hedge_ratio, cointegration_score, p_value, critical_values, is_cointegrated, half_life, spread_stationarity, spread_properties, intercept). The existing `/api/analysis/zscore` endpoint could serve Step 5-6 slider changes, but client-side computation is faster for real-time slider UX and avoids network jitter.

## Implementation Landscape

### Key Files

- `frontend/app/(dashboard)/academy/page.tsx` — Step dispatch switch (add cases 3, 4, 5). Already has `cointData`, `ohlcv1`, `ohlcv2` fetched and cached. Steps 4-6 receive these as props. **Minimal changes**: add 3 import lines + 3 switch cases.
- `frontend/components/academy/StepCointegrationTest.tsx` — **New file**. ADF number line chart (Plotly shapes/annotations), regression scatter plot, hedge ratio card, cointegration pass/fail traffic light, EducationalPanel. Uses `cointegrationData` + `ohlcv1`/`ohlcv2` props. No sliders.
- `frontend/components/academy/StepSpread.tsx` — **New file**. Spread chart with σ bands (rolling mean ± 1/2/3 σ), spread histogram, half-life badge, rolling window slider (10-200, step 5). Client-side rolling computation from `cointegrationData.spread`. EducationalPanel.
- `frontend/components/academy/StepZScoreSignals.tsx` — **New file**. Z-score chart with threshold zones (hrect), signal markers (scatter points), 3 parameter sliders (entry ±1.0-3.0, exit ±0.0-1.5, stop ±2.0-5.0). Client-side signal generation state machine. Signal summary stats panel. EducationalPanel.
- `frontend/lib/api.ts` — Already has `CointegrationResponse` with all needed fields (`spread`, `zscore`, `half_life`, `spread_stationarity`, `spread_properties`, `critical_values`, `intercept`). Also has `SpreadResponse` and `ZScoreResponse` types. **No changes needed** unless adding dedicated spread/zscore fetch functions for future use.
- `frontend/components/academy/AcademyStepper.tsx` — **No changes**. Already has all 6 steps in `TEACHING_STEPS` registry.
- `frontend/components/academy/EducationalPanel.tsx` — **No changes**. Accepts `intuition`, `mechanics`, `pairSpecific` as ReactNode.
- `frontend/components/charts/PlotlyChart.tsx` — **No changes**. But remember: only merges dark theme into `xaxis`/`yaxis`. Step 4's dual-axis regression scatter and any subplot charts need manual `DARK_AXIS_STYLE` on `xaxis2`/`yaxis2`.
- `src/statistical_arbitrage/app/pages/learn.py` — **Read-only reference** for porting. Lines 837-1127 (Step 4), 1127-1331 (Step 5), 1331-1620 (Step 6) contain all chart construction logic, educational text, and signal generation code.

### Build Order

1. **Step 4 (StepCointegrationTest)** — Build first because it's the simplest of the three (no sliders, pure data display). Proves the pattern works for Steps 5-6. Has 2 charts (ADF number line, regression scatter), hedge ratio card, traffic light alert, and educational panel.

2. **Step 5 (StepSpread)** — Build second. Introduces the first slider (rolling window) and client-side rolling computation. This proves the slider→recompute→rerender pattern that Step 6 will also use. Has spread chart with σ bands, spread histogram, half-life badge.

3. **Step 6 (StepZScoreSignals)** — Build last. Most complex: 3 sliders, client-side z-score recomputation, signal generation state machine, signal markers on chart, signal summary panel. Depends on the slider pattern from Step 5.

4. **Wire into page.tsx** — Add imports and switch cases. Trivial but should be last so TypeScript builds pass incrementally.

### Verification Approach

- `cd frontend && npx tsc --noEmit` — zero TypeScript errors
- `cd frontend && npm run build` — exits 0, SSR-safe (the definitive canary)
- Manual: navigate to Academy, select a pair → steps 4-6 show real data
- Step 4: ADF number line shows test statistic diamond, critical value zones, regression scatter with OLS line, hedge ratio badge, pass/fail alert
- Step 5: spread chart updates when rolling window slider moves (no API call, instant)
- Step 6: z-score chart updates when entry/exit/stop sliders move, signal markers appear/disappear, signal summary counts change
- Educational panels on all 3 steps expand/collapse with all 3 layers populated
- No pair selected: all 3 steps show info alert

## Constraints

- **Plotly TypeScript strictness**: `Layout.title` must be `{ text: string }` object, not bare string. `LayoutAxis.title` is `Partial<DataTitle>`. Refer to KNOWLEDGE.md entries.
- **PlotlyChart dark theme gap**: Only `xaxis`/`yaxis` get dark theme merged. Step 4's regression scatter (single-axis) is fine, but any subplot charts need manual `DARK_AXIS_STYLE` application.
- **Spread/zscore null values**: `CointegrationResponse.spread` is `(number | null)[]` and `zscore` is `(number | null)[]`. The first `window-1` z-score values are null. Client-side rolling computation must handle nulls in the spread array.
- **SSR safety**: All step components must be `'use client'` and use PlotlyChart (which wraps `next/dynamic` with `ssr: false`). No direct plotly.js imports.
- **Plotly `as const` readonly arrays**: `DARK_AXIS_STYLE` uses `as const`. If spreading into Plotly Layout types, may need `[...array]` to make mutable. (See KNOWLEDGE.md)
- **TypeScript TS2783**: Spread before explicit overrides, not after, to avoid "specified more than once" error.

## Common Pitfalls

- **Slider state location** — Slider state (rolling window, entry/exit/stop thresholds) must be local to the step component, not lifted to page.tsx. Page-level state would cause unnecessary re-renders of all steps. Use `useState` inside each step component.
- **Client-side rolling computation NaN handling** — The spread array from the API may contain nulls (though currently `CointegrationResponse.spread` is `list[float]` on the backend, the TS type allows `null`). When computing rolling mean/std, skip null/NaN values in the window. The z-score will be null for the first `window-1` positions — skip these in chart traces.
- **Signal generation symmetry** — The Dash signal state machine treats long entries (z ≤ −entry) and short entries (z ≥ +entry) symmetrically but with mirrored exit/stop conditions. Port this exactly — common mistake is to mix up the sign conventions.
- **Plotly hrect/hline for threshold zones** — Use `shapes` array in layout for hrect zones and `annotations` for labels. Don't use `add_hrect`/`add_hline` (that's Python Plotly API). In react-plotly.js, everything goes in the layout object.

