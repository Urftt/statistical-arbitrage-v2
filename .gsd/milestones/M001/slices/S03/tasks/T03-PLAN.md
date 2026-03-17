---
estimated_steps: 5
estimated_files: 2
---

# T03: Build Step 2 (StepPriceComparison) — first data-driven chart

**Slice:** S03 — Academy Step Engine + First 3 Steps
**Milestone:** M001

## Description

Build the Price Comparison step — the first Academy step that fetches real API data and renders Plotly charts. This retires the key risk identified in the milestone roadmap: proving the data→chart pipeline works end-to-end with real cointegration data from the FastAPI backend. The step shows normalized/raw price charts with a toggle, correlation badge, and educational panel.

**Relevant skill:** `frontend-design` — for chart layout, badge styling, SegmentedControl.

## Steps

1. **Create `frontend/components/academy/StepPriceComparison.tsx`** — A `'use client'` component:
   - **Props:** `{ cointegrationData: CointegrationResponse | null; ohlcv1: OHLCVResponse | null; ohlcv2: OHLCVResponse | null; loading: boolean; asset1: string; asset2: string }`
   - **No-pair state:** If `!asset1 || !asset2`, render a Mantine `<Alert>` with "Select a pair using the dropdowns above" (match learn.py's `_no_pair_selected_message()`)
   - **Loading state:** If `loading`, render `<Skeleton height={420} />` for chart area
   - **Chart state management:** Local `useState<'normalized' | 'raw'>('normalized')` for chart toggle
   - **Normalized price chart:** From OHLCV close prices for both assets:
     - Compute normalized prices: `close[i] / close[0] * 100` for each asset
     - Build `data` array with 2 Scatter traces (mode: 'lines', name: asset1/asset2)
     - X-axis: convert timestamps from OHLCV (epoch ms) to ISO strings or Date objects
     - Add horizontal line at y=100 via layout shape (dashed, semi-transparent white)
     - Layout: title "Normalized Prices: {asset1} vs {asset2}", yaxis title "Normalized Price (Base = 100)", height 420, hovermode "x unified", legend horizontal at top
   - **Raw dual-axis chart:** Two traces on separate y-axes:
     - Trace 1: asset1 close prices on yaxis (left)
     - Trace 2: asset2 close prices on yaxis2 (right, overlaying 'y')
     - Layout includes `yaxis: { title: asset1+" (EUR)" }` and `yaxis2: { title: asset2+" (EUR)", side: "right", overlaying: "y" }`
     - Note: PlotlyChart's deep merge handles yaxis but you must explicitly pass yaxis2 in layout
   - **Chart toggle:** Mantine `<SegmentedControl>` with options "Normalized (Base 100)" and "Actual Prices". Controls which chart is visible (conditionally render the active chart OR use display:none to keep both in DOM)
   - **Correlation section:** Below the chart:
     - Extract `correlation` from `cointegrationData`
     - Color logic: green if |r| ≥ 0.7, yellow if |r| ≥ 0.3, red otherwise
     - Label logic: "Very strong" (≥0.9), "Strong" (≥0.7), "Moderate" (≥0.5), "Weak" (≥0.3), "Very weak" (<0.3)
     - Display: `<Group>` with "Pearson Correlation:" text + filled Badge `r = {corr.toFixed(3)}` + light Badge with label
     - Below: explanation text about what correlation measures, and warning that correlation alone isn't enough
   - **Educational panel:** `<EducationalPanel>` with content from learn.py lines 580-618:
     - Intuition: "Two dogs on leashes held by the same walker" analogy about normalized vs raw
     - Mechanics: Actual price chart uses two y-axes, normalization rebases to 100, Pearson formula `r = cov(returns₁, returns₂) / (σ₁ × σ₂)`, scale explanation
     - Your Pair: Dynamic text using correlation value — conditional messaging based on strength

2. **Update `frontend/app/(dashboard)/academy/page.tsx`** — Wire step 2 into the dispatch:
   - Import `StepPriceComparison` and `fetchOHLCV`, `OHLCVResponse`
   - Add OHLCV state: `useState<OHLCVResponse | null>(null)` for each asset
   - Extend the existing fetch effect to also call `fetchOHLCV(\`${asset1}/EUR\`, timeframe)` and `fetchOHLCV(\`${asset2}/EUR\`, timeframe)` in parallel with `postCointegration()` (use `Promise.all`)
   - Update step dispatch: activeStep 1 → `<StepPriceComparison cointegrationData={cointData} ohlcv1={ohlcv1} ohlcv2={ohlcv2} loading={loading} asset1={asset1} asset2={asset2} />`
   - **Important:** The S01 forward intelligence says symbol format in POST body uses slash (`ETH/EUR`) and URL path uses dash (handled by `fetchOHLCV` internally via `symbolToDash`). The `fetchOHLCV` function in `lib/api.ts` already accepts slash format and converts.

3. **Verify TypeScript:** `cd frontend && npx tsc --noEmit`

4. **Verify build:** `cd frontend && npm run build` — exits 0

5. **Runtime verification:** With FastAPI running at :8000 and Next.js at :3000:
   - Select a pair (e.g., ETH + ETC, 1h) in the header
   - Navigate to step 2 via stepper
   - Normalized price chart renders with 2 traces and horizontal line at 100
   - Correlation badge shows correct value with appropriate color
   - SegmentedControl toggle switches between normalized and raw views
   - Raw chart shows dual y-axes
   - Without pair selected: shows info alert, no errors

## Must-Haves

- [ ] Step 2 fetches OHLCV + cointegration data from the API
- [ ] Normalized price chart renders with 2 traces, both rebased to 100
- [ ] Raw dual-axis price chart renders with separate y-axes
- [ ] SegmentedControl toggles between chart views
- [ ] Correlation badge shows value with correct color and strength label
- [ ] "Select a pair" alert shows when no pair is selected
- [ ] Loading skeleton shows during API fetch
- [ ] EducationalPanel with 3 layers of content
- [ ] `npm run build` exits 0

## Verification

- `cd frontend && npx tsc --noEmit` passes
- `cd frontend && npm run build` exits 0
- With backend + frontend running: step 2 renders real chart data with correlation badge
- Without pair selected: shows info alert, no console errors
- Chart toggle switches between normalized and raw views

## Inputs

- `frontend/components/academy/EducationalPanel.tsx` — from T01
- `frontend/app/(dashboard)/academy/page.tsx` — from T02 (with stepper, step dispatch, cointegration cache)
- `frontend/components/charts/PlotlyChart.tsx` — existing SSR-safe wrapper; pass data + layout, dark theme auto-applied
- `frontend/lib/api.ts` — `fetchOHLCV(symbol, timeframe)` returns `OHLCVResponse` with timestamps, close arrays; `postCointegration()` returns `CointegrationResponse` with correlation value
- `src/statistical_arbitrage/app/pages/learn.py` — lines 425-625 for chart building logic and educational text
- **Key knowledge:** Z-score/spread arrays in cointegration response contain null values (D010) — not relevant for step 2 (only uses OHLCV close prices and scalar correlation), but important context
- **Key knowledge:** PlotlyChart deep-merges xaxis/yaxis from PLOTLY_DARK_TEMPLATE but yaxis2 must be passed explicitly in layout (no template default for secondary axis)

## Expected Output

- `frontend/components/academy/StepPriceComparison.tsx` — new file with normalized/raw price charts, correlation badge, chart toggle, educational panel
- `frontend/app/(dashboard)/academy/page.tsx` — updated to fetch OHLCV data and dispatch to StepPriceComparison for step 2
