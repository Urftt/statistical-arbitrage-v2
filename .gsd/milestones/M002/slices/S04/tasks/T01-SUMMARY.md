---
id: T01
parent: S04
milestone: M002
provides:
  - 5 E2E integration flow tests proving connected research→backtest→optimize paths work on real cached data
key_files:
  - frontend/e2e/integration-flows.spec.ts
key_decisions:
  - Use getByRole('textbox', { name }) for Mantine NumberInput instead of aria-label selectors
  - Use { exact: true } for getByText when ambiguous matches exist (e.g., 'Assumptions')
patterns_established:
  - selectPair() helper function for Mantine Select commit pattern (fill → ArrowDown → Enter) reusable across E2E specs
  - Scoped NumberInput targeting via panel locator + getByRole with nth() indexing for duplicate labels
observability_surfaces:
  - REUSE_SERVERS=1 npx playwright test e2e/integration-flows.spec.ts — targeted integration test run
  - npx playwright show-report — HTML report with failure screenshots and traces
  - frontend/test-results/ — per-test failure screenshots and error-context.md
duration: 15m
verification_result: passed
completed_at: 2026-03-18
blocker_discovered: false
---

# T01: Write E2E integration flow tests and fix discovered bugs

**Created 5 E2E integration flow tests exercising research lookback→CTA handoff→backtest→grid search→walk-forward on real BTC+ETH cached data; all 27 tests pass (22 existing + 5 new)**

## What Happened

Created `frontend/e2e/integration-flows.spec.ts` with 5 tests covering the critical connected paths:

1. **Research lookback module** — navigates to /research, selects BTC×ETH via header, runs lookback sweep, asserts chart + takeaway alert render with non-empty text
2. **Research→backtest CTA handoff** — runs lookback sweep, clicks "Use recommended settings" CTA, asserts URL contains `/backtest` with `source=research`, `asset1` containing BTC, and `lookback_window` param; verifies "Research recommendation loaded" alert renders
3. **Backtest execution** — navigates to /backtest, selects pair, clicks "Run backtest", asserts equity curve chart + honest-reporting footer with "Assumptions" and "Limitations" headings
4. **Grid search→backtest CTA** — navigates to /optimize, configures 2×2 grid (narrow axis ranges), runs grid search, asserts heatmap renders + "Use best params" CTA visible, clicks CTA, verifies URL has `source=grid-search`
5. **Walk-forward stability verdict** — switches to walk-forward tab, configures 2 folds with narrow axes, runs walk-forward, asserts stability verdict alert (stable/moderate/fragile) renders

Initial run exposed 3 issues (all fixed in-spec, no component bugs):
- `getByText('Assumptions')` matched 2 DOM elements → fixed with `{ exact: true }`
- Mantine NumberInput uses label prop as accessible name, not `aria-label` → switched from `locator('input[aria-label="Min"]')` to `getByRole('textbox', { name: 'Min' })`
- Same pattern for Folds input

No component bugs were discovered — all handoffs, API calls, and render paths worked correctly on the first real end-to-end run.

## Verification

- `uv run pytest tests/ -q` → 164 passed ✅
- `cd frontend && npm run build` → compiled clean, 0 errors ✅
- `cd frontend && REUSE_SERVERS=1 npx playwright test` → 27 passed (22 existing + 5 new) ✅
- No `test.skip` or `.only` in the new spec ✅
- All tests exercise real API calls against cached BTC+ETH data at 1h timeframe (not mocked) ✅

## Diagnostics

- Run targeted: `cd frontend && REUSE_SERVERS=1 npx playwright test e2e/integration-flows.spec.ts`
- On failure: screenshots in `frontend/test-results/<test-name>/test-failed-1.png`
- Full HTML report: `cd frontend && npx playwright show-report`
- Error context: `frontend/test-results/<test-name>/error-context.md` contains page accessibility snapshot at failure point

## Deviations

- Used `getByRole('textbox', { name: 'Min' })` instead of `input[aria-label="Min"]` because Mantine NumberInput doesn't set aria-label (plan suggested aria-label selectors)
- Added `{ exact: true }` to `getByText('Assumptions')` / `getByText('Limitations')` to avoid strict mode violation (not anticipated in plan)
- No component or API bugs were found, so no bug-fix files were needed (plan anticipated possible fixes)

## Known Issues

None

## Files Created/Modified

- `frontend/e2e/integration-flows.spec.ts` — new E2E spec with 5 integration flow tests and `selectPair()` helper
- `.gsd/milestones/M002/slices/S04/S04-PLAN.md` — added Observability / Diagnostics section
- `.gsd/milestones/M002/slices/S04/tasks/T01-PLAN.md` — added Observability Impact section
- `.gsd/KNOWLEDGE.md` — added Mantine NumberInput accessible name pattern
