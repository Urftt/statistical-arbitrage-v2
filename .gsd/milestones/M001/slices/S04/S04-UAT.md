# S04: Academy Steps 4-6 (Cointegration → Z-Score & Signals) — UAT

**Milestone:** M001
**Written:** 2026-03-17

## UAT Type

- UAT mode: live-runtime
- Why this mode is sufficient: Steps 4-6 involve interactive charts, parameter sliders, and real-time signal generation that can only be verified by running the full stack (FastAPI backend + Next.js frontend) and interacting with the UI.

## Preconditions

1. FastAPI backend running on `http://localhost:8000` — start with `cd /Users/luckleineschaars/repos/statistical-arbitrage-v2 && source .venv/bin/activate && python run_api.py` (or equivalent)
2. Next.js frontend running on `http://localhost:3000` — start with `cd frontend && npm run dev`
3. Parquet cache data available for at least BTC-EUR and ETH-EUR at 1h timeframe (pre-existing from data pipeline)
4. API health check passes: `curl http://localhost:8000/api/health` returns 200

## Smoke Test

Open `http://localhost:3000/academy`, select BTC and ETH from the pair selector, click step 6 ("Z-Score & Signals"). A z-score chart with colored zones and signal markers should appear. Move the entry slider — the chart should update instantly.

## Test Cases

### 1. Step 4 — Cointegration Test Results Display

1. Navigate to `http://localhost:3000/academy`
2. Select BTC and ETH as the pair (Step 1 pair cards or global selector)
3. Click the 4th stepper button ("Cointegration Test")
4. **Expected:** Two charts render:
   - ADF number line with a diamond marker at the test statistic position, 4 colored zones (reject at 1%/5%/10%, fail to reject), and vertical lines at critical values
   - Regression scatter plot with data points and an OLS regression line
5. **Expected:** A traffic-light Alert shows either green "✓ PASS" or orange "✗ FAIL" with a p-value Badge
6. **Expected:** A hedge ratio card shows "β = {number}" with a violet Badge
7. **Expected:** Educational panel is present with 3 expandable sections: 💡 Intuition, 🔧 How It Works, 📊 Your Pair

### 2. Step 4 — Educational Panel Content

1. On step 4, click the "💡 Intuition" accordion section
2. **Expected:** Analogy about a drunk person and their dog (cointegration metaphor)
3. Click "🔧 How It Works"
4. **Expected:** Engle-Granger two-step procedure explanation with formulas in a Code block
5. Click "📊 Your Pair"
6. **Expected:** Content references the actual pair (BTC and ETH), shows the actual test statistic, p-value, and interpretation

### 3. Step 5 — Spread Chart with σ Bands

1. Click the 5th stepper button ("The Spread")
2. **Expected:** A spread chart renders with:
   - Blue line (raw spread)
   - Yellow dashed line (rolling mean)
   - 3 pairs of shaded bands (±1σ, ±2σ, ±3σ) with increasing opacity
   - Title includes `(window=60)` (default window)
3. **Expected:** A spread histogram with mean line renders below or beside the spread chart
4. **Expected:** A half-life Badge appears (teal if finite & < 100, orange otherwise)

### 4. Step 5 — Rolling Window Slider Updates Chart

1. On step 5, locate the rolling window slider (default: 60)
2. Move the slider to 120
3. **Expected:** The spread chart title changes to `(window=120)`, the σ bands visually shift (wider bands with larger window)
4. **Expected:** No network requests appear in browser DevTools Network tab (filter: Fetch/XHR)
5. Move the slider to 20
6. **Expected:** Bands become tighter/noisier, chart title shows `(window=20)`
7. **Expected:** Still no network requests — all computation is client-side

### 5. Step 6 — Z-Score Chart with Threshold Zones

1. Click the 6th stepper button ("Z-Score & Signals")
2. **Expected:** A z-score chart renders with:
   - Blue z-score line oscillating around 0
   - Colored horizontal zones (red for short territory above entry, green for long territory below -entry, yellow for exit zone)
   - Horizontal threshold lines with right-side annotations showing values (e.g., "Entry (+2.0)", "Exit (+0.5)", "Stop (+3.0)")
   - Signal markers: green triangles (long entry), red triangles (short entry), yellow circles (exits), orange X's (stop-loss)
3. **Expected:** A Signal Summary panel below shows 4 colored numbers: Total Trades, Long Entries, Short Entries, Stop Losses

### 6. Step 6 — Three Parameter Sliders Update Chart

1. On step 6, locate the three sliders: Entry (default ±2.0), Exit (default ±0.5), Stop Loss (default ±3.0)
2. Move the Entry slider from 2.0 to 1.5
3. **Expected:** Chart threshold zones widen (more signals in the chart), right-side annotations update to show "Entry (+1.5)", signal markers increase in number, Signal Summary counts change (more total trades)
4. Open browser DevTools → Network tab → filter Fetch/XHR
5. **Expected:** Zero network requests after slider move
6. Move the Exit slider from 0.5 to 1.0
7. **Expected:** Exit zone narrows, some exit signals may shift, Signal Summary updates
8. Move the Stop Loss slider from 3.0 to 2.5
9. **Expected:** Stop-loss lines move closer to center, potential stop-loss markers appear/change, Signal Summary "Stop Losses" count may change

