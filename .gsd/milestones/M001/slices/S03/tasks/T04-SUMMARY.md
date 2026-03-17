---
id: T04
parent: S03
milestone: M001
provides:
  - StepCorrelationVsCointegration component with synthetic concept chart (Plotly subplots) and real pair comparison badges
  - Completed S03 scope — all 3 Academy steps work end-to-end
key_files:
  - frontend/components/academy/StepCorrelationVsCointegration.tsx
  - frontend/app/(dashboard)/academy/page.tsx
key_decisions:
  - Plotly subplots via manual dual-axis positioning (xaxis/xaxis2 with domain) rather than make_subplots — react-plotly.js doesn't have a subplot helper
  - DARK_AXIS_STYLE spread before explicit overrides to avoid TS2783 "specified more than once" error
patterns_established:
  - Deterministic PRNG pattern (seededRandom) for synthetic chart data — avoids Math.random() SSR hydration mismatches
  - PlotlyChart xaxis2/yaxis2 require manual dark theme styles since wrapper only merges xaxis/yaxis
observability_surfaces:
  - .js-plotly-plot CSS selector confirms subplot chart rendered in DOM
  - Badge text contains exact "r = X.XXX", "Cointegrated"/"Not Cointegrated", "p = X.XXXX" values from API
  - "No pair selected" Alert renders when PairContext is empty (landmark count increases)
  - console.error('Academy fetch failed: ...') surfaces API failures with URL + status code
duration: 20m
verification_result: passed
completed_at: 2026-03-17
blocker_discovered: false
---

# T04: Build Step 3 (StepCorrelationVsCointegration) — concept chart + pair badges

**Built StepCorrelationVsCointegration with deterministic Plotly subplot concept chart, 3 real pair comparison badges, conditional interpretation text, and 3-layer educational panel — completing S03 scope**

## What Happened

Created `StepCorrelationVsCointegration.tsx` with two main sections:

1. **Concept chart** (always rendered): Two side-by-side Plotly subplots using manual dual-axis positioning (`xaxis`/`xaxis2` with `domain` splits). Left subplot shows correlated random walks that drift apart; right shows cointegrated pair that stays close. Uses `seededRandom()` deterministic PRNG to avoid SSR hydration mismatches. Dark theme axis styles copied manually to `xaxis2`/`yaxis2` since `PlotlyChart` wrapper only deep-merges `xaxis`/`yaxis`.

2. **Pair comparison section** (conditional): When pair is selected, renders 3 centered badges (correlation with color-coded strength, cointegration status green/orange, p-value green/orange), plus conditional interpretation text. When no pair: "No pair selected" Alert below the concept chart.

3. **Educational panel**: Restaurant/bill-splitting analogy for intuition, 4 key differences list for mechanics, conditional pair-specific text.

Wired into `page.tsx` as `activeStep === 2` dispatch — no new API calls needed, reuses cointegration cache from step 2.

## Verification

- `npx tsc --noEmit` — passes (0 errors)
- `npm run build` — exits 0, all 8 routes generated successfully
- **Without pair**: Step 3 shows concept chart with 2 subplots + "No pair selected" alert. 6/6 browser assertions passed.
- **With pair (BTC/ETH)**: 3 badges render (r=0.996 green, Cointegrated green, p=0.0055 green), interpretation text shows "✓ Good news..." message.
- **Full slice walkthrough**: Step 1 → pair cards work → Step 2 → normalized/raw charts + correlation badge → Step 3 → concept chart + badges → educational panels expand/collapse on all steps.
- No console errors or hydration warnings.
- No failed network requests.

### Slice-level verification (S03 final task):
- ✅ `cd frontend && npm run build` exits 0
- ✅ Stepper shows 6 labeled steps; clicking any step navigates
- ✅ Step 1 shows 3 curated pair cards, timeframe guidance, roadmap
- ✅ Clicking pair card populates header selects (PairContext)
- ✅ Step 2 shows normalized price chart + correlation badge
- ✅ SegmentedControl toggles normalized/raw views
- ✅ Step 3 shows synthetic concept chart (2 subplots) + real pair badges
- ✅ Educational panels expand/collapse with 3 layers
- ✅ Steps 2-3 without pair show info alert
- ✅ No console errors or hydration warnings
- ✅ `npx tsc --noEmit` passes

## Diagnostics

- Concept chart: inspect `.js-plotly-plot` elements — should find 1 in step 3 with 4 traces (2 per subplot)
- Badge values: DOM text contains `r = X.XXX`, `Cointegrated`/`Not Cointegrated`, `p = X.XXXX`
- No-pair state: landmark count increases (3→4) due to Alert region appearing
- API errors: `console.error('Academy fetch failed: ...')` with URL + status code

## Deviations

- Minor: `DARK_AXIS_STYLE` spread order reversed (spread before explicit properties) to avoid TypeScript TS2783 error where `title` was specified twice. The plan's code snippet had `...DARK_AXIS_STYLE` after `title`, which overwrites the explicit title.

## Known Issues

None.

## Files Created/Modified

- `frontend/components/academy/StepCorrelationVsCointegration.tsx` — new; concept chart with deterministic PRNG, pair comparison badges, educational panel
- `frontend/app/(dashboard)/academy/page.tsx` — updated step dispatch for activeStep===2
- `.gsd/milestones/M001/slices/S03/tasks/T04-PLAN.md` — added Observability Impact section (pre-flight fix)
