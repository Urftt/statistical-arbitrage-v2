---
id: T03
parent: S03
milestone: M001
provides:
  - StepPriceComparison component with normalized/raw price charts, correlation badge, chart toggle, educational panel
  - OHLCV data fetching in Academy page (parallel with cointegration via Promise.all)
  - OHLCV cache in Academy page keyed by asset1-asset2-timeframe
key_files:
  - frontend/components/academy/StepPriceComparison.tsx
  - frontend/app/(dashboard)/academy/page.tsx
key_decisions:
  - Both charts kept in DOM with display toggle (not conditional render) to avoid Plotly re-initialization on toggle
  - OHLCV cache uses same useRef pattern as cointegration cache for consistency
patterns_established:
  - Data-driven Academy step pattern: page.tsx fetches data, passes as props to step component, step renders charts via PlotlyChart wrapper
  - Plotly Layout.title must use object format { text: string } for TypeScript compatibility (not bare string)
  - yaxis2 must be explicitly passed in layout for dual-axis charts (PlotlyChart only deep-merges yaxis)
observability_surfaces:
  - console.error from apiFetch on OHLCV/cointegration fetch failures (URL + status code)
  - Network tab shows 3 parallel requests on pair selection (1 POST cointegration + 2 GET OHLCV)
  - .js-plotly-plot CSS selector confirms chart rendered in DOM
  - Correlation badge text contains exact r value for visual verification
duration: 25m
verification_result: passed
completed_at: 2026-03-17
blocker_discovered: false
---

# T03: Build Step 2 (StepPriceComparison) — first data-driven chart

**Built StepPriceComparison with normalized/raw Plotly price charts, SegmentedControl toggle, correlation badge with color/strength logic, and 3-layer educational panel — proves the data→chart pipeline end-to-end**

## What Happened

Created `StepPriceComparison.tsx` with:
- No-pair state: Mantine Alert "No pair selected" when asset1/asset2 empty
- Loading state: Skeleton placeholder during API fetch
- Normalized price chart: both OHLCV close series rebased to 100, horizontal dashed line at 100, title/axis labels, horizontal legend
- Raw dual-axis chart: left y-axis for asset1 (EUR), right y-axis for asset2 (EUR) with explicit yaxis2 config
- SegmentedControl toggling between "Normalized (Base 100)" and "Actual Prices" — both charts stay in DOM with display toggle
- Correlation section: filled Badge with r value, light Badge with strength label ("Very strong"/"Strong"/"Moderate"/"Weak"/"Very weak"), color logic (green ≥0.7, yellow ≥0.3, red otherwise), explanation text with warning about correlation limitations
- EducationalPanel with 3 layers: dog-walker analogy (intuition), normalization + Pearson formula (mechanics), dynamic pair-specific text based on correlation strength

Updated `academy/page.tsx` to:
- Fetch OHLCV for both assets in parallel with cointegration via `Promise.all`
- Cache OHLCV results in `useRef` keyed by `asset1-asset2-timeframe`
- Dispatch to `StepPriceComparison` for activeStep 1

## Verification

- `npx tsc --noEmit` — passes clean (0 errors)
- `npm run build` — exits 0, all pages generated successfully
- Runtime with FastAPI + Next.js:
  - Step 2 without pair → "No pair selected" alert renders, no console errors
  - Clicked BTC×ETH pair card on step 1 → both header selects populated
  - Navigated to step 2 → normalized chart renders with BTC (blue) and ETH (green) traces, both rebased to 100, horizontal line at 100
  - SegmentedControl clicked "Actual Prices" → raw dual-axis chart shows: left axis "BTC (EUR)" 55k-85k, right axis "ETH (EUR)" 160-280
  - Correlation badge: "R = 0.996" (green filled) + "VERY STRONG" (green light) — correct for BTC/ETH
  - Educational panel: all 3 layers present, Intuition expanded by default
  - `browser_assert` passed: text_visible for all key content, no_console_errors

Slice-level verification (partial — T03 is task 3 of 4):
- ✅ `npm run build` exits 0
- ✅ Stepper shows 6 labeled steps; clicking any step navigates to it
- ✅ Step 1 shows 3 curated pair cards, timeframe guidance, learning roadmap
- ✅ Clicking a pair card populates the header selects
- ✅ Step 2 shows normalized price chart + correlation badge for selected pair
- ✅ SegmentedControl toggles between normalized and raw price views
- ⬜ Step 3 shows synthetic concept chart + real pair badges (T04)
- ✅ Educational panels on steps 1-2 expand/collapse with 3 layers
- ✅ Step 2 without a pair selected shows info alert
- ✅ No console errors or hydration warnings
- ✅ No TypeScript errors

## Diagnostics

- Check Network tab for 3 parallel requests on pair selection: `POST /api/analysis/cointegration`, `GET /api/pairs/BTC-EUR/ohlcv`, `GET /api/pairs/ETH-EUR/ohlcv`
- Inspect `.js-plotly-plot` elements in DOM: 2 present (one per chart view), only 1 visible at a time based on display toggle
- Correlation badge text in DOM contains exact `r = X.XXX` value
- API errors logged to console.error with URL + status code pattern
- `console.error('Academy fetch failed: ...')` in page.tsx for any fetch failure

## Deviations

- Plotly.js TypeScript types require `title: { text: string }` object format instead of bare `title: string` — adjusted from plan's implicit string usage
- Plotly.js TypeScript types don't support `titlefont` on LayoutAxis — used `title: { text, font }` nested format instead

## Known Issues

None

## Files Created/Modified

- `frontend/components/academy/StepPriceComparison.tsx` — new: Price Comparison step with normalized/raw charts, correlation badge, chart toggle, educational panel
- `frontend/app/(dashboard)/academy/page.tsx` — updated: added OHLCV state/cache/fetch, wired StepPriceComparison for step 2
- `.gsd/milestones/M001/slices/S03/tasks/T03-PLAN.md` — added Observability Impact section (pre-flight fix)
