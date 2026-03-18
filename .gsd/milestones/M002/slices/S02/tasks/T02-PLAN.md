---
estimated_steps: 5
estimated_files: 11
---

# T02: Build 7 React research panels, refactor Research Hub into module picker, and add E2E test

**Slice:** S02 — Complete the 8-module Research Hub on the shared contract
**Milestone:** M002

## Description

Create 7 new React panel components for the remaining research modules, add their TypeScript interfaces and API fetch functions, refactor the Research Hub page into a tabbed module picker, and add a Playwright E2E test to gate regressions.

Each panel follows the `LookbackSweepPanel.tsx` pattern: receive `{asset1, asset2, timeframe}` props, show controls + run button, render loading/error/empty/result states, display a takeaway alert, stat cards, a PlotlyChart visualization, and a data table. Z-score threshold and transaction cost panels include a recommendation CTA that deep-links into `/backtest` via `buildBacktestSearchParams`. Diagnostic panels omit the CTA.

**Relevant skills:** `frontend-design` (for panel component layout and styling), `test` (for E2E test authoring)

## Steps

1. **Add 7 TypeScript interfaces and fetch functions to `frontend/lib/api.ts`**

   For each of the 7 modules, add:
   - A request interface matching the T01 Pydantic request model
   - A response interface matching the T01 Pydantic response model
   - A result payload interface for the `results` array items
   - A `postXxx()` async function that POSTs to the correct `/api/research/xxx` endpoint

   The 7 modules and their routes:
   | Module | Route | Function name |
   |--------|-------|---------------|
   | Rolling Stability | `/api/research/rolling-stability` | `postRollingStability` |
   | OOS Validation | `/api/research/oos-validation` | `postOOSValidation` |
   | Timeframe | `/api/research/timeframe` | `postTimeframeComparison` |
   | Spread Method | `/api/research/spread-method` | `postSpreadMethodComparison` |
   | Z-score Threshold | `/api/research/zscore-threshold` | `postZScoreThreshold` |
   | Transaction Cost | `/api/research/tx-cost` | `postTxCost` |
   | Coint. Method | `/api/research/coint-method` | `postCointMethodComparison` |

   Each fetch function follows the `postLookbackSweep()` pattern exactly — call `apiFetch<XxxResponse>(url, { method: 'POST', headers, body })`.

   **Key TypeScript gotchas** (from KNOWLEDGE.md):
   - Response `module` field is a string literal type matching the backend
   - Use `number | null` for nullable floats (e.g., `p_value`, `half_life`, `hedge_ratio`)
   - The `recommended_backtest_params` field is `BacktestRequest | null`

