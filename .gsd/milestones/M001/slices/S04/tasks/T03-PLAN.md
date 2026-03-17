---
estimated_steps: 6
estimated_files: 2
---

# T03: Build StepZScoreSignals component with 3 parameter sliders, signal state machine, and wire step 6 into Academy

**Slice:** S04 — Academy Steps 4-6 (Cointegration → Z-Score & Signals)
**Milestone:** M001

## Description

Build the Step 6 (Z-Score & Signals) component — the most complex Academy step and the culmination of the learning flow. It has 3 parameter sliders (entry, exit, stop-loss thresholds), client-side z-score computation, a signal generation state machine, and a z-score chart with threshold zones and signal markers. This completes R003 (real-time parameter sliders) and the full 6-step Academy flow (R001). After this task, all 6 Academy steps work end-to-end.

**Relevant skills:** `frontend-design` (for component structure and styling patterns).

## Steps

1. **Create `frontend/components/academy/StepZScoreSignals.tsx`** — a `'use client'` component. Define props interface:
   ```typescript
   interface StepZScoreSignalsProps {
     cointegrationData: CointegrationResponse | null;
     loading: boolean;
     asset1: string;
     asset2: string;
   }
   ```
   Import from `@/lib/api`: `CointegrationResponse`. Import from `plotly.js`: `Data`, `Layout`, `Shape`, `Annotations`. Import Mantine: `Alert`, `Badge`, `Group`, `Paper`, `SimpleGrid`, `Skeleton`, `Slider`, `Stack`, `Text`, `Title`, `Code`. Import `PlotlyChart`, `EducationalPanel`, `IconAdjustments`, `IconInfoCircle`.

2. **Implement the client-side z-score computation** as a pure function:
   ```typescript
   function computeZScore(
     spread: (number | null)[],
     window: number
   ): (number | null)[]
   ```
   For each index `i >= window`, compute rolling mean and std of `spread[i-window:i]` (skip nulls), then `zscore[i] = (spread[i] - rollingMean) / rollingStd`. For `i < window` or when std ≈ 0, output null. This function can reuse the rolling computation pattern from T02 (or inline it — the component is self-contained).

3. **Implement the signal generation state machine** — port exactly from Dash `_generate_signals()`:
   ```typescript
   interface Signal {
     index: number;
     type: 'long_entry' | 'short_entry' | 'long_exit' | 'short_exit' | 'stop_loss';
     zscore: number;
   }
   interface SignalSummary {
     signals: Signal[];
     totalTrades: number;
     longEntries: number;
     shortEntries: number;
     exits: number;
     stopLosses: number;
   }
   function generateSignals(
     zscore: (number | null)[],
     entry: number,
     exitThreshold: number,
     stop: number
   ): SignalSummary
   ```
   State machine: `position = 0` (flat). If flat: `z <= -entry` → long_entry (position=1), `z >= entry` → short_entry (position=-1). If long (1): `z >= -exitThreshold` → long_exit (position=0), `z <= -stop` → stop_loss (position=0). If short (-1): `z <= exitThreshold` → short_exit (position=0), `z >= stop` → stop_loss (position=0). Skip null z-scores.
   **Critical**: get the sign conventions right — long entry is when z is very negative (spread is tight, expect widening), short entry when z is very positive.

4. **Build the z-score chart with threshold zones and signal markers** — a `useMemo` block depending on `[cointegrationData, entryThreshold, exitThreshold, stopThreshold]`:
   - Compute z-score from spread using `computeZScore` (use a lookback window of 60 — same as the API default, or reuse cointegrationData.zscore directly for the initial render, but recompute when user changes are needed; for simplicity, always compute client-side so all slider controls are consistent).
   - Convert timestamps to ISO strings.
   - **Threshold zones** — Use `shapes` array for hrect zones (Plotly shapes with type `'rect'`, xref `'paper'`, x0=0, x1=1, yref `'y'`):
     - Entry-to-stop zone (positive): `y0=entry, y1=stop`, fillcolor `rgba(255,107,107,0.08)`
     - Entry-to-stop zone (negative): `y0=-stop, y1=-entry`, fillcolor `rgba(81,207,102,0.08)`
     - Exit zone (center): `y0=-exit, y1=exit`, fillcolor `rgba(252,196,25,0.06)`
   - **Threshold lines** — Use `shapes` for horizontal lines at ±entry (dashed), ±exit (dotted), ±stop (solid), zero (faint white). Add `annotations` for labels on the right side.
   - **Z-score line trace**: `mode: 'lines'`, color `#339AF0`, width 1.5.
   - **Signal markers**: For each signal, add a scatter trace with a single point. Marker colors: long_entry=`#51CF66`, short_entry=`#FF6B6B`, long_exit/short_exit=`#FCC419`, stop_loss=`#FF922B`. Symbols: long_entry=`triangle-up`, short_entry=`triangle-down`, exits=`circle`, stop_loss=`x`. Size 10, white border. `showlegend: false`.
   - Layout: height 420, hovermode `'x unified'`, title "Z-Score with Trading Signals".

