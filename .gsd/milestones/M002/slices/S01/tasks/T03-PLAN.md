---
estimated_steps: 6
estimated_files: 6
---

# T03: Wire the first real React Research → Backtester flow

**Slice:** S01 — Backtest core + first connected research handoff
**Milestone:** M002

## Description

Turn the new backend contract into the first real product loop. This task adds the first live React Research page, a real Backtester page, and a deep-linkable handoff between them so the user can go from evidence to execution without copying numbers by hand.

The UI must make assumptions, warnings, and limitations visible. A beautiful chart with hidden caveats would violate the milestone’s transparency promise, so diagnostic states are part of the feature, not polish.

**Relevant skill:** `frontend-design`

## Steps

1. Extend `frontend/lib/api.ts` with typed client functions and TypeScript interfaces for the lookback sweep, recommended backtest params, and backtest result envelope returned by FastAPI.
2. Build `frontend/components/research/LookbackSweepPanel.tsx` to run the live lookback-window sweep against the selected pair/timeframe, render the result visualization/table plus takeaway banner, and display the recommended preset in user-facing language.
3. Build `frontend/components/backtest/BacktestResultView.tsx` to render metrics summary cards, data-quality status, warning callouts, equity curve, signal overlay, trade log, and honest-reporting footer without hiding bad outcomes.
4. Implement `frontend/app/(dashboard)/research/page.tsx` around the new panel. The “Use recommended settings” CTA should deep-link to `/backtest` via URL search params containing the full preset so the handoff is shareable and survives refresh.
5. Implement `frontend/app/(dashboard)/backtest/page.tsx` to parse search params into prefilled controls, allow reruns, call the live backtest endpoint, and show clear empty/loading/error/blocking states.
6. Update `frontend/components/layout/Sidebar.tsx` so Research and Backtest are navigable from the dashboard, then run the frontend build and manual localhost handoff flow.

## Must-Haves

- [ ] Research page runs the live lookback sweep and shows its takeaway/recommendation
- [ ] Recommendation CTA deep-links a complete preset into `/backtest`
- [ ] Backtester pre-fills controls from the handoff and can rerun with edited parameters
- [ ] Backtest results show metrics, charts, trade log, data-quality status, warnings, and footer metadata from the API
- [ ] Empty, loading, error, and blocking-preflight states are explicit and user-visible
- [ ] `cd frontend && npm run build` passes after the new pages/components are wired

## Verification

- `cd frontend && npm run build`
- Start `uv run python run_api.py` and `cd frontend && npm run dev`, then: run the lookback sweep on `/research`, click the recommendation CTA, confirm `/backtest` is prefilled correctly, run the backtest, and verify charts/trade log/warnings/footer all render from the live API

## Observability Impact

- Signals added/changed: the UI now exposes recommendation state, handoff-prefill state, data-quality panels, warning callouts, and honest-reporting footer sections as visible product surfaces
- How a future agent inspects this: use the browser flow, inspect network requests in devtools, and verify the rendered `/research` and `/backtest` states instead of reverse-engineering hidden React state
- Failure state exposed: API failures, blocked preflight cases, and suspicious/no-trade results appear inline with actionable text instead of disappearing behind empty charts

## Inputs

- `frontend/contexts/PairContext.tsx` — selected pair/timeframe state to seed Research and Backtest controls
- `frontend/lib/api.ts` — existing fetch wrapper patterns and error handling to extend
- `frontend/components/layout/Sidebar.tsx` — dashboard navigation to update
- `frontend/components/charts/PlotlyChart.tsx` — existing chart wrapper and dark-theme conventions
- `api/schemas.py` and new endpoints from T02 — authoritative response shapes for the UI
- `frontend/app/(dashboard)/scanner/page.tsx` and `frontend/app/(dashboard)/deep-dive/page.tsx` — established page/component patterns for Mantine + Plotly integration

## Expected Output

- `frontend/lib/api.ts` — typed client functions for research and backtest flows
- `frontend/components/research/LookbackSweepPanel.tsx` — first live research module UI with recommendation CTA
- `frontend/components/backtest/BacktestResultView.tsx` — reusable rendering surface for honest backtest results
- `frontend/app/(dashboard)/research/page.tsx` — user-facing Research page for the first real module
- `frontend/app/(dashboard)/backtest/page.tsx` — user-facing Backtester page with deep-link prefill and live execution
- `frontend/components/layout/Sidebar.tsx` — dashboard navigation updated for the new pages
