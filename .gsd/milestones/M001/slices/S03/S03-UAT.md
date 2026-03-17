# S03: Academy Step Engine + First 3 Steps — UAT

**Milestone:** M001
**Written:** 2026-03-17

## UAT Type

- UAT mode: mixed (artifact-driven build check + live-runtime visual verification)
- Why this mode is sufficient: Build passes confirm SSR safety and type correctness. Runtime spot-checks confirm real data flows through API→frontend→Plotly pipeline. No complex user workflows or edge-case interactions to exercise.

## Preconditions

1. FastAPI backend running: `cd /Users/luckleineschaars/repos/statistical-arbitrage-v2 && uv run python run_api.py` (port 8000)
2. Next.js dev server running: `cd frontend && npm run dev` (port 3000)
3. Parquet cache populated with at least BTC-EUR and ETH-EUR at 1h timeframe (existing data)
4. Browser open to http://localhost:3000

## Smoke Test

Navigate to http://localhost:3000/academy → stepper with 6 labeled steps visible → step 1 shows 3 pair cards and educational content → click BTC×ETH card → header selects update → click step 2 → price chart renders with correlation badge.

## Test Cases

### 1. Academy Stepper Navigation

1. Navigate to http://localhost:3000/academy
2. Verify stepper shows 6 labeled steps: "Select Pair", "Price Comparison", "Corr. vs Coint.", "Cointegration Test", "Spread Analysis", "Z-Score & Signals"
3. Click step 3 ("Corr. vs Coint.") directly
4. **Expected:** Step 3 content renders (concept chart visible). Stepper highlights step 3 as active.
5. Click step 1 ("Select Pair")
6. **Expected:** Step 1 content renders. Free navigation works — no "complete previous step" gate.

### 2. Step 1 — Pair Selector Content

1. Navigate to /academy (step 1 active by default)
2. **Expected:** 3 curated pair cards visible: BTC×ETH (green "Cointegrated"), SOL×AVAX (blue "Try it"), BTC×DOGE (orange "Likely fails")
3. Below cards: timeframe guidance grid showing 15m / 1h (recommended) / 4h (recommended) / 1d
4. Below grid: learning roadmap with 4 items
5. Below roadmap: EducationalPanel with 💡 Intuition expanded by default
6. Click 🔧 How It Works
7. **Expected:** Mechanics section expands. Intuition stays expanded (multiple mode).
8. Click 📊 Your Pair
9. **Expected:** Your Pair section expands alongside the others.

### 3. Pair Card → PairContext Integration

1. On step 1, click the "BTC × ETH" pair card
2. **Expected:** Header asset1 select shows "BTC-EUR", asset2 select shows "ETH-EUR"
3. Open browser Network tab, verify POST to /api/analysis/cointegration and 2× GET /api/pairs/{symbol}/ohlcv requests fired
4. Click the "SOL × AVAX" pair card
5. **Expected:** Header selects update to "SOL-EUR" and "AVAX-EUR". New API requests fire.

### 4. Step 2 — No Pair Selected State

1. Navigate to /academy fresh (clear any previously selected pair by refreshing)
2. Click step 2 ("Price Comparison")
3. **Expected:** "No pair selected" info Alert visible. No chart rendered. No console errors.

### 5. Step 2 — Price Chart with Real Data

1. On step 1, click the BTC×ETH pair card
2. Navigate to step 2
3. **Expected:** Loading skeleton appears briefly, then normalized price chart renders with 2 traces (BTC blue, ETH green) both rebased to 100, horizontal dashed line at 100
4. **Expected:** Correlation badge below chart shows "R = 0.9XX" (green, "VERY STRONG" or "STRONG")
5. Click "Actual Prices" on the SegmentedControl
6. **Expected:** Raw dual-axis chart shows: left axis "BTC-EUR (EUR)" with values in thousands, right axis "ETH-EUR (EUR)" with smaller values. Two price traces with different scales.
7. Click "Normalized (Base 100)" to toggle back
8. **Expected:** Normalized chart visible again. No re-fetch (data cached).

### 6. Step 2 — Educational Panel Content

1. With pair selected and on step 2
2. Scroll to educational panel below the chart
3. **Expected:** 💡 Intuition section expanded by default with correlation analogy text
4. Click 🔧 How It Works
5. **Expected:** Mechanics section describes normalization and Pearson correlation formula
6. Click 📊 Your Pair
7. **Expected:** Dynamic text referencing the selected pair's actual correlation strength

### 7. Step 3 — Concept Chart (No Pair Required)