2. **Create 7 panel components in `frontend/components/research/`**

   Each panel file: `'use client'` directive, imports from `@mantine/core`, `@tabler/icons-react`, `PlotlyChart`, and `api.ts`.

   **Common structure for all panels:**
   ```
   Props: { asset1: string; asset2: string; timeframe: string }
   State: loading, error, result (typed to the module response), optional parameter controls
   Header card: module description, optional param controls, "Run" button
   Error alert (red)
   Loading skeleton
   Empty state ("No results yet")
   Result state: takeaway alert → stat cards → PlotlyChart → data table
   ```

   **Panel-specific details:**

   **a) `RollingStabilityPanel.tsx`** — Rolling cointegration over time
   - Extra control: `window` NumberInput (default 90, min 30)
   - Chart: line chart with p_value over time, horizontal line at 0.05, cointegrated regions shaded
   - Stat cards: % of windows cointegrated, avg p-value, hedge ratio range
   - Table: timestamp, p_value, is_cointegrated, hedge_ratio, test_statistic

   **b) `OOSValidationPanel.tsx`** — In-sample vs out-of-sample
   - No extra controls (uses default split ratios)
   - Chart: grouped bar chart comparing formation vs trading p-values per split ratio
   - Stat cards: # splits tested, # where OOS confirms in-sample, hedge ratio drift
   - Table: split_ratio, formation_p_value, trading_p_value, formation_cointegrated, trading_cointegrated

   **c) `TimeframePanel.tsx`** — Cross-timeframe cointegration
   - No extra controls (request does NOT include timeframe — it compares all)
   - Note: the request interface for this module does NOT have a `timeframe` field
   - Chart: bar chart of p-values per timeframe, colored by cointegration status
   - Stat cards: # timeframes cointegrated, best timeframe, half-life range
   - Table: timeframe, p_value, is_cointegrated, hedge_ratio, half_life, n_datapoints

   **d) `SpreadMethodPanel.tsx`** — Spread construction comparison
   - No extra controls
   - Chart: bar chart of ADF p-values per method, colored by stationarity
   - Stat cards: # stationary methods, best method, spread std range
   - Table: method, adf_statistic, adf_p_value, is_stationary, spread_std, spread_skewness, spread_kurtosis

   **e) `ZScoreThresholdPanel.tsx`** — Entry/exit threshold sweep
   - Extra controls: optional NumberInputs for lookback_window
   - Chart: heatmap or scatter of entry vs exit vs total_trades
   - Stat cards: best combo, total combos tested, max trades found
   - Table: entry, exit, total_trades, avg_duration, max_duration
   - **Recommendation CTA**: If `recommended_backtest_params` is not null, show a "Use recommended thresholds" button that deep-links to `/backtest?...` via `buildBacktestSearchParams`. Follow the `LookbackSweepPanel` recommendation section pattern.

   **f) `TxCostPanel.tsx`** — Transaction cost impact analysis
   - Extra controls: optional NumberInputs for entry_threshold, exit_threshold
   - Chart: line chart of net_profitable_pct vs fee_pct, with Bitvavo fee level marked
   - Stat cards: Bitvavo-level profitability %, total trades analyzed, avg spread %
   - Table: fee_pct, round_trip_pct, total_trades, profitable_trades, net_profitable_pct
   - **Recommendation CTA**: Show "Use Bitvavo fee settings" button with deep-link to `/backtest` via `buildBacktestSearchParams`.

   **g) `CointMethodPanel.tsx`** — Engle-Granger vs Johansen
   - No extra controls
   - Chart: horizontal bar chart of test statistics per method, marked by cointegration pass/fail
   - Stat cards: # methods agree, unanimous verdict
   - Table: method, is_cointegrated, statistic, critical_value, detail

   **Plotly TypeScript gotchas** (from KNOWLEDGE.md):
   - Use `as Data` casts when TypeScript complains about trace types (e.g., `nbinsx`, mode quirks)
   - Use `'text+markers'` not `'markers+text'` for scatter mode
   - Spread `DARK_AXIS_STYLE` before overrides: `{ ...DARK_AXIS_STYLE, title: { text: '...' } }`
   - For secondary axes (yaxis2, xaxis2), manually copy dark theme axis styles
   - All charts go through the `PlotlyChart` SSR-safe wrapper

3. **Refactor `research/page.tsx` into a multi-module tab picker**

   Replace the current single-LookbackSweepPanel layout with a Mantine `Tabs` component:
   - Define a `RESEARCH_MODULES` constant array: `{ id, label, description, icon }` for all 8 modules
   - Use `Tabs` with `Tabs.List` showing all 8 module labels
   - Each `Tabs.Panel` lazy-loads its panel component via `next/dynamic` with `{ ssr: false }` and a loading skeleton
   - The module-picker stays at the page level; each panel receives `{asset1, asset2, timeframe}` from `usePairContext()`
   - Keep the existing header (title, badge, pair info) and pair-error alerts
   - Default to the first tab (lookback window)

