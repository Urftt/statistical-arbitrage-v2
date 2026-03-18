---
estimated_steps: 6
estimated_files: 7
---

# T04: Build frontend optimize page with grid search and walk-forward panels

**Slice:** S03 — Optimization, walk-forward, and overfitting visibility
**Milestone:** M002

## Description

Build the React frontend surfaces for grid search and walk-forward validation: TypeScript API types and functions, a tabbed `/optimize` page, a Grid Search panel with Plotly heatmap, a Walk-Forward panel with per-fold result cards, and E2E smoke tests. This turns the T02/T03 API endpoints into a usable product surface and extends R011 (optimization visibility), R014 (walk-forward), R015 (transparency), and R022 (evidence visibility).

**Relevant skill:** `frontend-design` — load this skill for React/Next.js/Mantine patterns and visual quality.

## Steps

1. **Add TypeScript interfaces and API functions to `frontend/lib/api.ts`:**
   - Interfaces: `ParameterAxisPayload` (`name`, `min_value`, `max_value`, `step`), `GridSearchCellPayload` (`params: Record<string, number>`, `metrics: MetricSummaryPayload`, `trade_count: number`, `status: 'ok' | 'blocked' | 'no_trades'`), `GridSearchRequest`, `GridSearchResponse`, `WalkForwardFoldPayload`, `WalkForwardRequest`, `WalkForwardResponse`.
   - `GridSearchResponse` fields: `grid_shape: number[]`, `axes: ParameterAxisPayload[]`, `cells: GridSearchCellPayload[]`, `best_cell_index: number | null`, `best_cell: GridSearchCellPayload | null`, `optimize_metric: string`, `total_combinations: number`, `robustness_score: number | null`, `warnings: EngineWarningPayload[]`, `execution_time_ms: number`, `footer: HonestReportingFooterPayload`, `recommended_backtest_params: BacktestRequest | null`.
   - `WalkForwardResponse` fields: `folds: WalkForwardFoldPayload[]`, `fold_count: number`, `train_pct: number`, `axes: ParameterAxisPayload[]`, `aggregate_train_sharpe: number | null`, `aggregate_test_sharpe: number | null`, `train_test_divergence: number | null`, `stability_verdict: 'stable' | 'moderate' | 'fragile'`, `warnings: EngineWarningPayload[]`, `execution_time_ms: number`, `footer: HonestReportingFooterPayload`, `recommended_backtest_params: BacktestRequest | null`.
   - API functions: `postGridSearch(req: GridSearchRequest): Promise<GridSearchResponse>` → `POST ${API_BASE_URL}/api/optimization/grid-search`, `postWalkForward(req: WalkForwardRequest): Promise<WalkForwardResponse>` → `POST ${API_BASE_URL}/api/optimization/walk-forward`. Follow the existing `apiFetch` pattern.

2. **Build `frontend/components/optimize/GridSearchPanel.tsx`:**
   - Use `'use client'` directive. Import pair context via `usePairContext()`.
   - Controls section: up to 3 parameter axis pickers. Each axis has a Mantine `Select` for the parameter name (options: `lookback_window`, `entry_threshold`, `exit_threshold`, `stop_loss`), and `NumberInput` fields for min, max, step. Start with 2 default axes: entry_threshold (1.0–3.0, step 0.5) and exit_threshold (0.1–1.0, step 0.1).
   - Show estimated combination count (product of `(max-min)/step + 1` for each axis) updating live as the user adjusts ranges. Show a warning badge if count > 200.
   - "Run Grid Search" `Button`. On click: build `GridSearchRequest` from controls, call `postGridSearch()`, set loading/error/result state.
   - Result area: (a) Robustness score badge (green ≥ 0.5, yellow 0.25–0.5, red < 0.25). (b) Warning alerts for overfitting/fragility (same distinct styling as T01 BacktestResultView). (c) Plotly heatmap: for 2D grids, x-axis = first axis values, y-axis = second axis values, z = metric value (Sharpe by default). Color scale: `Viridis` or similar. Gray cells for no-trade combos (`null` z value). Use the `PlotlyChart` wrapper with dark theme. Annotate the best cell. (d) If 1D (single axis), show a line chart instead. (e) Best cell summary card with its params and metrics. (f) "Use best params" `Button` CTA linking to `/backtest` via `buildBacktestSearchParams()` from the `recommended_backtest_params` field.
   - Loading: `Skeleton` components matching the result layout.
   - Error: red `Alert` with error message.
   - **MUST** use `next/dynamic` with `{ ssr: false }` because of Plotly. The panel component itself should be the dynamically imported module.