1. Without any pair selected, navigate to step 3
2. **Expected:** Concept chart renders with 2 side-by-side subplots: left labeled "Correlated but NOT Cointegrated" (random walks drifting apart), right labeled "Cointegrated" (spread stays close)
3. **Expected:** Chart uses dark theme (dark background, light grid lines) on BOTH subplots
4. **Expected:** "No pair selected" alert appears below the concept chart
5. **Expected:** No console errors — synthetic data uses deterministic PRNG

### 8. Step 3 — Pair Comparison Badges

1. On step 1, select BTC×ETH pair
2. Navigate to step 3
3. **Expected:** Concept chart still visible at top
4. Below concept chart: 3 centered badges:
   - Correlation badge: "r = 0.9XX" (green)
   - Cointegration badge: "Cointegrated" (green) or "Not Cointegrated" (orange)
   - P-value badge: "p = 0.XXXX" (green if < 0.05, orange otherwise)
5. **Expected:** Interpretation text below badges reflects cointegration status (e.g., "✓ Good news..." if cointegrated)

### 9. Step 3 — Educational Panel

1. With pair selected on step 3
2. Scroll to educational panel
3. **Expected:** 💡 Intuition expanded with correlation vs cointegration analogy
4. **Expected:** 🔧 How It Works contains key differences list (at least 4 items)
5. **Expected:** 📊 Your Pair contains text referencing the selected pair's results

### 10. Build Verification

1. Run `cd frontend && npm run build`
2. **Expected:** Exit code 0. All 8 routes generated. No warnings about hydration mismatches.
3. Run `cd frontend && npx tsc --noEmit`
4. **Expected:** Zero errors, zero output.

## Edge Cases

### Pair with weak correlation (BTC×DOGE)

1. Select BTC×DOGE pair (click the orange card on step 1)
2. Navigate to step 2
3. **Expected:** Correlation badge may show a different color (yellow or red) depending on actual correlation strength. Strength label updates accordingly.
4. Navigate to step 3
5. **Expected:** Cointegration badge likely shows "Not Cointegrated" (orange). Interpretation text reflects this (e.g., "✗ This pair does not appear to be cointegrated...").

### Rapid step switching

1. Select a pair, then rapidly click through steps 1 → 2 → 3 → 1 → 3
2. **Expected:** No console errors, no stale data, no duplicate API calls (cache prevents re-fetch). Charts render correctly on each visit.

### Timeframe change

1. Select BTC×ETH pair on step 1
2. Navigate to step 2, verify chart renders
3. Change timeframe in header selector (e.g., 1h → 4h)
4. **Expected:** New API requests fire for the new timeframe. Charts update with new data. Correlation badge may show different value.

## Failure Signals

- Console errors containing "Academy fetch failed" — API endpoint unreachable or returning errors
- "window is not defined" error — SSR safety broken in a Plotly component
- Hydration mismatch warning — Math.random() used instead of deterministic PRNG
- Charts with white/light background on second subplot axis — DARK_AXIS_STYLE not applied to xaxis2/yaxis2
- Empty chart with no traces — OHLCV data fetch failed silently
- Badge showing "NaN" or "undefined" — CointegrationResponse type mismatch with API
- `npm run build` exit code non-zero — TypeScript or SSR compilation error

## Requirements Proved By This UAT

- R001 (partial) — Steps 1-3 work with real pair data; stepper infrastructure supports all 6 steps
- R002 (partial) — EducationalPanel with 3 layers works on steps 1-3; content depth verified
- R004 (partial) — Academy page runs as React with smooth step navigation, no Dash jank
- R006 (partial) — Pair cards set PairContext; steps react to pair selection
- R022 (partial) — Educational panels explain correlation, cointegration, normalization with visible formulas

## Not Proven By This UAT

- R001 completeness — Steps 4-6 not yet built (S04)
- R003 — Parameter sliders not present in steps 1-3 (S04 scope)
- R002 completeness — Educational panels for steps 4-6 not yet built
- Glossary cross-links from educational panels (S06)
- Automated component tests — no unit tests for Academy components
- Mobile responsiveness — not systematically tested (responsive grid hints exist)

## Notes for Tester

- Steps 4-5 in the stepper (positions 3-4-5) show placeholder text — this is expected. S04 will fill these in.
- The concept chart in Step 3 uses deterministic synthetic data — it should look identical every time the page loads. If the chart looks different on each load, there's a PRNG regression.
- Correlation values for BTC×ETH should be very high (>0.95). If they're unexpectedly low, check that the OHLCV cache has sufficient data.
- All charts should have dark backgrounds with light grid lines. If any chart area appears bright/white, check that dark theme styles are applied to all axes.