4. **Add E2E test in `frontend/e2e/research-hub.spec.ts`**

   Using the existing Playwright setup (see `frontend/e2e/smoke.spec.ts` for patterns):
   - Navigate to `/research`
   - Verify at least 4 module tab labels are visible (proof that the tab picker renders)
   - Click on a non-lookback module tab (e.g., "Spread Method")
   - Verify the panel content area changes (the new module's description or run button appears)
   - The test should NOT run an actual analysis (that requires pair selection commit which is fragile in automation per KNOWLEDGE.md)

5. **Build gate and full E2E run**

   ```bash
   cd frontend && npm run build    # type + SSR gate
   cd frontend && REUSE_SERVERS=1 npm run test:e2e   # if servers are up
   # or: cd frontend && npm run test:e2e   # auto-launches servers
   ```

## Must-Haves

- [ ] 7 TypeScript request/response interfaces + `postXxx()` functions in `api.ts`
- [ ] 7 panel components in `frontend/components/research/` with loading/error/empty/result states
- [ ] All Plotly charts use `PlotlyChart` SSR-safe wrapper (no direct `react-plotly.js` imports)
- [ ] Z-score threshold and tx-cost panels include recommendation CTA with `buildBacktestSearchParams`
- [ ] Research Hub page uses Mantine `Tabs` with all 8 modules, lazy-loaded via `next/dynamic`
- [ ] E2E test verifies tab rendering and module switching
- [ ] `npm run build` passes (no TypeScript errors, no SSR failures)
- [ ] All E2E tests pass

## Verification

- `cd frontend && npm run build` — no errors
- `cd frontend && REUSE_SERVERS=1 npm run test:e2e` — all tests pass including the new research hub test
- Manual: open `http://localhost:3000/research` and switch between all 8 tabs

## Inputs

- `frontend/lib/api.ts` — existing interfaces and fetch functions (pattern to follow: `postLookbackSweep`)
- `frontend/components/research/LookbackSweepPanel.tsx` — the template for all new panels
- `frontend/components/charts/PlotlyChart.tsx` — SSR-safe chart wrapper to use for all visualizations
- `frontend/app/(dashboard)/research/page.tsx` — current single-panel page to refactor
- `frontend/e2e/smoke.spec.ts` — existing E2E test patterns for Playwright setup
- `frontend/contexts/PairContext.tsx` — provides `usePairContext()` for asset1/asset2/timeframe
- T01 output: 7 new API endpoints serving data at `/api/research/*`
- KNOWLEDGE.md Plotly TypeScript gotchas (axis title objects, `as Data` casts, spread order, `ssr: false`)

## Observability Impact

- **Browser console**: Each panel logs fetch failures to `console.error` with the module name and URL, consistent with the `apiFetch` wrapper pattern. No new console instrumentation needed.
- **Network tab**: POST requests to `/api/research/{slug}` are visible with JSON payloads and typed responses. 4xx/5xx failures include `detail` in the response body.
- **Tab rendering**: The Mantine `Tabs` component uses `data-research-module` attributes on each `Tabs.Panel` for E2E testability. The E2E test gates on tab labels and panel content switching.
- **Failure states**: Each panel renders an explicit red `Alert` with the error message on fetch failure, making failures visible without opening dev tools.
- **Lazy loading**: `next/dynamic` loading skeletons appear during chunk fetch, proving the lazy boundary works. If SSR breaks, `npm run build` catches it.

## Expected Output

- `frontend/lib/api.ts` — extended with 7 new interface sets and fetch functions
- `frontend/components/research/RollingStabilityPanel.tsx` — new
- `frontend/components/research/OOSValidationPanel.tsx` — new
- `frontend/components/research/TimeframePanel.tsx` — new
- `frontend/components/research/SpreadMethodPanel.tsx` — new
- `frontend/components/research/ZScoreThresholdPanel.tsx` — new
- `frontend/components/research/TxCostPanel.tsx` — new
- `frontend/components/research/CointMethodPanel.tsx` — new
- `frontend/app/(dashboard)/research/page.tsx` — refactored to tabbed module picker
- `frontend/e2e/research-hub.spec.ts` — new E2E test
