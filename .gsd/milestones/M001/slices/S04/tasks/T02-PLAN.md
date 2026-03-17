---
estimated_steps: 5
estimated_files: 2
---

# T02: Build StepSpread component with rolling window slider and wire step 5 into Academy

**Slice:** S04 — Academy Steps 4-6 (Cointegration → Z-Score & Signals)
**Milestone:** M001

## Description

Build the Step 5 (The Spread) component — the first step with a parameter slider that triggers real-time chart updates via client-side computation. This is the critical proof for R003 (parameter sliders update charts in real-time). The spread data is already available in the CointegrationResponse fetched at page level — the slider changes only the rolling window used to compute mean and σ bands, all done client-side. No API calls on slider change.

**Relevant skills:** `frontend-design` (for component structure and styling patterns).

## Steps

1. **Create `frontend/components/academy/StepSpread.tsx`** — a `'use client'` component. Define props interface:
   ```typescript
   interface StepSpreadProps {
     cointegrationData: CointegrationResponse | null;
     loading: boolean;
     asset1: string;
     asset2: string;
   }
   ```
   Import from `@/lib/api`: `CointegrationResponse`. Import from `plotly.js`: `Data`, `Layout`. Import Mantine: `Alert`, `Badge`, `Group`, `Paper`, `Skeleton`, `Slider`, `Stack`, `Text`, `Title`, `Code`. Import `PlotlyChart`, `EducationalPanel`, `IconChartAreaLine`, `IconInfoCircle`.

2. **Implement client-side rolling computation** as a pure function (not a React hook) within the file:
   ```typescript
   function computeRollingStats(
     spread: (number | null)[],
     window: number
   ): { rollingMean: (number | null)[]; rollingStd: (number | null)[] }
   ```
   For each index `i >= window`, compute the mean and std of `spread[i-window : i]`, skipping null values. For `i < window`, output null. This mirrors the Dash `_build_spread_chart` computation. Handle edge case: if fewer than 2 valid values in window, output null for that position.

3. **Build the spread chart with σ bands** — a `useMemo` block that depends on `[cointegrationData, window]` where `window` is a `useState` local to the component (default 60):
   - Convert `cointegrationData.timestamps` to ISO strings for x-axis.
   - Compute rolling stats from `cointegrationData.spread` using the rolling function.
   - 6 traces for σ bands (3 upper/lower pairs): for n = 3, 2, 1, add upper line (no fill) + lower line with `fill: 'tonexty'`. Fill colors: 3σ = `rgba(51,154,240,0.06)`, 2σ = `rgba(51,154,240,0.10)`, 1σ = `rgba(51,154,240,0.15)`. Both upper and lower are `mode: 'lines'`, `line: { width: 0 }`, `showlegend: false` for upper, named `±Nσ` for lower.
   - Rolling mean trace: dashed yellow line (`#FCC419`, width 2, dash `'dash'`).
   - Raw spread trace: solid blue line (`#339AF0`, width 1.5).
   - Layout: height 400, title `{ text: 'Spread: {asset1} − β×{asset2} (window={window})' }`, hovermode `'x unified'`.

4. **Build the spread histogram** — a second `useMemo` block:
   - Filter out null values from spread array.
   - Single histogram trace: `type: 'bar'` via `go.Histogram` equivalent → actually use Plotly histogram trace type. Color `#339AF0`, opacity 0.7, `nbinsx: 50`.
   - Add a shape (vertical line) at the mean value, dashed yellow, with an annotation "Mean: X.X".
   - Layout: height 280, title "Spread Distribution".

5. **Assemble the component** following the S03 step pattern:
   - **No-pair / loading states** same as T01.
   - **StepHeader**: Group with IconChartAreaLine + Title "The Spread" + description.
   - **Slider section**: Mantine `Slider` component with `value={window}`, `onChange={setWindow}`, min 10, max 200, step 5, marks at 20/60/120/200, color blue. Show label text `Rolling Window: {window} periods` above the slider.
   - **Half-life badge**: Group showing half-life value. Badge color teal if half_life is finite and > 0 and < 100, orange otherwise. Show "N/A" if null/infinite.
   - **Spread chart** + descriptive text below.
   - **Histogram** + descriptive text below.
   - **EducationalPanel** — port from Dash learn.py:
     - 💡 Intuition: leash analogy — spread measures leash length, σ bands show "too far"
     - 🔧 How It Works: spread formula `spread = Asset1 − (β × Asset2)`, rolling mean/std explanation, window trade-off (shorter = reactive/noisy, longer = smooth/lagging). Include Code block for the formula.
     - 📊 Your Pair: actual spread formula with hedge ratio, mean-reverting assessment, half-life value, suggestion to match window to half-life.
   - **Wire into page.tsx** — Add import for `StepSpread` and add `case 4:` to the switch:
     ```typescript
     case 4:
       return (
         <StepSpread
           cointegrationData={cointData}
           loading={cointLoading}
           asset1={asset1}
           asset2={asset2}
         />
       );
     ```
   Run `cd frontend && npm run build` to verify.

