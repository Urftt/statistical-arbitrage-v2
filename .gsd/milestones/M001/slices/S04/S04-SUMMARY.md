---
id: S04
parent: M001
milestone: M001
provides:
  - Academy steps 4-6 fully implemented (cointegration test, spread visualization, z-score & signals)
  - Complete 6-step Academy flow working end-to-end with real pair data
  - Client-side rolling computation and signal generation with zero API calls on slider change
  - Signal state machine (pure function) portable to future strategy module
requires:
  - slice: S03
    provides: AcademyStepper, EducationalPanel, step rendering pattern, page-level data fetching + caching
  - slice: S01
    provides: POST /api/analysis/cointegration (spread, zscore, hedge_ratio, p_value, critical_values, half_life, etc.)
  - slice: S02
    provides: AppLayout, PlotlyChart wrapper, PairContext, dark theme
affects:
  - S06
key_files:
  - frontend/components/academy/StepCointegrationTest.tsx
  - frontend/components/academy/StepSpread.tsx
  - frontend/components/academy/StepZScoreSignals.tsx
  - frontend/app/(dashboard)/academy/page.tsx
key_decisions:
  - Client-side rolling computation as pure functions (computeRollingStats, computeZScore) not hooks — testable and portable
  - Signal state machine as pure generateSignals() function — directly portable to strategy module in M002
  - Batched signal markers by type into single Plotly traces for efficient rendering with many signals (86+ trades)
  - Local slider state (useState inside step components) — slider changes trigger useMemo recomputation without page-level re-renders
patterns_established:
  - Pure function pattern for client-side computation (rolling stats, z-score, signal generation) — all reusable
  - Multi-slider coordination via shared useMemo dependency array
  - σ band rendering pattern (3 fill pairs with increasing opacity)
  - Signal marker batching pattern (one scatter trace per signal type)
observability_surfaces:
  - .js-plotly-plot CSS selector count confirms charts rendered per step
  - Badge text shows exact computed values (ADF statistic, p-value, hedge ratio, half-life)
  - Signal Summary panel shows 4 numeric counts (Total Trades, Long/Short Entries, Stop Losses) that update on slider change
  - Chart right-side annotations show current threshold values confirming slider reactivity
  - Pass/fail alert color (green/orange) indicates cointegration verdict
  - Browser Network tab shows zero fetch/XHR requests after slider interaction
drill_down_paths:
  - .gsd/milestones/M001/slices/S04/tasks/T01-SUMMARY.md
  - .gsd/milestones/M001/slices/S04/tasks/T02-SUMMARY.md
  - .gsd/milestones/M001/slices/S04/tasks/T03-SUMMARY.md
duration: ~52 minutes across 3 tasks
verification_result: passed
completed_at: 2026-03-17
---

# S04: Academy Steps 4-6 (Cointegration → Z-Score & Signals)

**Built the final 3 Academy steps — cointegration test visualization, spread chart with live rolling window slider, and z-score chart with 3 parameter sliders + signal state machine — completing the full 6-step interactive learning flow**

## What Happened

Three step components were built in sequence, each adding complexity:

**Step 4 — Cointegration Test** (T01, ~400 lines): The data display step with no sliders. An ADF number line chart shows the test statistic as a diamond marker positioned across 4 colored zones (reject at 1%/5%/10%, fail to reject). A regression scatter plot shows the price relationship with the OLS line. A traffic-light Alert (green PASS / orange FAIL) provides the verdict with a p-value Badge. A hedge ratio card shows the exact β coefficient. The EducationalPanel explains Engle-Granger in the 3-layer format (drunk person + dog analogy → two-step procedure → actual test values).

**Step 5 — The Spread** (T02, ~390 lines): Introduces the first parameter slider, proving R003's core pattern. A rolling window slider (10-200, step 5) drives client-side `computeRollingStats()` — a pure function computing rolling mean and std. The spread chart renders ±1σ/2σ/3σ bands as fill pairs with increasing opacity, plus rolling mean (dashed) and raw spread (solid). A histogram shows spread distribution with mean line. The half-life Badge shows mean-reversion speed (teal if healthy, orange otherwise). Chart titles dynamically include `(window=N)`. No API calls fire when the slider moves — computation is fully local.

