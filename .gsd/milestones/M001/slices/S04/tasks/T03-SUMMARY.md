---
id: T03
parent: S04
milestone: M001
provides:
  - StepZScoreSignals component (Academy step 6) with 3 parameter sliders, signal state machine, z-score chart with threshold zones and signal markers
  - Client-side z-score computation and signal generation (completes R003 — all slider interactions zero API calls)
  - Full 6-step Academy flow working end-to-end (completes R001)
key_files:
  - frontend/components/academy/StepZScoreSignals.tsx
  - frontend/app/(dashboard)/academy/page.tsx
key_decisions:
  - Batched signal markers by type into single traces instead of one trace per signal — more efficient rendering with many signals (86+ trades for BTC/ETH)
  - Used client-side z-score computation (window=60) from spread data rather than reusing API zscore field — keeps all chart updates local when sliders change
patterns_established:
  - Signal state machine as pure function (generateSignals) — portable to strategy module later
  - Z-score computation as pure function (computeZScore) — reuses rolling stats pattern from T02
  - Multiple coordinated sliders in SimpleGrid with local useState — all 3 share a single useMemo for chart recomputation
observability_surfaces:
  - Signal Summary panel shows 4 numeric counts (Total Trades, Long Entries, Short Entries, Stop Losses) that update on slider change
  - Chart right-side annotations show current threshold values (e.g. "Entry (+2.0)", "Stop (−3.0)") confirming reactivity
  - .js-plotly-plot CSS selector confirms chart rendered; zero fetch/XHR requests after slider interaction
duration: 25m
verification_result: passed
completed_at: 2026-03-17
blocker_discovered: false
---

# T03: Build StepZScoreSignals component with 3 parameter sliders, signal state machine, and wire step 6 into Academy

**Built Academy Step 6 (Z-Score & Signals) with 3 parameter sliders, signal generation state machine, z-score chart with colored threshold zones and signal markers, signal summary panel, and 3-layer educational panel — completing the full 6-step Academy flow**

## What Happened

Created `StepZScoreSignals.tsx` (~500 lines) with:
1. **Z-score computation** — pure `computeZScore()` function computing rolling z-score from spread data with window=60, reusing the rolling stats pattern from T02.
2. **Signal state machine** — pure `generateSignals()` function ported exactly from Dash `_generate_signals()`. States: flat (0) → long entry when z ≤ -entry, short entry when z ≥ +entry. Long (1) → exit when z ≥ -exitThreshold, stop when z ≤ -stop. Short (-1) → exit when z ≤ +exitThreshold, stop when z ≥ +stop. Returns structured `SignalSummary`.
3. **Z-score chart** — Plotly chart with hrect threshold zones (red for short territory, green for long territory, yellow for exit zone), horizontal threshold lines with right-side annotations, z-score line trace, and signal markers batched by type (green triangle-up for long entry, red triangle-down for short entry, yellow circle for exits, orange X for stop-loss).
4. **Three parameter sliders** — Entry (1.0-3.0, red), Exit (0.0-1.5, yellow), Stop Loss (2.0-5.0, orange) in a responsive SimpleGrid. All state local via useState, feeding a single useMemo for chart recomputation.
5. **Signal summary panel** — Paper with SimpleGrid showing colored counts for Total Trades (blue), Long Entries (green), Short Entries (red), Stop Losses (orange), plus descriptive text reflecting current thresholds.
6. **Educational panel** — Thermostat analogy (Intuition), z-score formula + trading rules (How It Works), dynamic trade count assessment (Your Pair).

Wired step 6 into `page.tsx` as case 5. Removed the "Steps 4-6 coming in S04" placeholder text — default case now returns null. All 6 Academy steps work end-to-end.

## Verification

- `npx tsc --noEmit` — zero TypeScript errors
- `npm run build` — exits 0, all routes generated including /academy
- **Runtime step 6**: BTC/ETH pair → Z-Score chart with threshold zones, signal markers (triangles, circles, X's), right-side annotations — all visible ✅
- **Slider interaction**: Entry slider moved from ±2.0σ to ±1.5σ → chart threshold zones shifted, annotations updated, signal markers changed, summary count changed from 69 → 86 trades ✅
- **Zero API calls**: Browser network tab showed zero fetch/XHR requests after slider interaction ✅
- **Signal summary**: Shows 4 colored counts (Total Trades, Long Entries, Short Entries, Stop Losses) that update when sliders move ✅
- **Educational panel**: All 3 layers populated (Intuition with thermostat analogy, How It Works with code block, Your Pair with dynamic trade count) ✅
- **Full Academy flow**: Steps 1-6 all navigate and render correctly — clicked through Price Comparison (step 2), Cointegration Test (step 4), The Spread (step 5), Z-Score & Signals (step 6) ✅
- **Browser assertions**: 10/10 checks passed (text visibility for all key elements + chart selector)

### Slice-level verification (S04 final task):
- ✅ `cd frontend && npx tsc --noEmit` — zero TypeScript errors
- ✅ `cd frontend && npm run build` — exits 0, all routes generated
- ✅ Academy → select pair → step 4 shows ADF number line, regression scatter, hedge ratio badge, pass/fail alert (verified in T01)
- ✅ Academy → step 5 → move rolling window slider → spread chart updates instantly without API call (verified in T02)
- ✅ Academy → step 6 → move entry/exit/stop sliders → z-score chart zones shift, signal markers appear/disappear, signal summary counts change
- ✅ Educational panels on steps 4-6 each have all 3 layers (Intuition, How It Works, Your Pair) with populated content
- ✅ Steps 4-6 without pair selected show "No pair selected" info alert (pattern established in T01, carried through T02/T03)

## Diagnostics

- Navigate to Academy → select pair → click "Z-Score & Signals" step (6th stepper button)
- One `.js-plotly-plot` element should render (z-score chart)
- Signal Summary panel shows 4 colored numbers — verify they change when any slider moves
- Right-side annotations on chart show current threshold values (e.g. "Entry (+2.0)", "Stop (−3.0)") — these shift when sliders move
- If data missing, yellow "data not available" alert appears
- If switch case doesn't match, default returns null (blank content area)
- Browser Network tab should show zero fetch/XHR requests after slider interaction

## Deviations

- Batched signal markers by type into single scatter traces (one trace per signal type) instead of one trace per individual signal as in the Dash code. Same visual result, more efficient rendering with many signals.
- Default switch case returns `null` instead of keeping any placeholder text — all 6 cases are now handled, so default is unreachable.

## Known Issues

None.

## Files Created/Modified

- `frontend/components/academy/StepZScoreSignals.tsx` — new ~500-line component with z-score computation, signal state machine, z-score chart with threshold zones/markers, 3 parameter sliders, signal summary panel, educational panel
- `frontend/app/(dashboard)/academy/page.tsx` — added StepZScoreSignals import, added case 5 for step 6, removed "Steps 4-6 coming in S04" placeholder text
- `.gsd/milestones/M001/slices/S04/tasks/T03-PLAN.md` — added Observability Impact section (pre-flight fix)