### 7. Step 6 — Signal Summary Accuracy

1. On step 6 with BTC/ETH, set Entry = 2.0, Exit = 0.5, Stop = 3.0 (defaults)
2. Note the Total Trades count
3. Change Entry to 1.5
4. **Expected:** Total Trades increases (lower threshold = more signals triggered)
5. Change Entry to 2.5
6. **Expected:** Total Trades decreases (higher threshold = fewer signals triggered)
7. **Expected:** Long Entries + Short Entries + Stop Losses ≤ Total Trades (logical consistency)

### 8. Full Academy Flow — All 6 Steps Navigate Correctly

1. Start on step 1 (Pair Selection)
2. Select BTC and ETH
3. Click through each step sequentially: steps 2 → 3 → 4 → 5 → 6
4. **Expected:** Each step renders content appropriate to that step — no blank screens, no errors
5. Click step 1 again (go back)
6. **Expected:** Pair selection still shows the selected pair
7. Click step 6 directly (skip ahead)
8. **Expected:** Z-score chart renders with data (no need to visit steps in order)

### 9. Step 6 — Educational Panel with Dynamic Content

1. On step 6, expand the "📊 Your Pair" section of the educational panel
2. **Expected:** Content includes the actual number of trades detected (matching Signal Summary count)
3. **Expected:** Content references the specific pair (BTC and ETH)
4. Change the entry slider
5. Collapse and re-expand "📊 Your Pair"
6. **Expected:** Trade count in the panel reflects the updated slider value

## Edge Cases

### No Pair Selected

1. Navigate to `/academy` with no pair selected in the global selector
2. Click steps 4, 5, or 6
3. **Expected:** Each shows a yellow "No pair selected" info alert instead of charts

### Extreme Slider Values

1. On step 5, move rolling window slider to minimum (10)
2. **Expected:** Chart renders (very noisy bands but no crash)
3. Move to maximum (200)
4. **Expected:** Chart renders (very smooth bands, more null/NaN values at start but no crash)

### Step 6 Extreme Thresholds

1. On step 6, set Entry to 1.0 (minimum)
2. **Expected:** Many signals generated, chart still renders correctly, Signal Summary shows high counts
3. Set Entry to 3.0 (maximum)
4. **Expected:** Few or no signals, chart shows wide empty zones

### Quick Slider Scrubbing

1. On step 5 or 6, rapidly drag a slider back and forth
2. **Expected:** Chart updates follow the slider without freezing, crashing, or accumulating lag

## Failure Signals

- Blank chart area where Plotly chart should render — component failed to mount or data is missing
- "window is not defined" error in console — SSR issue with Plotly (should not happen if dynamic import is correct)
- Network requests appearing in DevTools after slider interaction — computation should be fully client-side
- Signal Summary showing all zeros when data is clearly loaded — signal state machine not receiving data
- Chart zones not shifting when sliders move — useMemo dependency array may be wrong
- Educational panel sections empty when expanded — content strings missing or panel not receiving props
- Year "57000+" appearing in chart x-axis dates — timestamp conversion using `* 1000` instead of direct `new Date(ts)`
- TypeScript errors in terminal during `npm run dev` — component type issues

## Requirements Proved By This UAT

- R001 — Full 6-step Academy flow with real pair data (test cases 1-8)
- R002 — 3-layer educational panels on steps 4-6 (test cases 2, 9)
- R003 — Real-time parameter sliders updating charts without API calls (test cases 4, 6, 7)
- R022 — Formulas, test results, and signal logic visible and explained (test cases 2, 9)

## Not Proven By This UAT

- R004 (full Dash replacement) — requires all pages working, not just Academy. Validated at M001 completion.
- Cross-links from educational panels to glossary — S06 work.
- Performance benchmarks (render time < 500ms) — not measured in this UAT, only qualitative smoothness assessed.
- Multi-pair verification — tests use BTC/ETH only. Other pairs should work identically but are not explicitly tested.

## Notes for Tester

- The half-life badge may show "N/A" (orange) for some pairs — this is correct when the Ornstein-Uhlenbeck estimate is infinite.
- BTC/ETH at ±2.0σ typically generates ~69 trades; at ±1.5σ ~86 trades. These counts confirm the signal engine is working.
- The σ band visual difference between window=60 and window=120 is subtle — watch the chart title `(window=N)` as the primary confirmation that the slider is working.
- Step 6's z-score is computed client-side with window=60 (hardcoded) — only the entry/exit/stop thresholds are adjustable via sliders.
