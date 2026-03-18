---
estimated_steps: 4
estimated_files: 3
---

# T02: Final regression and M002 requirement closure

**Slice:** S04 — Workspace integration and live acceptance closure
**Milestone:** M002

## Description

With the E2E integration flow tests passing from T01, M002 now has proof that the full Research → Backtest → Optimize workspace works end-to-end on real cached data through the real Next.js and FastAPI entrypoints. This task runs the final regression gates and updates all M002-owned requirement statuses with integrated acceptance evidence, closing the milestone.

## Steps

1. **Run the 3 final regression gates** and record results:
   - `uv run pytest tests/ -q` — expect 164 passed, 0 failed
   - `cd frontend && npm run build` — expect clean compile
   - `cd frontend && npm run test:e2e` — expect all tests pass (22 existing + T01's new tests)

2. **Update requirement statuses in `.gsd/REQUIREMENTS.md`:**

   For **R023** (data quality validation): Update validation notes to reflect final S04 status. R023 remains active because missing-candle gap detection was not implemented in M002 — the S01 validation notes already document this gap. Add a note that S04 confirmed the existing preflight runs successfully in the live E2E flow.

   For the already-validated M002 requirements, append S04 integrated acceptance evidence to their validation fields:
   - **R008** — append: "S04: Full integrated acceptance — research modules run live on cached BTC+ETH data through real Next.js/FastAPI entrypoints, with E2E tests proving result rendering and takeaway banners."
   - **R009** — append: "S04: Live backtest execution verified E2E on cached data — equity curve, trade log, and metrics render through the real entrypoints."
   - **R010** — append: "S04: Metrics rendering verified in live E2E backtest flow."
   - **R011** — append: "S04: Grid search runs live E2E on real pair data, heatmap renders, and 'Use best params' CTA hands off to /backtest with correct URL params."
   - **R012** — append: "S04: Overfitting detection active in live E2E backtest and grid search flows — warnings render when triggered."
   - **R013** — append: "S04: Look-ahead safety verified through the live backtest execution path in E2E."
   - **R014** — append: "S04: Walk-forward runs live E2E with stability verdict rendering confirmed."
   - **R015** — append: "S04: Honest-reporting footer verified in live E2E backtest flow. Full transparency chain confirmed across research, backtest, and optimization surfaces."
   - **R022** — append: "S04: Full visibility chain confirmed in live E2E — Academy teaches, research shows evidence, backtest shows assumptions, optimization shows robustness."

3. **Update `.gsd/STATE.md`** to reflect:
   - S04 complete
   - M002 milestone done (all 4 slices complete)
   - Phase: executing (or done if this was the last action)
   - Next action: Write S04 summary

4. **Commit** all changes: `git add -A && git commit -m "docs(S04): final regression and M002 requirement closure"`

## Must-Haves

- [ ] All 3 regression gates pass (pytest 164, build clean, E2E all pass)
- [ ] R008–R015, R022 validation notes updated with S04 integrated acceptance evidence
- [ ] R023 notes updated with S04 status
- [ ] STATE.md reflects S04 complete and M002 done

## Verification

- `uv run pytest tests/ -q` — 164 passed, 0 failed
- `cd frontend && npm run build` — compiles clean
- `.gsd/REQUIREMENTS.md` contains "S04" in validation notes for R008–R015 and R022
- `.gsd/STATE.md` shows M002 complete

## Observability Impact

This task is documentation-only (requirement closure and state updates). No new runtime signals are introduced.

- **Inspection:** `.gsd/REQUIREMENTS.md` — grep for "S04:" in validation fields to confirm all M002 requirements have integrated acceptance evidence.
- **Inspection:** `.gsd/STATE.md` — check that M002 is marked complete and S04 is done.
- **Failure state:** If regression gates fail, the task cannot close. Re-run individual gates to isolate: `uv run pytest tests/ -q`, `cd frontend && npm run build`, `cd frontend && npm run test:e2e`.

## Inputs

- T01 completed: E2E integration flow tests passing, any bug fixes already committed
- `.gsd/REQUIREMENTS.md` — current requirement statuses (preloaded in slice context above)
- `.gsd/STATE.md` — current state

## Expected Output

- `.gsd/REQUIREMENTS.md` — R008–R015, R022, R023 validation notes updated with S04 evidence
- `.gsd/STATE.md` — M002 marked complete, S04 done
- Clean git commit with closure changes
