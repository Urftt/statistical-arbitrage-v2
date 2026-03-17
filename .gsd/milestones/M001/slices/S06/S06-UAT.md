# S06 UAT — Final live integration pass

Date: 2026-03-17
Executor: pi (GSD auto-mode)
Stack: FastAPI on `:8000` via `uv run python run_api.py`, Next.js dev server on `:3000` via `cd frontend && npm run dev`

## Static gate

Passed before live UAT:

- `cd frontend && npx tsc --noEmit`
- `cd frontend && npm run build`

Re-run after the final dashboard-shell hydration fix:

- `cd frontend && npx tsc --noEmit && npm run build` ✅

## Runtime issue found and fixed during the pass

Initial live navigation surfaced a React hydration mismatch in `/academy` caused by Mantine-generated runtime ids/classNames in the dashboard shell. The shell was updated in `frontend/app/(dashboard)/layout.tsx` to render after mount, then the browser console/network buffers were cleared and the final happy-path UAT was rerun.

Final happy-path result after the fix:

- Browser console errors: none
- Failed network requests: none

## Glossary route proof

### `/glossary`

Verified live:

- Full render shows all 17 glossary cards.
- Summary text shows: `Showing all 17 glossary terms so deep links always have a visible card target.`
- Stable card ids exist for at least:
  - `#glossary-cointegration`
  - `#glossary-z-score`

### Search behavior

Verified live on `/glossary`:

1. Search `cointegration`
   - Result summary changed to `Showing 5 of 17 terms for “cointegration”.`
   - Visible matches included `correlation`, `cointegration`, `ADF test`, `p-value`, `Engle-Granger Test`.

2. Search `beta`
   - Alias match resolved to `#glossary-hedge-ratio` only.
   - Result summary changed to `Showing 1 of 17 terms for “beta”.`

3. Search `mean`
   - Definition/concept matching returned multiple cards including `pairs trading`, `cointegration`, `stationarity`, `mean reversion`, `spread`, `z-score`, `half-life`, and `exit signal`.

4. Search `qwerty-stat-arb`
   - Empty state rendered with:
     - `Showing 0 of 17 terms for “qwerty-stat-arb”.`
     - `No terms matched “qwerty-stat-arb”.`
     - `Try a full concept name, an alias like beta, or a broader idea like mean.`
     - `Clear search`

### Direct hash routes

Verified live:

- `http://localhost:3000/glossary#glossary-cointegration` landed with the `#glossary-cointegration` card in view.
- `http://localhost:3000/glossary#glossary-z-score` landed with the `#glossary-z-score` card in view.

## Academy → Glossary cross-link proof

Live clicks completed from Academy steps 2-6 to the glossary anchors below:

- Step 2 `Price Comparison`
  - `correlation` → `/glossary#glossary-correlation`

- Step 3 `Correlation vs Cointegration`
  - `Correlation` → `/glossary#glossary-correlation`
  - `Cointegration` → `/glossary#glossary-cointegration`

- Step 4 `Cointegration Test`
  - `hedge ratio` → `/glossary#glossary-hedge-ratio`
  - `ADF test` → `/glossary#glossary-adf-test`
  - Cointegration glossary wiring also present in the step panel.

- Step 5 `The Spread`
  - `spread` → `/glossary#glossary-spread`
  - `mean reversion` → `/glossary#glossary-mean-reversion`
  - `stationarity` → `/glossary#glossary-stationarity`

- Step 6 `Z-Score & Signals`
  - `z-score` → `/glossary#glossary-z-score`
  - Spread glossary wiring also present in the step panel.

All clicked links landed on the expected glossary card id with the correct term visible.

## Cross-page integration loop

Verified live route loop:

1. `Academy`
2. `Glossary`
3. `Pair Deep Dive`
4. `Pair Scanner`
5. `Academy`

Observed during the loop:

- Shared header selectors (`Asset 1`, `Asset 2`, `Timeframe`) stayed visible on all four routes.
- Sidebar navigation remained intact and usable on all four routes.
- Dark-theme shell stayed visually consistent across all four routes.
- No blank pages, dead states, or broken route transitions occurred in the final rerun.

## Deep Dive proof

Route: `/deep-dive`

Live evidence:

- Page badge showed `BTC / ETH · 1h`.
- Running `Analyze` produced the success alert:
  - `Analysis complete`
  - `BTC / ETH analyzed over the last 91 days at 1h.`
- Metrics and all four chart surfaces rendered after the analysis completed.

## Scanner proof

Route: `/scanner`

Live evidence:

- Scanner kept its intentional page-local controls:
  - multi-select `Coins to scan`
  - local `Timeframe`
  - `History (days)`
  - `Run Scan`
  - `Select top 20 by volume`
- Running the scan produced the success alert:
  - `Scan complete`
  - `Scanned 171 pairs. Found 26 cointegrated, 145 not cointegrated.`
- Results table rendered with `171 PAIRS` and included `BTC / ETH` among the results.

## Diagnostics

Final clean happy-path diagnostics were checked after the hydration fix and buffer reset:

- Console logs: none
- Failed network requests: none

## Outcome

S06 passed live UAT after fixing the dashboard-shell hydration mismatch. The glossary, Academy cross-links, shared shell behavior, Deep Dive analysis flow, and Scanner batch flow all worked together on the real stack with clean final diagnostics.
