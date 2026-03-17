---
id: T02
parent: S04
milestone: M001
provides:
  - StepSpread component (Academy step 5) with rolling window slider and σ bands
  - Client-side rolling mean/std computation (proof for R003 — no API calls on slider change)
key_files:
  - frontend/components/academy/StepSpread.tsx
  - frontend/app/(dashboard)/academy/page.tsx
key_decisions:
  - Used `as Data` cast for histogram trace to bypass missing `nbinsx` in Plotly TS types (runtime property exists but @types/plotly.js omits it)
  - Timestamps are epoch-ms from API — use `new Date(ts)` not `new Date(ts * 1000)` (consistent with StepPriceComparison pattern)
patterns_established:
  - Rolling computation as pure function (not a hook) for testability — `computeRollingStats(spread, window)` returns `{ rollingMean, rollingStd }`
  - Local slider state via `useState` inside step component — slider changes trigger `useMemo` recomputation without page-level re-renders
  - σ band rendering pattern: 3 pairs of upper/lower traces with `fill: 'tonexty'` and increasing opacity (0.06/0.10/0.15)
observability_surfaces:
  - Two `.js-plotly-plot` elements confirm charts rendered
  - Chart title includes `(window=N)` — reflects current slider value
  - Half-life Badge text shows exact value or "N/A"; color (teal/orange) indicates quality
  - Browser Network tab shows zero fetch/XHR requests on slider change
duration: ~15min
verification_result: passed
completed_at: 2026-03-17
blocker_discovered: false
---

# T02: Build StepSpread component with rolling window slider and wire step 5 into Academy

**Built Academy Step 5 (The Spread) with rolling window slider, spread chart with ±1σ/2σ/3σ bands, histogram with mean line, half-life badge, and 3-layer educational panel — slider updates charts client-side with zero API calls**

## What Happened

Created `StepSpread.tsx` (~390 lines) following the T01 step component pattern. Key implementation:

1. **Pure `computeRollingStats()` function** — computes rolling mean and std over a spread array with null handling. For each index ≥ window, collects valid values in the window and computes mean/std (requires ≥2 valid values).

2. **Spread chart with σ bands** — `useSpreadChart` hook depends on `[cointegrationData, window]`. Renders 6 traces for σ bands (3 upper/lower pairs at 3σ/2σ/1σ), plus rolling mean (dashed yellow) and raw spread (solid blue). Title dynamically shows `(window=N)`.

3. **Histogram** — `useSpreadHistogram` hook renders Plotly histogram trace with 50 bins. Mean line rendered as a layout `shape` with annotation.

4. **Slider** — Mantine `Slider` with local `useState(60)`, range 10-200, step 5, marks at 20/60/120/200. Label shows "Rolling Window: N periods".

5. **Half-life badge** — Teal if half_life is finite, positive, and < 100; orange otherwise. Shows "N/A" for null/infinite.

6. **Educational panel** — Intuition (leash analogy), How It Works (spread formula with Code block, window trade-off list), Your Pair (actual hedge ratio, mean-reversion assessment, half-life).

7. **Wired into page.tsx** — Added `StepSpread` import and `case 4:` in the step dispatch switch.

Fixed a timestamp bug during verification: API returns epoch-ms, so `new Date(ts)` is correct (not `new Date(ts * 1000)` which produced year 57000+ dates).

## Verification

- `npx tsc --noEmit` — zero TypeScript errors
- `npm run build` — exits 0, all routes generated
- Runtime: Academy → select BTC/ETH → step 5 → spread chart visible with σ bands, histogram with mean line
- Runtime: Slider moved from 60 to 105 → chart title updated to `(window=105)`, σ bands visually changed
- Runtime: `browser_get_network_logs(filter='fetch-xhr')` after slider change → "No network requests captured" (zero API calls)
- 2 `.js-plotly-plot` elements confirmed via JS evaluation
- Half-life badge shows "N/A" with orange color for BTC/ETH pair
- All 3 educational panels render (Intuition expanded, How It Works and Your Pair collapsed)
- X-axis dates show correct values (Dec 2025 → Mar 2026)

### Slice-level verification (partial — intermediate task):
- ✅ `npx tsc --noEmit` — zero TypeScript errors
- ✅ `npm run build` — exits 0, all routes generated
- ✅ Academy → step 5 → move rolling window slider → spread chart updates instantly without API call
- ✅ Educational panel on step 5 has all 3 layers populated
- ✅ Step 5 without pair selected shows "No pair selected" info alert
- ⬜ Step 6 not yet built (T03)
- ⬜ Step 4 manual verification deferred (built in T01)

## Diagnostics

- Navigate to Academy → select pair → click "The Spread" (5th stepper button)
- Two `.js-plotly-plot` elements should render (spread chart + histogram)
- Chart title format: `Spread: {asset1} − β×{asset2} (window={N})` — N updates when slider moves
- Half-life Badge text shows exact value or "N/A"
- If data missing, yellow "data not available" alert renders
- If switch case doesn't match, default placeholder renders
- Browser Network tab should show zero fetch/XHR requests after slider interaction

## Deviations

- Used `as Data` type assertion for histogram trace because `@types/plotly.js` doesn't include `nbinsx` property despite Plotly runtime supporting it. This is a known gap in the type definitions.
- Fixed timestamp conversion: API returns epoch-ms, not epoch-seconds. Used `new Date(ts)` pattern consistent with StepPriceComparison.

## Known Issues

None.

## Files Created/Modified

- `frontend/components/academy/StepSpread.tsx` — New ~390-line component: rolling computation, spread chart with σ bands, histogram, slider, half-life badge, educational panel
- `frontend/app/(dashboard)/academy/page.tsx` — Added StepSpread import + case 4 in step dispatch switch
- `.gsd/milestones/M001/slices/S04/tasks/T02-PLAN.md` — Added Observability Impact section (pre-flight fix)
