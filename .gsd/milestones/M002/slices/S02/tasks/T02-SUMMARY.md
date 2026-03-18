---
id: T02
parent: S02
milestone: M002
provides:
  - 7 TypeScript request/response interfaces and postXxx() fetch functions for all research modules
  - 7 React panel components (RollingStability, OOSValidation, Timeframe, SpreadMethod, ZScoreThreshold, TxCost, CointMethod) with full loading/error/empty/result states
  - Research Hub refactored into 8-tab module picker with lazy-loaded panels via next/dynamic
  - E2E test covering tab rendering and module switching (4 test cases)
  - Z-score threshold and transaction cost panels include recommendation CTA with buildBacktestSearchParams deep-link to /backtest
key_files:
  - frontend/lib/api.ts
  - frontend/components/research/RollingStabilityPanel.tsx
  - frontend/components/research/OOSValidationPanel.tsx
  - frontend/components/research/TimeframePanel.tsx
  - frontend/components/research/SpreadMethodPanel.tsx
  - frontend/components/research/ZScoreThresholdPanel.tsx
  - frontend/components/research/TxCostPanel.tsx
  - frontend/components/research/CointMethodPanel.tsx
  - frontend/app/(dashboard)/research/page.tsx
  - frontend/e2e/research-hub.spec.ts
key_decisions:
  - Each panel uses distinct accent color (blue, violet, yellow, orange, green, teal, grape) for visual differentiation between diagnostic and handoff modules
  - Tabs use keepMounted={false} to avoid rendering all 8 panels simultaneously — only active tab mounts
  - data-research-tab and data-research-module attributes added for E2E testability
patterns_established:
  - All research panels follow the same structure: header card with controls → error alert → loading skeleton → empty state → result state (takeaway → stat cards → PlotlyChart → data table)
  - Handoff panels (ZScoreThreshold, TxCost) include a recommendation CTA section identical to LookbackSweepPanel pattern
  - Module picker uses RESEARCH_MODULES constant array with lazy-loaded Panel components
observability_surfaces:
  - Each panel logs fetch failures to console.error with module name
  - Red Alert component renders error messages inline (no dev tools needed)
  - data-research-tab/data-research-module attributes enable E2E tab inspection
duration: ~45min
verification_result: passed
completed_at: 2026-03-18
blocker_discovered: false
---

# T02: Build 7 React research panels, refactor Research Hub into module picker, and add E2E test

**Built 7 research panel components with charts/tables/CTAs, refactored Research Hub into 8-tab module picker with lazy loading, and added 4-case E2E test — all 19 E2E + 118 Python tests pass**

## What Happened

1. Extended `frontend/lib/api.ts` with 7 TypeScript interface sets (request, response, result payload) and 7 `postXxx()` async fetch functions matching the T01 Pydantic schemas exactly.

2. Created 7 panel components in `frontend/components/research/`, each following the LookbackSweepPanel pattern:
   - **RollingStabilityPanel**: line chart of p-value over time with 0.05 threshold line, stat cards for % cointegrated / avg p-value / hedge ratio range
   - **OOSValidationPanel**: grouped bar chart comparing formation vs trading p-values, stat cards for splits tested / OOS confirmed / max hedge drift
   - **TimeframePanel**: bar chart of p-values per timeframe colored by cointegration status, no timeframe field in request (compares all)
   - **SpreadMethodPanel**: bar chart of ADF p-values per spread method, stat cards for stationary count / best method / spread σ range
   - **ZScoreThresholdPanel**: bubble scatter of entry vs exit vs trade count, recommendation CTA with `buildBacktestSearchParams` deep-link
   - **TxCostPanel**: line chart of net profitable % vs fee level with Bitvavo 0.25% marked, entry/exit σ controls, recommendation CTA
   - **CointMethodPanel**: horizontal bar chart of test statistics per method, stat cards for agreement count / unanimous verdict

3. Refactored `research/page.tsx` from single-LookbackSweepPanel to Mantine `Tabs` with 8 modules defined in a `RESEARCH_MODULES` constant array, each lazy-loaded via `next/dynamic` with `{ ssr: false }` and loading skeletons.

4. Created `frontend/e2e/research-hub.spec.ts` with 4 test cases: renders ≥4 tabs, renders all 8, tab click switches panel, switching multiple tabs works.

## Verification

- `cd frontend && npm run build` — passes, no TS errors, no SSR failures
- `cd frontend && REUSE_SERVERS=1 npx playwright test` — 19/19 pass (4 new + 15 existing) in 22s
- `uv run pytest tests/test_research_api.py -q` — 8/8 pass
- `uv run pytest tests/ -q` — 118/118 pass
- Visual browser verification: navigated to /research, confirmed 8 tabs visible, clicked Spread Method and Transaction Cost tabs, verified panel switching and controls render correctly

### Slice-level verification status

- ✅ `uv run pytest tests/test_research_api.py -q` — 8 pass
- ✅ `uv run pytest tests/ -q` — 118 pass
- ✅ `cd frontend && npm run build` — no errors
- ✅ `cd frontend && REUSE_SERVERS=1 npm run test:e2e` — 19 pass (4 new research hub tests)
- ⬜ Live localhost: run non-lookback module on cached pair (requires next manual verification session with pair committed)

## Diagnostics

- Tab rendering: inspect `[data-research-tab]` elements in DOM — should be 8
- Panel switching: click any tab, check `[data-research-module="{id}"]` becomes visible
- API connectivity: each panel logs `console.error('Research {module} failed:', err)` on fetch failure
- Build-time SSR safety: `npm run build` catches any `window is not defined` errors from Plotly imports

## Deviations

None — all steps executed as planned.

## Known Issues

None.

## Files Created/Modified

- `frontend/lib/api.ts` — added 7 interface sets + 7 postXxx() fetch functions
- `frontend/components/research/RollingStabilityPanel.tsx` — new panel component
- `frontend/components/research/OOSValidationPanel.tsx` — new panel component
- `frontend/components/research/TimeframePanel.tsx` — new panel component
- `frontend/components/research/SpreadMethodPanel.tsx` — new panel component
- `frontend/components/research/ZScoreThresholdPanel.tsx` — new panel component with recommendation CTA
- `frontend/components/research/TxCostPanel.tsx` — new panel component with recommendation CTA
- `frontend/components/research/CointMethodPanel.tsx` — new panel component
- `frontend/app/(dashboard)/research/page.tsx` — refactored to 8-tab module picker with lazy loading
- `frontend/e2e/research-hub.spec.ts` — new E2E test with 4 test cases
- `.gsd/milestones/M002/slices/S02/tasks/T02-PLAN.md` — added Observability Impact section