5. **Build the signal summary panel and 3 sliders**:
   - **Three sliders** in a `SimpleGrid` with `cols={{ base: 1, sm: 3 }}`:
     - Entry: `Slider` value={entry}, onChange={setEntry}, min=1.0, max=3.0, step=0.1, color="red", marks at 1.5/2.0/2.5. Label: `Entry: ±{entry.toFixed(1)}σ`
     - Exit: min=0.0, max=1.5, step=0.1, color="yellow", marks at 0.0/0.5/1.0. Label: `Exit: ±{exit.toFixed(1)}σ`
     - Stop: min=2.0, max=5.0, step=0.1, color="orange", marks at 2.5/3.0/4.0. Label: `Stop Loss: ±{stop.toFixed(1)}σ`
   - All 3 values stored as `useState` local to the component (defaults: entry=2.0, exit=0.5, stop=3.0).
   - **Signal summary panel**: `Paper` with `SimpleGrid cols={{ base: 2, sm: 4 }}` showing: Total Trades (blue), Long Entries (green), Short Entries (red), Stop Losses (orange). Each cell is a Stack with large number + small label. Below: text summarizing the threshold settings and trade count.

6. **Assemble the component and wire into page.tsx**:
   - **No-pair / loading states** same as T01/T02.
   - **StepHeader**: Group with IconAdjustments + Title "Z-Score & Signals" + description.
   - Order: sliders → z-score chart → descriptive text (explain what triangle/circle/x markers mean) → signal summary → EducationalPanel.
   - **EducationalPanel** — port from Dash learn.py:
     - 💡 Intuition: thermostat analogy — z-score is like a temperature reading, entry threshold = "too hot", exit = "back to normal", stop = "something is broken"
     - 🔧 How It Works: z-score formula `z = (spread − rolling_mean) / rolling_std`. Trading rules (z < −entry → long, z > +entry → short, |z| < exit → close, |z| > stop → stop loss). Trade-off explanation. Include Code block.
     - 📊 Your Pair: actual trade count with current thresholds, frequency assessment (too few/reasonable/too many), slider exploration encouragement.
   - **Wire into page.tsx** — Add import for `StepZScoreSignals`, add `case 5:`:
     ```typescript
     case 5:
       return (
         <StepZScoreSignals
           cointegrationData={cointData}
           loading={cointLoading}
           asset1={asset1}
           asset2={asset2}
         />
       );
     ```
   - **Remove the default placeholder** text that says "Steps 4–6 coming in S04" — all cases 0-5 are now handled. The default case can remain for safety but should be unreachable.
   - Run `cd frontend && npm run build` to verify ALL steps are SSR-safe.

## Must-Haves

- [ ] Three parameter sliders (entry, exit, stop-loss) each update z-score chart and signal summary in real-time
- [ ] Z-score chart shows colored threshold zones (hrect shapes) that move when sliders change
- [ ] Signal markers appear on z-score chart at correct positions with correct symbols (triangles for entry, circles for exit, x for stop-loss)
- [ ] Signal generation state machine produces correct trades (matching Dash `_generate_signals()` behavior — long entry when z very negative, short when very positive)
- [ ] Signal summary panel shows total trades, long entries, short entries, stop losses with counts
- [ ] EducationalPanel with all 3 layers populated
- [ ] All slider state local to component — no page-level state changes on slider move
- [ ] `npm run build` exits 0 with all 6 Academy steps wired
- [ ] The "Steps 4–6 coming in S04" placeholder text is removed from the default switch case

