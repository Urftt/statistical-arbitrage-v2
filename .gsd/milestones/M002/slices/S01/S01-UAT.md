# S01: Backtest core + first connected research handoff — UAT

**Milestone:** M002
**Written:** 2026-03-17

## UAT Type

- UAT mode: mixed
- Why this mode is sufficient: S01 spans deterministic engine behavior, API contracts, and a real localhost user flow. The slice is only proved when the hard gates pass and the connected Research → Backtest loop behaves honestly in the browser on real cached data.

## Preconditions

- FastAPI is running locally on `http://localhost:8000`
- Next.js is running locally on `http://localhost:3000`
- Cached parquet data exists for `ETH/EUR` and `ETC/EUR` on `1h`
- Browser session starts at `/research`

## Smoke Test

Open `/research`, commit `ETH` and `ETC` in the header pair selectors with timeframe `1h`, click **Run lookback sweep**, and confirm the page renders a takeaway plus a **Use recommended settings** CTA. If that works, the slice’s core loop is present.

## Test Cases

### 1. Run the live lookback sweep and produce a recommendation

1. Open `http://localhost:3000/research`.
2. In the dashboard header, commit `Asset 1 = ETH`, `Asset 2 = ETC`, and `Timeframe = 1h`.
3. Leave **History window (days)** at `365`.
4. Click **Run lookback sweep**.
5. **Expected:** the page renders the live research result for `ETH/EUR × ETC/EUR · 1h`, including the takeaway banner, the result table, and a recommendation card with a **Use recommended settings** CTA.

### 2. Accept the recommendation and run a successful backtest

1. From the completed research result, click **Use recommended settings**.
2. Confirm the browser lands on `/backtest` and the URL includes the handed-off preset values (at minimum `asset1=ETH%2FEUR`, `asset2=ETC%2FEUR`, `timeframe=1h`, and a recommended `lookback_window=50`).
3. Confirm the backtest controls are prefilled from the URL, including `ETH`, `ETC`, `1h`, and the recommended lookback value.
4. Click **Run backtest**.
5. **Expected:** the page shows a successful result state with **Backtest completed**, metric cards, **No warnings raised**, visible **Equity curve** and **Signal overlay** charts, a populated **Trade log** showing `72 trade log rows · 144 signal events`, and an **Honest-reporting footer** section on the page.

### 3. Confirm the handoff is refresh-safe

1. Stay on the successful `/backtest?...` URL from test case 2.
2. Reload the page.
3. **Expected:** the controls hydrate from the URL again without losing the preset, so the page still shows `ETH`, `ETC`, `1h`, and the same recommended parameter values ready for rerun.

## Edge Cases

### Blocked preflight is explicit

1. On `/backtest`, change **History window (days)** to `7` and **Lookback window** to `500`.
2. Click **Run backtest**.
3. **Expected:** the page shows **Blocked preflight**, explains the blocker under **Blocking issues**, shows **Charts hidden by design**, keeps the trade surface explicit with `0 trade log rows · 0 signal events`, and still renders the honest-reporting footer instead of rendering empty charts or pretending the strategy was flat.

## Failure Signals

- `/research` stays in the empty state after pair selection because the header selects were typed into but not actually committed
- The lookback sweep completes without a takeaway or without a **Use recommended settings** CTA
- Clicking the recommendation navigates to `/backtest` but the URL does not carry the preset values
- `/backtest` loses the preset on refresh
- A successful run is missing any of: metrics cards, equity curve, signal overlay, trade log, or honest-reporting footer
- The blocked run still renders charts, hides the blocker explanation, or silently shows an empty trade log without a clear blocked state
- Browser console errors or failed network requests appear during either the research or backtest flow

## Requirements Proved By This UAT

- R009 — proves the user can run the strategy over real cached history and inspect structured equity/trade outputs in the live product
- R010 — proves the live backtester exposes the required performance metrics to the user
- R015 — proves the product shows assumptions, warnings, and limitations together with the result instead of hiding them
- R022 — proves the backtester exposes the execution model, fee model, data basis, and limitations as user-visible reporting surfaces

## Not Proven By This UAT

- The remaining seven research modules in R008; S01 only proves the first live module and the shared handoff pattern
- Full R023 closure for explicit regular-interval missing-candle detection; this UAT only proves blocked preflight behavior once a deterministic blocker is triggered
- S03 scope such as bounded optimization, walk-forward validation, fragility detection, and suspiciously-good-result warnings

## Notes for Tester

The header pair controls are Mantine `Select` inputs. For reliable manual or automated verification, make sure the option is actually committed from the dropdown — visible typed text alone is not enough. On the proven successful path, the recommendation produced a `lookback_window=50` preset and the completed backtest rendered `72 trade log rows · 144 signal events`; small visual/layout differences are acceptable, but missing trust/reporting surfaces are not.
