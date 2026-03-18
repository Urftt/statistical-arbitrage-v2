# S02: Complete the 8-module Research Hub on the shared contract — UAT

**Milestone:** M002
**Written:** 2026-03-18

## UAT Type

- UAT mode: mixed (artifact-driven + live-runtime)
- Why this mode is sufficient: The 8 contract tests and 4 E2E tests prove API correctness and tab rendering. Live-runtime visual inspection is needed to confirm charts render correctly, takeaway banners display meaningful content, and recommendation CTAs produce working backtest deep-links.

## Preconditions

1. FastAPI backend running on `:8000` — `cd /Users/luckleineschaars/repos/statistical-arbitrage-v2 && uv run uvicorn api.main:app --reload --port 8000`
2. Next.js frontend running on `:3000` — `cd frontend && npm run dev`
3. Cached parquet data exists for at least one pair (ETH/EUR + ETC/EUR at 1h is the standard test pair)
4. Header pair selectors must be set to a valid pair before running modules (e.g., ETH/EUR + ETC/EUR + 1h)

## Smoke Test

Navigate to `http://localhost:3000/research`. Confirm 8 tab labels are visible: Lookback Window, Rolling Stability, OOS Validation, Timeframe Comparison, Spread Method, Z-Score Threshold, Transaction Cost, Cointegration Method. Click any non-lookback tab and confirm the panel content area changes.

## Test Cases

### 1. All 8 tabs render and are navigable

1. Open `http://localhost:3000/research`
2. Count the tab labels in the module picker
3. Click each tab label in sequence
4. **Expected:** 8 tab labels visible. Each click switches the panel content area. No blank white areas. No console errors.

### 2. Rolling Stability module runs on cached pair

1. Set header selectors to ETH/EUR + ETC/EUR + 1h
2. Click the "Rolling Stability" tab
3. Click the "Run Analysis" (or equivalent) button
4. **Expected:** Loading skeleton appears, then results: a line chart showing p-value over time with a 0.05 threshold line, stat cards (% cointegrated, avg p-value, hedge ratio range), and a takeaway alert banner with colored severity indicator.

### 3. OOS Validation module shows formation vs trading comparison

1. With ETH/EUR + ETC/EUR + 1h selected
2. Click the "OOS Validation" tab
3. Run the analysis
4. **Expected:** A grouped bar chart comparing formation-period and trading-period p-values per split. Stat cards for splits tested, OOS confirmed, and max hedge ratio drift. Takeaway banner present.

### 4. Timeframe Comparison module handles missing timeframes gracefully

1. Click the "Timeframe Comparison" tab
2. Run the analysis (no timeframe field needed — compares all available)
3. **Expected:** Bar chart showing p-values per available timeframe (1h, 4h expected for ETH/ETC). Timeframes not in cache should not appear (no error). Takeaway banner present.

### 5. Spread Method module shows scalar diagnostics only

1. Click the "Spread Method" tab
2. Run the analysis
3. **Expected:** Bar chart of ADF p-values per spread method. Stat cards for stationary count, best method, spread σ range. No raw numpy array dumps visible in the UI. Takeaway banner present.

### 6. Z-Score Threshold module shows recommendation CTA

1. Click the "Z-Score Threshold" tab
2. Run the analysis
3. **Expected:** A bubble/scatter visualization of entry vs exit thresholds. Stat cards for trade counts and profitability. A recommendation CTA button/link is visible below the results.
4. Click the recommendation CTA
5. **Expected:** Browser navigates to `/backtest` with URL search params pre-filled (asset1, asset2, timeframe, lookback_window, entry_threshold, exit_threshold, etc.)

### 7. Transaction Cost module shows Bitvavo fee marker and recommendation CTA

1. Click the "Transaction Cost" tab
2. Run the analysis with default or custom entry/exit controls
3. **Expected:** Line chart showing net profitable percentage vs fee level. A vertical marker or annotation at 0.25% (Bitvavo fee). Stat cards. Takeaway banner. Recommendation CTA visible.
4. Click the recommendation CTA
5. **Expected:** Browser navigates to `/backtest` with pre-filled parameters including `transaction_fee=0.0025`

### 8. Cointegration Method module compares test methods

1. Click the "Cointegration Method" tab
2. Run the analysis
3. **Expected:** Horizontal bar chart comparing test statistics across methods (Engle-Granger both directions, Johansen). Stat cards for agreement count and unanimous verdict. Takeaway banner present. No recommendation CTA (diagnostic-only module).

### 9. Diagnostic modules do NOT show recommendation CTA

1. Check Rolling Stability, OOS Validation, Timeframe Comparison, Spread Method, and Cointegration Method panels after running
2. **Expected:** None of these 5 panels show a "Use recommended parameters" or equivalent CTA button. Only Z-Score Threshold and Transaction Cost (and Lookback Window from S01) show the CTA.

### 10. Takeaway banners have meaningful content and severity colors

1. Run at least 3 different modules
2. **Expected:** Each takeaway banner shows a text summary of findings (not a generic message). Severity color varies based on results (e.g., green/success for good cointegration, yellow/warning for marginal, red/error for poor). The banner content relates to the actual analysis results shown.

## Edge Cases

### Missing cache pair

1. Set header selectors to a pair that does NOT have cached data (e.g., an unusual pair)
2. Run any research module
3. **Expected:** A clear error message — not a blank panel, not a stack trace. The error should indicate missing or insufficient data.

### Rapid tab switching

1. Click between tabs rapidly (5+ tabs in quick succession)
2. **Expected:** No stale results from a previous tab appearing in the current tab. No console errors. The active tab's content matches its label.

### Same module run twice

1. Run a module, see results
2. Click Run again without changing parameters
3. **Expected:** Results refresh (loading skeleton briefly appears), then same or updated results display. No duplication. No errors.

## Failure Signals

- A tab click shows a blank white panel with no loading indicator or content
- Console shows uncaught errors when switching tabs or running analysis
- A takeaway banner shows raw JSON or an empty string instead of readable text
- The recommendation CTA on Z-Score Threshold or Transaction Cost doesn't navigate to /backtest
- URL search params on /backtest are missing or malformed after clicking a recommendation CTA
- `npm run build` fails with TypeScript or SSR errors
- Any of the 8 contract tests in `test_research_api.py` fail
- Any of the 4 E2E tests in `research-hub.spec.ts` fail

## Requirements Proved By This UAT

- **R008** — All 8 research modules run from React against FastAPI, return structured results with takeaway banners
- **R015** — Research outputs expose sample size, assumptions, and takeaway severity across all 8 modules
- **R022** — Research evidence visibility confirmed: each module shows data, charts, stat cards, and contextual takeaway alongside recommendations

## Not Proven By This UAT

- Grid search and walk-forward optimization (R011, R012, R014 — S03 scope)
- End-to-end research→backtest→metrics flow across all modules (S04 integration closure)
- Missing-candle gap detection in data quality preflight (R023 partial gap)
- Live automated trading surfaces (R017-R021 — M003/M004 scope)

## Notes for Tester

- The standard test pair is ETH/EUR + ETC/EUR + 1h. Other pairs may work if cached, but this pair is guaranteed to have sufficient data for all modules.
- Timeframe comparison depends on which timeframes are cached for the selected pair — if only 1h is cached, the chart will show only one bar (this is correct behavior, not a bug).
- The OOS validation module may show "insufficient data" for pairs with very short histories (< 90 days). Use a pair with at least 365 days of data.
- Tab switching uses `keepMounted={false}` — panel state is lost when switching away. This is intentional to avoid stale results.
