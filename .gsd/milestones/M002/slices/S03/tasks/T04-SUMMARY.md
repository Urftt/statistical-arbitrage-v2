---
id: T04
parent: S03
milestone: M002
provides:
  - "/optimize page with tabbed Grid Search and Walk-Forward panels"
  - "TypeScript interfaces and API functions for grid search and walk-forward endpoints"
  - "Plotly heatmap visualization for 2D grid search results"
  - "Per-fold result cards with train/test comparison for walk-forward validation"
  - "Sidebar navigation for the Optimize page"
key_files:
  - frontend/app/(dashboard)/optimize/page.tsx
  - frontend/components/optimize/GridSearchPanel.tsx
  - frontend/components/optimize/WalkForwardPanel.tsx
  - frontend/lib/api.ts
  - frontend/components/layout/Sidebar.tsx
  - frontend/e2e/optimize.spec.ts
key_decisions:
  - "Axis controls duplicated in both panels rather than extracted to shared component — panels are self-contained and axis config may diverge"
  - "Heatmap uses Viridis colorscale with null z-values for no-trade cells and a star annotation for best cell"
  - "Walk-Forward fold cards highlight divergent folds with red border when test Sharpe < 50% of train Sharpe"
patterns_established:
  - "data-optimize-tab and data-optimize-panel attributes for E2E test targeting on the optimize page"
  - "AxisControl component pattern: Select for parameter name + NumberInput triplet for min/max/step"
  - "WarningAlerts component pattern: filters warnings by code prefix (overfit_, fragile_, wf_) for distinct styling"
observability_surfaces:
  - "Inline colored Alert components for overfit/fragile/wf warning codes from API responses"
  - "Live combination counter badge with color-coded threshold warnings (green < 200, yellow 200-500, red > 500)"
  - "Robustness score badge with green/yellow/red color bands (≥50%, 25-50%, <25%)"
  - "Stability verdict banner for walk-forward results (stable/moderate/fragile)"
  - "Console.error logging for API fetch failures via existing apiFetch wrapper"
duration: "~25 minutes"
verification_result: passed
completed_at: 2026-03-18
blocker_discovered: false
---

# T04: Build frontend optimize page with grid search and walk-forward panels

**Added /optimize page with tabbed Grid Search (Plotly heatmap, robustness badge, overfitting alerts) and Walk-Forward (fold cards, stability verdict, divergence highlighting) panels**

## What Happened

Built the complete frontend surface for optimization and walk-forward validation, following the plan's 6 steps:

1. **API types** — Added TypeScript interfaces matching the T02/T03 Python schemas: `ParameterAxisPayload`, `GridSearchCellPayload`, `GridSearchRequest/Response`, `WalkForwardFoldPayload`, `WalkForwardRequest/Response`. Added `postGridSearch()` and `postWalkForward()` API functions using the existing `apiFetch` pattern.

2. **GridSearchPanel** — Full-featured panel with up to 3 parameter axis pickers, live combination counter, Plotly heatmap (2D) or line chart (1D), robustness score badge, overfitting/fragility warning alerts, best cell summary card, and "Use best params" CTA linking to `/backtest`.

3. **WalkForwardPanel** — Panel with fold count, train % slider, axis pickers, stability verdict banner (green/yellow/red), aggregate summary cards, per-fold result cards with train/test comparison, divergence highlighting on struggling folds, warning alerts, and CTA linking to `/backtest` for stable/moderate verdicts.

4. **Optimize page** — Tabbed page at `/optimize` with `keepMounted={false}` and `next/dynamic` lazy-loading, following the research page pattern exactly.

5. **Sidebar** — Added "Optimize" nav item with `IconAdjustments` after "Backtest".

6. **E2E tests** — 3 smoke tests verifying page load with two tabs, tab switching, and control visibility.

Fixed two TypeScript issues during build: Plotly heatmap `text` 2D array type mismatch (cast via `unknown`), and `MetricSummaryPayload` to `Record<string, unknown>` cast (needs double cast through `unknown`).

## Verification

- `cd frontend && npm run build` — ✅ passes (0 TypeScript errors, no SSR crashes)
- `npx playwright test e2e/optimize.spec.ts` — ✅ 3/3 tests pass
- `npx playwright test` — ✅ 22/22 tests pass (no regressions)
- `uv run pytest tests/test_overfitting.py tests/test_optimization.py tests/test_walkforward.py tests/test_optimization_api.py -q` — ✅ 46 passed
- Browser visual verification — ✅ Grid Search and Walk-Forward tabs render correctly with controls, empty states, and proper styling

## Diagnostics

- Navigate to `http://localhost:3000/optimize` — tabs load, pair selector in header feeds context
- `data-optimize-tab="grid-search"` / `data-optimize-tab="walk-forward"` — E2E-targetable tab elements
- `data-optimize-panel="grid-search"` / `data-optimize-panel="walk-forward"` — E2E-targetable panel containers
- Browser console shows `console.error` on API failures with full URL and error detail
- Warning codes from API (`overfit_*`, `fragile_*`, `wf_*`) render as distinct colored Alert components

## Deviations

- Axis control component duplicated in both panels rather than extracted to a shared module — kept inline since the panels are self-contained and the axis UX may diverge as features grow
- Added `ActionIcon` with trash icon for axis removal in GridSearchPanel vs `Button` with trash icon in WalkForwardPanel — minor styling difference, both functional

## Known Issues

None

## Files Created/Modified

- `frontend/lib/api.ts` — Added 95 lines: grid search and walk-forward TypeScript interfaces + API functions
- `frontend/app/(dashboard)/optimize/page.tsx` — New tabbed optimize page with dynamic panel imports
- `frontend/components/optimize/GridSearchPanel.tsx` — Grid search panel with axis controls, heatmap, robustness badge, warnings, CTA
- `frontend/components/optimize/WalkForwardPanel.tsx` — Walk-forward panel with fold cards, stability verdict, divergence highlighting, CTA
- `frontend/components/layout/Sidebar.tsx` — Added "Optimize" nav item with IconAdjustments
- `frontend/e2e/optimize.spec.ts` — 3 E2E smoke tests for optimize page
- `.gsd/milestones/M002/slices/S03/tasks/T04-PLAN.md` — Added Observability Impact section
