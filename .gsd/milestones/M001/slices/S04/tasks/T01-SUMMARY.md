---
id: T01
parent: S04
milestone: M001
provides:
  - StepCointegrationTest component (Academy step 4)
  - ADF number line chart with colored significance zones
  - Regression scatter plot with OLS line
  - Hedge ratio card with violet badge
  - Pass/fail traffic light alert
  - EducationalPanel with all 3 layers
key_files:
  - frontend/components/academy/StepCointegrationTest.tsx
  - frontend/app/(dashboard)/academy/page.tsx
key_decisions:
  - Used `text+markers` instead of `markers+text` for Plotly scatter mode due to TS type union constraint
patterns_established:
  - useMemo hooks returning { data, layout } for Plotly charts in Academy step components
  - StepHeader sub-component pattern with icon + title + description
observability_surfaces:
  - Two .js-plotly-plot elements when step 4 is active (ADF number line + regression scatter)
  - Badge text shows exact ADF statistic, p-value, hedge ratio values
  - Pass/fail alert color (green/orange) indicates cointegration verdict
duration: 12 minutes
verification_result: passed
completed_at: 2026-03-17T13:30:00+01:00
blocker_discovered: false
---

# T01: Build StepCointegrationTest component and wire step 4 into Academy

**Built Academy Step 4 (Cointegration Test) with ADF number line chart, regression scatter plot, hedge ratio card, pass/fail verdict, and 3-layer educational panel**

## What Happened

Created `StepCointegrationTest.tsx` (~400 lines) following the established S03 step component pattern. The component has three states (no-pair alert, loading skeletons, data-ready full render). Two `useMemo` hooks compute chart data:

1. **ADF number line** — horizontal chart with 4 colored rect zones (reject at 1%/5%/10%, fail to reject), vertical critical value lines with labels, and a diamond marker at the test statistic position. Color-coded green (cointegrated) or red (not cointegrated).

2. **Regression scatter** — scatter plot of price pairs with OLS regression line sorted by x-value. Legend shows the regression equation.

The main component body includes a traffic-light Alert (green ✓ PASS / orange ✗ FAIL) with p-value Badge, descriptive text, both charts with explanatory captions, a hedge ratio card with violet Badge, and a full EducationalPanel with Intuition (drunk person + dog analogy), How It Works (Engle-Granger two-step with Code block formulas), and Your Pair (actual test values with interpretation).

Wired into `page.tsx` as `case 3` in the step dispatch switch.

## Verification

- `npx tsc --noEmit` — zero TypeScript errors ✓
- `npm run build` — exits 0, all routes generated ✓
- Browser: Academy → BTC/ETH selected → Step 4 clicked → ADF number line renders with diamond at -4.080 in green zone ✓
- Regression scatter renders with OLS line (BTC = 20.64 × ETH + 23143) ✓
- Hedge ratio badge shows β = 20.6358 ✓
- Pass/fail alert shows green "✓ PASS: BTC × ETH are cointegrated" with p = 0.0055 badge ✓
- All 3 educational panel layers expand with populated content ✓
- 13/13 browser assertions passed (text visible, selectors visible, no console errors, no failed requests)

**Slice-level verification (partial — T01 of 3):**
- `tsc --noEmit` zero errors ✓
- `npm run build` exits 0 ✓
- Academy → step 4 shows ADF number line, regression scatter, hedge ratio badge, pass/fail alert ✓
- Educational panels on step 4 have all 3 layers with content ✓
- Steps 5-6 not yet built (expected, pending T02/T03)

## Diagnostics

Navigate to Academy → select pair → click "Cointegration Test" step (4th stepper button). Two `.js-plotly-plot` elements should render. Badge text shows exact values. Pass/fail alert color indicates verdict. If data missing, yellow "data not available" alert appears. If switch case doesn't match, default placeholder renders.

## Deviations

- Used `'text+markers'` instead of `'markers+text'` for Plotly scatter mode — `@types/plotly.js` union type doesn't include `'markers+text'`. Both are equivalent at runtime. Added to KNOWLEDGE.md.
- Component is ~400 lines (vs estimated ~350) due to comprehensive zone annotations and educational content.

## Known Issues

None.

## Files Created/Modified

- `frontend/components/academy/StepCointegrationTest.tsx` — new component: ADF number line chart, regression scatter, hedge ratio card, traffic light alert, educational panel
- `frontend/app/(dashboard)/academy/page.tsx` — added StepCointegrationTest import and case 3 to step dispatch switch
- `.gsd/milestones/M001/slices/S04/tasks/T01-PLAN.md` — added Observability Impact section (pre-flight fix)
- `.gsd/KNOWLEDGE.md` — added `markers+text` vs `text+markers` Plotly TS gotcha
