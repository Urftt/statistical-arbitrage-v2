# S04: Workspace integration and live acceptance closure

**Goal:** Exercise the full Research & Backtest workspace end-to-end on localhost through Playwright E2E tests that run real research modules, trigger real backtests, follow CTA handoffs between pages, and verify results render — then close M002's requirement statuses with final integrated acceptance evidence.
**Demo:** `cd frontend && npm run test:e2e` passes all existing (22) + new integration tests. The new spec proves: (a) research module runs on real cached data and produces a result, (b) research→backtest CTA handoff arrives at /backtest with correct URL params, (c) backtest runs and renders equity curve + metrics + honest-reporting footer, (d) grid search runs and "Use best params" CTA links to /backtest, (e) walk-forward runs and renders stability verdict. All M002 requirements updated with final acceptance evidence.

## Must-Haves

- New `frontend/e2e/integration-flows.spec.ts` with 4–5 tests exercising the critical connected flows against real cached BTC+ETH data
- All 22 existing E2E tests still pass (no regressions)
- Any integration bugs discovered during E2E runs are fixed
- `uv run pytest tests/ -q` — 164 passed, 0 failed
- `cd frontend && npm run build` — compiles clean
- R008–R015, R022, R023 requirement statuses updated with final integrated acceptance evidence

## Proof Level

- This slice proves: final-assembly
- Real runtime required: yes (localhost :3000 + :8000 with real cached data)
- Human/UAT required: no (E2E tests serve as automated UAT)

## Verification

- `cd frontend && npm run test:e2e` — all tests pass (22 existing + new integration flow tests)
- `uv run pytest tests/ -q` — 164 passed, 0 failed
- `cd frontend && npm run build` — compiles clean, 0 TypeScript errors
- New integration spec file exists at `frontend/e2e/integration-flows.spec.ts` with ≥4 test cases
- M002 requirement statuses updated in `.gsd/REQUIREMENTS.md`

## Integration Closure

- Upstream surfaces consumed: S01 backtest engine + page + result view, S02 research hub (8 tabs + endpoints), S03 optimize page (grid search + walk-forward panels + CTAs), shared `buildBacktestSearchParams` URL helper, `usePairContext` header selects
- New wiring introduced in this slice: none (pure verification)
- What remains before the milestone is truly usable end-to-end: nothing — this slice closes M002

## Tasks

- [ ] **T01: Write E2E integration flow tests and fix discovered bugs** `est:45m`
  - Why: S01–S03 built all backend and frontend surfaces but E2E tests only cover structural smoke (page loads, tabs switch). No test exercises a real research run, a real backtest, or a CTA handoff. The milestone's acceptance criteria (D017) require live connected-flow verification through the real entrypoints.
  - Files: `frontend/e2e/integration-flows.spec.ts` (new), plus any bug-fix files discovered during test runs
  - Do: Run baseline gates (pytest, build, e2e) to confirm green. Create `integration-flows.spec.ts` with 4–5 tests covering: (1) research lookback module run → result rendering, (2) research→backtest CTA handoff with URL param verification, (3) backtest execution with result view rendering, (4) grid search run → "Use best params" CTA link verification, (5) walk-forward run → stability verdict rendering. Use BTC-EUR + ETH-EUR pair via header selects (Mantine Select commit pattern: type → ArrowDown → Enter). Use `{ timeout: 30_000 }` for API-dependent assertions. Fix any integration bugs found.
  - Verify: `cd frontend && npm run test:e2e` — all existing + new tests pass
  - Done when: ≥4 new integration flow tests pass alongside all 22 existing E2E tests, proving the connected research→backtest→optimize flows work live on real cached data
  - Skill: `test`

- [ ] **T02: Final regression and M002 requirement closure** `est:20m`
  - Why: M002 can't close until requirement statuses reflect final integrated acceptance evidence. The E2E integration tests from T01 provide the proof that was deferred from S01–S03. Running full regression confirms no regressions from any bug fixes.
  - Files: `.gsd/REQUIREMENTS.md`, `.gsd/STATE.md`
  - Do: Run `uv run pytest tests/ -q` (expect 164 pass) and `cd frontend && npm run build` (expect clean) as final regression. Update R023 validation notes with final status. Update R008, R009, R010, R011, R012, R013, R014, R015, R022 validation notes to include S04 live integrated acceptance evidence. Write S04 summary.
  - Verify: `uv run pytest tests/ -q` — 164 passed; `cd frontend && npm run build` — clean; all M002 requirements reflect final acceptance
  - Done when: All 3 gates green, all M002-owned requirements updated with integrated acceptance proof, STATE.md updated

## Files Likely Touched

- `frontend/e2e/integration-flows.spec.ts` (new — primary deliverable)
- `.gsd/REQUIREMENTS.md` (requirement status updates)
- `.gsd/STATE.md` (milestone closure)
- Possible bug-fix files if integration tests reveal issues
