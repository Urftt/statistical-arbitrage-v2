# S04: Workspace integration and live acceptance closure — Research

**Date:** 2026-03-18
**Depth:** Light research — straightforward E2E integration testing using established Playwright patterns against a fully-built stack.

## Summary

S04 is a pure verification and closure slice. S01–S03 built the full Research & Backtest workspace: 8 research modules, backtesting engine, grid search, walk-forward validation, overfitting/fragility detection, and all corresponding frontend pages. Every prior slice deferred **live localhost end-to-end exercise** to S04. The existing E2E tests (22 total across 3 spec files) are structural smoke tests — they verify pages load and tabs switch but never run an actual research module, trigger a backtest, or follow a handoff CTA from one page to another.

S04's job: write Playwright E2E tests that exercise the real connected flows against cached data on localhost, confirm all handoffs work, surface any integration bugs, fix them, and close M002's acceptance criteria and requirement statuses.

## Recommendation

Write a single new E2E spec file (`frontend/e2e/integration-flows.spec.ts`) containing 4–5 tests that exercise the critical connected paths identified in the milestone's Final Integrated Acceptance section. Each test selects a known-cached pair (BTC/ETH at 1h), runs a real module or backtest, waits for results, and verifies key result elements render. The CTA handoff tests follow a link from research/optimize → /backtest and verify URL params and pre-filled state arrive correctly. Run the full existing test suite (164 pytest + 22 E2E + build gate) as a regression check before and after. Fix any integration bugs found. Then update requirement statuses to close M002.

## Implementation Landscape

### Key Files

- `frontend/e2e/integration-flows.spec.ts` — **new**: the primary deliverable. 4–5 E2E tests covering the connected flows.
- `frontend/e2e/smoke.spec.ts` — existing 15-test smoke suite. Pattern reference for page navigation, pair selection, and wait strategies.
- `frontend/e2e/research-hub.spec.ts` — existing 4-test research tab suite. Pattern reference for `data-research-tab`/`data-research-module` selectors.
- `frontend/e2e/optimize.spec.ts` — existing 3-test optimize suite. Pattern reference for `data-optimize-tab`/`data-optimize-panel` selectors.
- `frontend/playwright.config.ts` — config: sequential execution, 90s timeout, auto-launches FastAPI :8000 + Next.js :3000 (or reuses if `REUSE_SERVERS=1`).
- `frontend/app/(dashboard)/backtest/page.tsx` — backtest page with URL search param hydration (the target of all handoff CTAs).
- `frontend/app/(dashboard)/research/page.tsx` — 8-tab research hub reading from `usePairContext`.
- `frontend/app/(dashboard)/optimize/page.tsx` — 2-tab optimize page reading from `usePairContext`.
- `frontend/components/research/LookbackSweepPanel.tsx` — the handoff module with "Backtest this" CTA link built via `buildBacktestSearchParams`.
- `frontend/components/optimize/GridSearchPanel.tsx` — "Use best params" CTA link at line 732.
- `frontend/components/backtest/BacktestResultView.tsx` — result renderer; check for `[data-testid]` or known text landmarks.
- `.gsd/REQUIREMENTS.md` — requirement statuses to update on closure.

### Pair Selection Strategy for E2E Tests

BTC-EUR and ETH-EUR are both cached at 1h and 4h. The existing smoke tests use `BTC/EUR × ETH/EUR` pair card click (line 62 of smoke.spec.ts). The E2E integration tests should use the same pair for consistency. The Mantine `Select` requires `ArrowDown` + `Enter` to commit a selection (see KNOWLEDGE.md).

### Critical Flows to Test

1. **Research → Backtest handoff**: Navigate to `/research`, select BTC+ETH via header selects, switch to "Lookback Window" tab, click "Run", wait for results (`.js-plotly-plot` visible + takeaway alert), click the backtest CTA link, verify `/backtest` URL contains search params (`asset1`, `lookback_window`, `source=research`), verify the "Research recommendation loaded" alert renders.

2. **Backtest execution**: On `/backtest` with BTC+ETH pre-filled (either from handoff or direct), click "Run backtest", wait for `BacktestResultView` to render (equity curve chart, metrics cards, trade log, honest-reporting footer). Verify footer text mentions assumptions/limitations.

3. **Grid search → Backtest handoff**: Navigate to `/optimize`, select BTC+ETH, ensure "Grid Search" tab active, run a minimal grid search (narrow ranges), wait for heatmap result, verify "Use best params" CTA link is present and navigates to `/backtest` with `source=grid-search` in URL.

4. **Walk-forward result rendering**: Navigate to `/optimize`, switch to "Walk-Forward" tab, run with BTC+ETH, wait for fold cards + stability verdict, verify verdict banner and per-fold display render.

5. **All 8 research modules render results** (optional stretch): Select BTC+ETH, iterate through all 8 research tabs, click "Run" on each, verify each produces a result (takeaway alert visible). This is a thorough but potentially slow test (8 API calls × backend computation).

### Build Order

1. **Run existing gates first** — `uv run pytest tests/ -q` (164 pass) + `cd frontend && npm run build` (clean) + `cd frontend && npm run test:e2e` (22 pass). Confirms baseline is green.
2. **Write `integration-flows.spec.ts`** — the core deliverable. Use the patterns from smoke.spec.ts for pair selection and chart wait. Use the Mantine Select commit pattern from KNOWLEDGE.md.
3. **Run the new E2E suite** — `cd frontend && npm run test:e2e`. If failures surface integration bugs, fix them in the relevant source files.
4. **Update requirement statuses** — R008–R015, R022, R023 closure notes reflecting the live UAT evidence.
5. **Final full regression** — all 3 gates green.

### Verification Approach

The slice is verified when:

- `uv run pytest tests/ -q` — 164 passed, 0 failed
- `cd frontend && npm run build` — compiles clean, all routes generated
- `cd frontend && npm run test:e2e` — all tests pass (22 existing + new integration tests)
- The new integration spec exercises: (a) research module execution on real data, (b) research→backtest CTA handoff with URL param verification, (c) backtest execution with result rendering, (d) optimize grid search with CTA handoff, (e) walk-forward with stability verdict rendering
- Requirement statuses updated to reflect live UAT evidence

## Common Pitfalls

- **Mantine Select pair selection in E2E** — Typing into the Select input alone doesn't commit the value. Must use `ArrowDown` + `Enter` or click the dropdown option. The smoke tests avoid this by clicking pair suggestion cards on the Academy page; research/optimize pages don't have cards, so the header selects must be used directly.
- **Research/optimize modules require both assets selected** — The pages show "Select asset 1, asset 2…" alert and no controls render until `usePairContext` has both assets. E2E tests must commit both asset selections before interacting with module controls.
- **Backtest and grid search API calls are slow** — Real backtest on BTC+ETH 1h with 365 days of data takes a few seconds. Grid search with even a 2×2 sweep runs 4+ backtests. The Playwright config has 90s timeout, which should be fine, but individual `expect` assertions may need explicit longer timeouts (`{ timeout: 30_000 }`).
- **Walk-forward is the slowest endpoint** — It runs grid search per fold. Keep fold_count and parameter ranges minimal in E2E tests to stay under 60s.