## Verification

- `cd frontend && npx tsc --noEmit` — zero TypeScript errors
- `cd frontend && npm run build` — exits 0
- Runtime: navigate to Academy → select pair → step 6 → z-score chart with threshold zones and signal markers visible
- Runtime: move entry slider → zone boundaries shift, signal markers change positions/count, summary panel updates
- Runtime: steps 1-6 all navigate and render correctly — the full Academy flow works end-to-end
- Runtime: no API calls in Network tab when moving any slider

## Inputs

- `frontend/app/(dashboard)/academy/page.tsx` — Academy page. After T01+T02, steps 0-4 (cases 0-4) are wired. Step 6 = switch case 5.
- `frontend/components/academy/EducationalPanel.tsx` — 3-layer accordion.
- `frontend/components/charts/PlotlyChart.tsx` — Plotly wrapper.
- `frontend/lib/api.ts` — `CointegrationResponse` type. Fields needed: `spread: (number | null)[]`, `zscore: (number | null)[]`, `timestamps: number[]`, `is_cointegrated`, `hedge_ratio`.
- **T01 and T02 outputs**: Steps 4 and 5 wired. T02 established the slider + client-side computation pattern.
- **Dash reference**: `src/statistical_arbitrage/app/pages/learn.py` — `_generate_signals()` (signal state machine, ~lines 1340-1385), `_build_zscore_chart()` (chart with zones/markers, ~lines 1387-1440), `_build_signal_summary()` (summary panel, ~lines 1443-1490), `_step_zscore_signals()` (full step assembly, ~lines 1493-1620). Port the signal logic exactly and educational text.

**Key constraints:**
- Signal state machine sign conventions: long_entry when `z <= -entry` (spread is tight), short_entry when `z >= +entry` (spread is wide). Long exit when `z >= -exitThreshold` (back toward mean from below). Short exit when `z <= +exitThreshold`. Get these signs right.
- Plotly hrect zones: use `shapes` array with `type: 'rect'`, `xref: 'paper'`, `x0: 0`, `x1: 1`, `yref: 'y'`, `y0/y1` for threshold values. NOT `add_hrect` (Python API only).
- Plotly hline annotations: use `annotations` array with `xref: 'paper'`, `x: 1.02`, `yref: 'y'`, `y: threshold_value` for right-side labels.
- Each signal marker is its own scatter trace with a single point — this is how the Dash code does it. Alternatively, batch all markers of the same type into one trace for efficiency.
- `useMemo` dependency array must include all 3 threshold states + cointegrationData.
- For the z-score computation: reuse spread from `cointegrationData.spread` and compute z-score client-side with window=60 (matching API default). This keeps all chart updates local.

## Expected Output

- `frontend/components/academy/StepZScoreSignals.tsx` — new ~500-line component with z-score computation, signal state machine, z-score chart with threshold zones and markers, 3 sliders, signal summary panel, educational panel
- `frontend/app/(dashboard)/academy/page.tsx` — modified with 1 new import + 1 new switch case (case 5), default placeholder text removed or updated

## Observability Impact

- **Inspection surface**: `.js-plotly-plot` CSS selector count on step 6 = 1 (z-score chart). Signal Summary panel shows 4 numeric counts (Total Trades, Long Entries, Short Entries, Stop Losses) — verify they change when sliders move.
- **Chart annotations**: Right-side labels show current threshold values (e.g. "Entry (+2.0)", "Stop (−3.0)") — these shift when sliders change, confirming reactivity.
- **Signal marker verification**: Plotly traces include signal markers batched by type. Visible as colored triangles (entry), circles (exit), and X's (stop-loss) on the chart.
- **No new API calls**: Step 6 reuses `cointegrationData.spread` from the existing fetch. All z-score computation and signal generation is client-side. Browser Network tab should show zero fetch/XHR requests after any slider interaction.
- **Failure visibility**: If StepZScoreSignals fails to render, the switch case falls through to `default: return null` — the step area will be blank (no content rendered). If z-score computation produces all nulls, the chart renders with no data points and no signal markers.
- **Educational panel**: 3-layer accordion (Intuition, How It Works, Your Pair) — all sections populated. Your Pair section dynamically reflects current trade count and threshold values.