## Must-Haves

- [ ] Rolling window slider (10-200) updates spread chart σ bands and rolling mean in real-time — no API calls
- [ ] Spread chart shows ±1σ/2σ/3σ shaded bands around rolling mean with raw spread line
- [ ] Spread histogram shows distribution with mean line
- [ ] Half-life badge displays with appropriate color coding
- [ ] EducationalPanel with all 3 layers populated
- [ ] Slider state is local to component (useState), not lifted to page level
- [ ] Null values in spread array are properly handled in rolling computation
- [ ] `npm run build` exits 0

## Verification

- `cd frontend && npx tsc --noEmit` — zero TypeScript errors
- `cd frontend && npm run build` — exits 0
- Runtime: navigate to Academy → select pair → step 5 → spread chart visible with σ bands
- Runtime: move rolling window slider → chart bands/mean update immediately, browser Network tab shows no new requests

## Inputs

- `frontend/app/(dashboard)/academy/page.tsx` — Academy page with data fetching. `CointegrationResponse` includes `spread: (number | null)[]`, `timestamps: number[]`, `hedge_ratio: number`, `half_life: number | null`, `is_cointegrated: boolean`. Step 5 = switch case 4.
- `frontend/components/academy/EducationalPanel.tsx` — 3-layer accordion, same as T01.
- `frontend/components/charts/PlotlyChart.tsx` — Plotly wrapper with dark theme merging.
- `frontend/lib/api.ts` — `CointegrationResponse` type. `SpreadProperties` interface has `mean`, `std`, `min`, `max`, `median`, `skewness`, `kurtosis`, `autocorr_lag1`.
- **T01 output**: StepCointegrationTest exists and step 4 is wired — confirms the step component pattern works.
- **Dash reference**: `src/statistical_arbitrage/app/pages/learn.py` lines ~1127-1310 — `_build_spread_chart()`, `_build_spread_histogram()`, `_step_spread()`. Port chart logic and educational text.

**Key constraints:**
- `CointegrationResponse.spread` is `(number | null)[]` — rolling computation must filter nulls
- Slider state must be local `useState` inside StepSpread, NOT in page.tsx (would cause re-renders of all steps)
- `useMemo` for chart data must depend on `[cointegrationData, window]` so it recomputes when slider changes
- Plotly histogram trace: use `type: 'histogram'` with `x: spreadValues` — Plotly handles binning
- Plotly shapes for mean line on histogram: use `shapes` array in layout with `type: 'line'`, `xref: 'x'`, `yref: 'paper'`

## Observability Impact

- **Chart render signal**: Two `.js-plotly-plot` elements render inside step 5 content (spread chart + histogram). Selector count confirms charts loaded.
- **Slider state**: Rolling window `useState` is local — slider changes trigger `useMemo` recomputation, visible as chart title updating to `(window=N)`. Browser Network tab shows **zero** new requests on slider move.
- **Half-life badge**: Badge text shows exact half-life value or "N/A". Badge color (teal vs orange) indicates quality.
- **Failure visibility**: If `cointegrationData` is null, a yellow "data not available" alert renders. If the switch case doesn't match, the default placeholder shows. Missing charts = PlotlyChart Skeleton remains visible.
- **No new API calls**: This component reads from the page-level `CointegrationResponse` — no new fetch endpoints or console.error paths introduced.

## Expected Output

- `frontend/components/academy/StepSpread.tsx` — new ~400-line component with rolling computation, spread chart with σ bands, histogram, half-life badge, slider, educational panel
- `frontend/app/(dashboard)/academy/page.tsx` — modified with 1 new import + 1 new switch case (case 4)
