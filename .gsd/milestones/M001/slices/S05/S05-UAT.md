# S05: Pair Scanner + Deep Dive Pages — UAT

**Milestone:** M001
**Written:** 2026-03-17

## UAT Type

- UAT mode: live-runtime
- Why this mode is sufficient: this slice is primarily an integration slice; the value is only real if the React pages can call the FastAPI backend, render live Plotly results, and survive failure paths without crashing.

## Preconditions

- API server is running from the project root: `uv run python run_api.py`
- Frontend dev server is running from `frontend/`: `npm run dev`
- Cached pair data exists for at least `BTC`, `ETH`, `XRP`, `SOL`, and `ADA`
- Browser is open at `http://localhost:3000`

## Smoke Test

Open `/scanner`, click `Select top 20 by volume`, then click `Run Scan`. The page should show progress, finish with a `Scan complete` alert, and render a results table instead of staying blank.

## Test Cases

### 1. Scanner batch scan with real data

1. Navigate to `/scanner`.
2. Click `Select top 20 by volume`.
3. Note how many coins were selected.
4. Click `Run Scan`.
5. Wait for the progress bar to disappear and the `Scan complete` alert to appear.
6. **Expected:** the table row count equals `N*(N-1)/2` for the selected coin count; cointegrated rows appear first and are visually highlighted green; the summary alert reports scanned/cointegrated/not-cointegrated/failed counts; the p-value histogram renders beneath the table with the 0.05 threshold marker.

### 2. Scanner failure path with API offline

1. Stay on `/scanner`.
2. Clear the current scanner selection.
3. Select exactly two coins, e.g. `BTC` and `ETH`.
4. Stop the API server.
5. Click `Run Scan`.
6. Wait for the scan to finish.
7. **Expected:** the page does not crash; the table shows exactly one row for `BTC / ETH`; the `Coint?` column shows `⚠️`; metric columns render `—`; the summary alert reports `1 failed`.

### 3. Deep Dive single-pair analysis

1. Restart the API server.
2. Navigate to `/deep-dive`.
3. In the global header, select `BTC` as Asset 1 and `ETH` as Asset 2.
4. Leave timeframe at `1h`.
5. Click `Analyze`.
6. Wait for `Analysis complete`.
7. **Expected:** the page shows 8 stat cards and all 4 chart sections: `Price Comparison`, `Spread + Z-Score`, `Scatter + Regression`, and `Distribution Histograms`; the page badge reflects `BTC / ETH · 1H` (or equivalent case); the view stays responsive with no blank/error state.

### 4. Cross-page navigation remains intact

1. From `/deep-dive`, click `Academy` in the sidebar.
2. Confirm the Academy page loads.
3. Click `Pair Scanner` in the sidebar.
4. **Expected:** navigation works without broken links, blank pages, or shell/layout collapse; the app header and sidebar remain intact across all three pages.

## Edge Cases

### API outage during scanner execution

1. With exactly two scanner coins selected, stop the API server.
2. Click `Run Scan`.
3. **Expected:** progress completes and the failure is expressed in-page via `⚠️` row(s) and the summary alert rather than an uncaught exception or hard page failure.

### Invalid Deep Dive pair selection

1. Open `/deep-dive`.
2. Leave one asset empty, or set both assets to the same coin.
3. Click `Analyze`.
4. **Expected:** an inline yellow validation alert appears and no analysis charts render.

## Failure Signals

- `cd frontend && npm run build` fails or reports SSR errors involving `window`/`document`
- Scanner table row count does not match `N*(N-1)/2` after a successful run
- Cointegrated rows are not sorted to the top of the scanner table
- Scanner API outage causes a crash instead of `⚠️` rows and a failure count
- Deep Dive does not render all 8 stat cards and 4 chart sections after `Analyze`
- Navigation between `/scanner`, `/deep-dive`, and `/academy` produces blank or broken pages

## Requirements Proved By This UAT

- R004 — advances proof that Scanner and Deep Dive now run in the React frontend against the FastAPI backend
- R006 — advances proof that shared pair context drives Deep Dive and shared cached coin data drives Scanner selection options

## Not Proven By This UAT

- Final milestone-level proof that the Dash frontend is fully retired everywhere
- Glossary search/cross-link behavior and final polish work planned for S06
- Long-run performance characteristics for very large batch scans beyond the local spot-check used here

## Notes for Tester

- Scanner intentionally uses its own multi-coin/timeframe controls; the global header matters most for Deep Dive and Academy.
- For Deep Dive, rely on the visible `Analysis complete` alert plus the 4 chart section headings as the clearest success signal.
- In hard API-down tests, trust the page’s own alert/table state first; browser console/network tooling may be less informative than the in-page failure UI.