**Step 6 — Z-Score & Signals** (T03, ~500 lines): The culmination with 3 coordinated sliders and a signal state machine. Entry (1.0-3.0), Exit (0.0-1.5), and Stop Loss (2.0-5.0) sliders feed a shared `useMemo` that recomputes z-score and regenerates signals on every change. The `generateSignals()` function implements the exact state machine from the Dash `_generate_signals()`: flat → long/short entry (z crosses threshold) → exit (returns to mean) or stop-loss (too extreme). The z-score chart shows colored threshold zones (hrect), horizontal lines with right-side annotations, and signal markers batched by type (green triangle-up for long entry, red triangle-down for short, yellow circle for exit, orange X for stop-loss). A Signal Summary panel shows 4 colored counts that update reactively. The EducationalPanel uses a thermostat analogy for Intuition.

All three components were wired into `page.tsx` via the established switch-case dispatch pattern. The "Steps 4-6 coming in S04" placeholder was removed — the default case now returns null since all 6 cases are handled.

## Verification

**Build verification:**
- `npx tsc --noEmit` — zero TypeScript errors ✅
- `npm run build` — exits 0, all routes generated (/, /_not-found, /academy, /deep-dive, /glossary, /scanner) ✅

**Step 4 runtime verification (from T01):**
- Academy → BTC/ETH → Step 4: ADF number line with diamond at -4.080 in green zone ✅
- Regression scatter with OLS line (BTC = 20.64 × ETH + 23143) ✅
- Hedge ratio badge shows β = 20.6358 ✅
- Pass/fail alert: green "✓ PASS: BTC × ETH are cointegrated" with p = 0.0055 ✅
- All 3 educational panel layers populated ✅

**Step 5 runtime verification (from T02):**
- Academy → Step 5: spread chart with σ bands, histogram with mean line ✅
- Slider moved from 60 to 105 → chart title updated, bands visually changed ✅
- Browser Network tab: zero fetch/XHR after slider change ✅
- Half-life badge renders with correct color coding ✅
- X-axis dates correct (Dec 2025 → Mar 2026) ✅

**Step 6 runtime verification (from T03):**
- Academy → Step 6: z-score chart with threshold zones, signal markers ✅
- Entry slider moved from ±2.0σ to ±1.5σ → zones shifted, annotations updated, signal count changed (69 → 86 trades) ✅
- Browser Network tab: zero fetch/XHR after slider change ✅
- Signal Summary panel shows 4 colored counts updating reactively ✅

**Full Academy flow:**
- All 6 steps navigate and render correctly when clicked in sequence ✅
- Steps 4-6 without pair selected show "No pair selected" info alert ✅
- Educational panels on all steps have 3 populated layers ✅

## Requirements Advanced

- R001 — All 6 Academy steps now work end-to-end with real pair data. Steps 1-3 (S03) + steps 4-6 (S04) = complete teaching flow.
- R002 — Steps 4-6 each have EducationalPanel with all 3 layers (Intuition, How It Works, Your Pair) populated with real pair-specific content.
- R003 — Step 5 has a rolling window slider and Step 6 has 3 parameter sliders. All update charts in real-time with zero API calls (client-side computation).
- R004 — Three more complex interactive components built successfully in Next.js/React. Slider reactivity is demonstrably smoother than Dash callbacks.
- R022 — Steps 4-6 make formulas, test results, and signal generation logic fully visible: ADF test interpretation, Engle-Granger procedure, spread formula, z-score formula, trading rules with exact thresholds.

## Requirements Validated

