# S03: Optimization, walk-forward, and overfitting visibility — UAT

**Milestone:** M002
**Written:** 2026-03-18

## UAT Type

- UAT mode: mixed (artifact-driven for engine contracts + live-runtime for API/frontend)
- Why this mode is sufficient: The engines are pure functions verified by 46 tests, but the API endpoints and frontend surfaces need live runtime verification on real cached data to confirm the full loop works.

## Preconditions

- FastAPI backend running on `http://localhost:8000` (`uv run uvicorn api.main:app --reload`)
- Next.js frontend running on `http://localhost:3000` (`cd frontend && npm run dev`)
- At least one pair with cached 1h OHLCV data (e.g. BTC-EUR + ETH-EUR)
- `uv run pytest tests/ -q` passes (164 tests)
- `cd frontend && npm run build` passes

## Smoke Test

Navigate to `http://localhost:3000/optimize`. The page loads with two tabs: "Grid Search" and "Walk-Forward". The sidebar shows an "Optimize" link. Both tabs display parameter axis controls.

## Test Cases

### 1. Grid Search — basic run on a real pair

1. Navigate to `http://localhost:3000/optimize`
2. Confirm the Grid Search tab is active by default
3. Select a pair from the header selectors (e.g. BTC-EUR / ETH-EUR / 1h)
4. The "Axis 1" control should default to a parameter with min/max/step fields
5. Set Axis 1: parameter=`entry_threshold`, min=`1.5`, max=`2.5`, step=`0.5`
6. Add Axis 2: parameter=`exit_threshold`, min=`0.3`, max=`0.7`, step=`0.2`
7. Observe the combination counter badge shows the expected count (3 × 3 = 9 combos, green badge)
8. Click "Run Grid Search"
9. **Expected:** Loading state appears, then results render with:
   - A Plotly heatmap showing entry_threshold × exit_threshold colored by Sharpe ratio
   - A star annotation (★) on the best cell
   - A robustness score badge (green/yellow/red)
   - Best cell summary showing the winning parameter combination and its metrics
   - "Use best params" button linking to `/backtest`

### 2. Grid Search — max combination guard

1. On the Grid Search tab, configure 3 axes with wide ranges producing >500 combos
   - Axis 1: `lookback_window`, min=10, max=200, step=5 (39 values)
   - Axis 2: `entry_threshold`, min=1.0, max=3.0, step=0.1 (21 values)
2. Observe the combination counter turns red and shows >500
3. Click "Run Grid Search"
4. **Expected:** Error state with 422 message about exceeding the combination limit

### 3. Grid Search — overfitting and fragility warnings

1. Run a grid search that includes parameter combinations likely to produce extreme metrics on a short dataset (e.g. high entry thresholds on a volatile pair)
2. **Expected:** If any cell produces Sharpe > 3, profit factor > 5 with few trades, or other overfitting triggers:
   - Orange/red Alert components appear with `overfit_*` warning codes
   - If the best cell is isolated (poor neighbors), a `fragile_best_cell` warning appears
3. Verify warnings show specific metric values and thresholds in the message text

### 4. Grid Search — best params handoff to backtest

1. After a successful grid search, click "Use best params"
2. **Expected:** Browser navigates to `/backtest` with URL search params encoding the best parameter combination
3. The Backtest page should show pre-filled controls matching the grid search best cell parameters

### 5. Walk-Forward — basic run on a real pair

1. Switch to the "Walk-Forward" tab
2. Select a pair with sufficient data (e.g. BTC-EUR / ETH-EUR / 1h)
3. Set fold count to 3, train % to 60%
4. Add Axis 1: parameter=`entry_threshold`, min=`1.5`, max=`2.5`, step=`0.5`
5. Click "Run Walk-Forward"
6. **Expected:** Loading state, then results render with:
   - A stability verdict banner (green "stable", yellow "moderate", or red "fragile")
   - Aggregate summary cards showing mean train Sharpe, mean test Sharpe, and divergence ratio
   - Per-fold cards showing fold index, train/test bar counts, train metrics, test metrics, and best params
   - If any fold has test Sharpe < 50% of train Sharpe, that fold card has a red border

### 6. Walk-Forward — stability verdict and warnings

1. Run walk-forward with settings likely to produce divergent results (e.g. few folds, narrow parameter range)
2. **Expected:**
   - If `train_test_divergence < 0.5`: yellow "moderate" or red "fragile" verdict
   - `wf_train_test_divergence` warning appears explaining the divergence
   - If zero-trade test folds occur: `wf_zero_test_trades` warning
   - If <3 valid folds: `wf_insufficient_valid_folds` warning
3. When verdict is "fragile": no "Use best params" CTA should appear

### 7. Walk-Forward — best params handoff (stable/moderate only)

1. Run walk-forward that produces a "stable" or "moderate" verdict
2. **Expected:** "Use best params" CTA appears linking to `/backtest`
3. Click the CTA
4. **Expected:** Backtest page loads with pre-filled parameters

### 8. Overfitting warnings in standalone backtest