3. **Build `frontend/components/optimize/WalkForwardPanel.tsx`:**
   - Use `'use client'` directive. Import pair context.
   - Controls: `NumberInput` for fold count (default 5, min 2, max 20), `Slider` or `NumberInput` for train % (default 60%, range 30–90%), same parameter axis pickers as grid search (reuse or duplicate the axis control component). "Run Walk-Forward" `Button`.
   - Result area: (a) Stability verdict banner: `Alert` with green/yellow/red color and text like "Walk-forward results are stable / moderate / fragile". (b) Aggregate summary card: average train Sharpe, average test Sharpe, train-test divergence ratio. (c) Per-fold result cards (use `SimpleGrid` or `Stack`): each card shows fold index, train/test bar counts, train metrics (Sharpe, return, trades), test metrics (Sharpe, return, trades), status badge. Highlight folds where test is significantly worse than train (divergence indicator). (d) Warning alerts for divergence, zero-trade folds, etc. (e) If stability is "stable" or "moderate" and `recommended_backtest_params` exists: "Use walk-forward params" CTA linking to `/backtest`.
   - Loading: `Skeleton` components.
   - Error: red `Alert`.
   - **MUST** use `next/dynamic` with `{ ssr: false }`.

4. **Build `frontend/app/(dashboard)/optimize/page.tsx`:**
   - Follow the `research/page.tsx` tabbed pattern exactly: Mantine `Tabs` with `keepMounted={false}`, `next/dynamic` lazy-loading for each panel, skeleton loading fallback.
   - Two tabs: "Grid Search" (icon: `IconGridDots` or similar), "Walk-Forward" (icon: `IconTimeline` or similar).
   - Header: `Title` "Optimize", `Text` description explaining the purpose.
   - Pair context validation: if asset1/asset2 not selected, show an info `Alert` prompting pair selection (same pattern as research page).

5. **Add "Optimize" nav item to `frontend/components/layout/Sidebar.tsx`:**
   - Add to `NAV_ITEMS` array after "Backtest": `{ label: 'Optimize', href: '/optimize', icon: IconAdjustments, description: 'Grid search & walk-forward' }`.
   - Import `IconAdjustments` from `@tabler/icons-react`.

6. **Write `frontend/e2e/optimize.spec.ts`:**
   - `test('optimize page loads with two tabs')`: navigate to `/optimize`, verify both "Grid Search" and "Walk-Forward" tab labels are visible.
   - `test('switching tabs changes the visible panel')`: click Walk-Forward tab, verify Walk-Forward panel content is visible, Grid Search panel is not.
   - `test('grid search tab shows parameter controls')`: verify axis controls and Run button are visible on the default tab.
   - Follow the patterns in `frontend/e2e/research-hub.spec.ts` — use `data-optimize-tab` and `data-optimize-panel` attributes for test selectors.

## Must-Haves

- [ ] TypeScript interfaces match the API schemas from T02/T03
- [ ] `postGridSearch()` and `postWalkForward()` API functions work
- [ ] Grid Search panel renders heatmap with dark theme, robustness score, warnings, and CTA
- [ ] Walk-Forward panel renders stability verdict, per-fold cards, warnings, and CTA
- [ ] `/optimize` page uses tabbed layout with `keepMounted={false}` and `next/dynamic`
- [ ] Sidebar includes "Optimize" navigation item
- [ ] `npm run build` passes (no TypeScript errors, no SSR crashes)
- [ ] E2E tests pass for page load, tab switching, and control visibility

## Verification

- `cd frontend && npm run build` — passes (no TypeScript errors, no SSR crashes from Plotly)
- `cd frontend && REUSE_SERVERS=1 npm run test:e2e` — all existing tests + new optimize tests pass

## Inputs

- `api/schemas.py` — T02/T03's `GridSearchResponse`, `WalkForwardResponse` schemas to match with TypeScript interfaces
- `frontend/lib/api.ts` — existing patterns for interfaces, `apiFetch`, API functions
- `frontend/app/(dashboard)/research/page.tsx` — tabbed page pattern to follow
- `frontend/components/research/LookbackSweepPanel.tsx` — panel structure pattern (loading/error/result states)
- `frontend/components/backtest/BacktestResultView.tsx` — overfitting warning styling from T01
- `frontend/components/charts/PlotlyChart.tsx` — SSR-safe Plotly wrapper
- `frontend/components/layout/Sidebar.tsx` — nav item registration
- `frontend/e2e/research-hub.spec.ts` — E2E test pattern

## Expected Output

- `frontend/lib/api.ts` — extended with grid search and walk-forward interfaces and API functions
- `frontend/app/(dashboard)/optimize/page.tsx` — new tabbed optimize page
- `frontend/components/optimize/GridSearchPanel.tsx` — grid search panel with heatmap
- `frontend/components/optimize/WalkForwardPanel.tsx` — walk-forward panel with fold cards
- `frontend/components/layout/Sidebar.tsx` — "Optimize" nav item added
- `frontend/e2e/optimize.spec.ts` — E2E smoke tests for optimize page