- R001 — All 6 Academy steps proven working with real pair data (BTC/ETH verified). Complete teaching flow: pair selection → price comparison → correlation vs cointegration → cointegration test → spread → z-score & signals.
- R002 — All 6 Academy steps have 3-layer EducationalPanel (Intuition, How It Works, Your Pair) with populated content. Accordion expand/collapse works on all steps.
- R003 — Step 5 rolling window slider and Step 6 entry/exit/stop sliders all update charts in real-time. Zero API calls on slider interaction. Chart zones, markers, and summary counts all respond instantly.

## New Requirements Surfaced

- none

## Requirements Invalidated or Re-scoped

- none

## Deviations

- Used `text+markers` instead of `markers+text` for Plotly scatter mode — `@types/plotly.js` union type constraint. Both equivalent at runtime.
- Used `as Data` cast for histogram trace to bypass missing `nbinsx` in Plotly TypeScript types (runtime property exists but types omit it).
- Batched signal markers by type into single scatter traces instead of one trace per signal as in Dash code — same visual result, more efficient rendering.
- Default switch case returns `null` instead of placeholder text — all 6 cases are now handled.

## Known Limitations

- PlotlyChart wrapper only applies dark theme to xaxis/yaxis — multi-axis layouts (xaxis2/yaxis2) require manual dark theme styling in each step component.
- Half-life badge shows "N/A" for some pairs where the Ornstein-Uhlenbeck estimate is infinite or very large (>100). This is correct behavior but could confuse users without explanation.
- Signal state machine uses a fixed z-score window of 60 — not exposed as a user-adjustable parameter in step 6 (entry/exit/stop are adjustable, but the underlying z-score computation window is not).

## Follow-ups

- none — all planned work complete. S06 will handle cross-links from educational panels to glossary and final polish.

## Files Created/Modified

- `frontend/components/academy/StepCointegrationTest.tsx` — new ~400-line component: ADF number line chart, regression scatter, hedge ratio card, traffic light alert, educational panel
- `frontend/components/academy/StepSpread.tsx` — new ~390-line component: rolling computation, spread chart with σ bands, histogram, slider, half-life badge, educational panel
- `frontend/components/academy/StepZScoreSignals.tsx` — new ~500-line component: z-score computation, signal state machine, z-score chart with threshold zones/markers, 3 parameter sliders, signal summary panel, educational panel
- `frontend/app/(dashboard)/academy/page.tsx` — added 3 imports + 3 switch cases (cases 3-5) for steps 4-6, removed placeholder text

## Forward Intelligence

### What the next slice should know
- The Academy is complete. All 6 steps render with real data, sliders work, educational panels are populated. S05 (Scanner + Deep Dive) is independent of Academy work. S06 (Glossary + Polish) needs to add cross-links from EducationalPanel content to glossary terms — the link targets are plain text strings in the panel content that will need to become `<a>` or `<Link>` elements.
- The `generateSignals()` function in `StepZScoreSignals.tsx` is a direct port of Dash's `_generate_signals()` and is intentionally written as a pure function. When building the strategy module (M002), extract and reuse this logic rather than reimplementing.

### What's fragile
- Plotly TypeScript types are incomplete (`nbinsx`, `markers+text`) — workarounds are documented in KNOWLEDGE.md but new chart features may hit similar gaps. Cast to `as Data` when needed.
- The σ band rendering uses `fill: 'tonexty'` which requires traces in a specific order (upper before lower for each σ level). Reordering traces breaks the fill rendering.

### Authoritative diagnostics
- `.js-plotly-plot` element count per step confirms chart rendering (step 4: 2, step 5: 2, step 6: 1)
- Signal Summary panel numbers are the most reliable indicator that the signal state machine is working — they change when sliders move and reflect the exact trade count
- Browser Network tab (fetch-xhr filter) after slider interaction is the definitive proof that computation is client-side

### What assumptions changed
- Original assumption: step components would be ~350 lines each → actual: 390-500 lines due to comprehensive educational content and chart annotations. Not a problem, but component sizes are larger than estimated.
- The signal state machine produces many trades for volatile pairs (86+ for BTC/ETH at ±1.5σ) — this is correct behavior but the signal summary could benefit from a qualitative assessment (e.g., "too many trades may indicate noisy signals").