1. Navigate to `/backtest`
2. Run a backtest with parameters that produce extreme metrics (if possible with real data — e.g. very wide entry/exit thresholds)
3. **Expected:** If the result triggers overfitting thresholds, the Runtime warnings section shows orange alerts with "⚠️ Overfitting Signal" title and distinct styling from regular warnings
4. Run a backtest with reasonable parameters that produce moderate metrics
5. **Expected:** No overfitting warnings appear — the detector doesn't false-positive on healthy results

### 9. API endpoint contract — grid search

1. `curl -X POST http://localhost:8000/api/optimization/grid-search -H 'Content-Type: application/json' -d '{"asset1":"BTC-EUR","asset2":"ETH-EUR","timeframe":"1h","axes":[{"name":"entry_threshold","min_value":1.5,"max_value":2.5,"step":0.5}]}'`
2. **Expected:** 200 response with JSON containing:
   - `total_combinations` matching expected count
   - `cells` array with per-cell `params`, `metrics`, `trade_count`, `status`
   - `best_cell` with the best-performing combination
   - `robustness_score` as a float between 0 and 1
   - `warnings` array (may contain `overfit_*` or `fragile_*` codes)
   - `footer` with honest-reporting metadata
   - `execution_time_ms`

### 10. API endpoint contract — walk-forward

1. `curl -X POST http://localhost:8000/api/optimization/walk-forward -H 'Content-Type: application/json' -d '{"asset1":"BTC-EUR","asset2":"ETH-EUR","timeframe":"1h","axes":[{"name":"entry_threshold","min_value":1.5,"max_value":2.5,"step":0.5}],"fold_count":3,"train_pct":0.6}'`
2. **Expected:** 200 response with JSON containing:
   - `folds` array with per-fold `train_metrics`, `test_metrics`, `best_params`, `status`
   - `stability_verdict` as one of "stable", "moderate", "fragile"
   - `train_test_divergence` as a float (or null)
   - `aggregate_train_sharpe` and `aggregate_test_sharpe`
   - `warnings` array (may contain `wf_*` codes)
   - `footer` with honest-reporting metadata

## Edge Cases

### Grid search with all zero-trade cells

1. Run grid search with very extreme thresholds (e.g. entry_threshold 9.0–10.0) that are unlikely to produce any trades
2. **Expected:** Results render without errors. All cells show `no_trades` status. `best_cell` is null. No robustness score. No crash.

### Walk-forward with insufficient data

1. Try walk-forward with fold_count=5 on a pair with limited data
2. **Expected:** Either a 422 error for insufficient data, or results with `wf_short_test_window` and/or `wf_insufficient_valid_folds` warnings and a "fragile" verdict

### Walk-forward with invalid parameters

1. POST to `/api/optimization/walk-forward` with `fold_count: 1`
2. **Expected:** 422 with validation error about fold_count must be >= 2
3. POST with `train_pct: 0.95`
4. **Expected:** 422 with validation error about train_pct must be between 0.3 and 0.9

### Sidebar navigation

1. Click "Optimize" in the sidebar from any page
2. **Expected:** Navigates to `/optimize` and the Optimize link is highlighted as active

## Failure Signals

- `/optimize` page shows blank or crashes → SSR issue with Plotly dynamic imports
- Grid search returns but heatmap doesn't render → Plotly data shape mismatch or dark theme issue
- Walk-forward folds show identical train/test metrics → temporal data leak (train and test windows overlap)
- All grid-search cells show `blocked` → `run_backtest()` is failing silently for all combos
- No overfitting warnings appear on any result → detector not wired into `engine.py` correctly
- False-positive overfitting warnings on every run → thresholds are too aggressive
- "Use best params" CTA navigates to `/backtest` but controls are empty → URL search param encoding broken
- E2E tests fail → page structure changed, data-testid attributes missing

## Requirements Proved By This UAT

- **R011** — Tests 1, 2, 3, 4, 9 prove multi-parameter grid search with bounded ranges, robustness scoring, and honest reporting
- **R012** — Tests 3, 6, 8 prove overfitting and fragility detection with appropriate thresholds and no false positives
- **R014** — Tests 5, 6, 7, 10 prove walk-forward validation with rolling windows, stability verdict, and divergence analysis
- **R015** — Tests 9, 10 prove that optimization/walk-forward responses include footer, assumptions, warnings, and sample context
- **R022** — Tests 1, 3, 5, 6 prove that optimization makes robustness, fragility, and divergence visible to the user

## Not Proven By This UAT

- Live integration from Research Hub → Optimize → Backtest as a connected flow (S04 scope)
- Optimization performance with large combo counts near the 500 limit on slow hardware
- Walk-forward behavior across all cached pairs (only tested on one pair)
- Persistent optimization history or comparison between runs

## Notes for Tester

- The heatmap requires at least 2 axes with at least 2 values each to render a 2D grid. With only 1 axis, it shows a line chart instead.
- Walk-forward on small datasets may produce "fragile" verdicts by design — this is not a bug, it's honest reporting.
- The combination counter badge color thresholds: green < 200, yellow 200–500, red > 500.
- Robustness score badge: green ≥ 50%, yellow 25–50%, red < 25%.
- If the backend has no cached data for the selected pair, the API returns a 404. Select a pair that shows data in the pair selector dropdown.
