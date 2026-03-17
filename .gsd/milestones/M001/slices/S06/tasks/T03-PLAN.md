---
estimated_steps: 7
estimated_files: 4
---

# T03: Run the final live integration pass and update milestone proof artifacts

**Slice:** S06 — Glossary + Polish + Integration Test
**Milestone:** M001

## Description

Close M001 with runtime proof, not assumptions. After T01 and T02 ship the glossary and Academy links, this task runs the real stack, executes the final cross-page UAT, captures evidence, and updates requirement/roadmap artifacts so the milestone can truthfully be considered done.

**Relevant skills to load:** `test`

## Steps

1. Run the static verification gate first: `cd frontend && npx tsc --noEmit` and `cd frontend && npm run build`. Do not start UAT until both pass.
2. Start the real backend and frontend (`uv run python run_api.py` and `cd frontend && npm run dev`) and use the browser to validate the glossary page: full render, search behavior, no-results state, and anchored routes like `/glossary#glossary-cointegration` and `/glossary#glossary-z-score`.
3. Validate Academy integration by opening steps 2-6, clicking the linked terms, and confirming each one lands on the correct glossary anchor for correlation, cointegration, hedge ratio, ADF test, spread, mean reversion, stationarity, and z-score.
4. Validate the full route loop Academy → Glossary → Deep Dive → Scanner → Academy, confirming the shared shell stays intact, the header pair/timeframe selectors remain visible across pages, Scanner continues to use its intentional page-local scan controls, and no page falls into a blank or dead state.
5. Inspect browser diagnostics on the happy path: no console errors, no failed requests, and expected in-page success surfaces still present (e.g. Deep Dive analysis success alert, Scanner summary alert when a scan is run).
6. Record all concrete evidence, including exact routes, terms clicked, and pass/fail observations, in `.gsd/milestones/M001/slices/S06/S06-UAT.md`.
7. Update `.gsd/REQUIREMENTS.md`, `.gsd/milestones/M001/M001-ROADMAP.md`, and `.gsd/milestones/M001/slices/S06/S06-ASSESSMENT.md` with the final status/proof. At minimum, R026 should no longer remain deferred if the glossary and Academy cross-links pass live verification.

## Must-Haves

- [ ] Live evidence exists for glossary search, glossary anchors, Academy cross-links, and cross-page navigation.
- [ ] Browser diagnostics are checked on the happy path instead of inferred.
- [ ] Requirement/roadmap artifacts reflect the actual runtime proof gathered in this task.

## Verification

- `cd frontend && npx tsc --noEmit && npm run build`
- With the real stack running, complete the browser UAT above and confirm the resulting `S06-UAT.md` and requirement updates cite concrete runtime evidence rather than generic statements.

## Observability Impact

- Signals added/changed: the task does not add new runtime signals, but it must explicitly validate existing ones — glossary empty-state text, URL hashes, Deep Dive success alert, Scanner summary alert, and clean console/network buffers.
- How a future agent inspects this: read `.gsd/milestones/M001/slices/S06/S06-UAT.md`, open the recorded routes in the browser, and compare the requirement validation text in `.gsd/REQUIREMENTS.md`.
- Failure state exposed: any remaining dead link, broken hash, stale header state, blank page, console error, or failed request is documented as a specific failing checkpoint in the UAT artifact.

## Inputs

- `.gsd/milestones/M001/slices/S06/tasks/T01-PLAN.md` and `.gsd/milestones/M001/slices/S06/tasks/T02-PLAN.md` — define the glossary and Academy wiring that must be proven live.
- `.gsd/REQUIREMENTS.md` — current statuses for R004 and R026, plus any supporting requirement traceability that should be advanced.
- `.gsd/milestones/M001/M001-ROADMAP.md` — slice status and milestone-definition-of-done surface to update after proof.
- `frontend/app/(dashboard)/academy/page.tsx`, `frontend/app/(dashboard)/glossary/page.tsx`, `frontend/app/(dashboard)/deep-dive/page.tsx`, `frontend/app/(dashboard)/scanner/page.tsx` — runtime entrypoints to exercise during UAT.

## Expected Output

- `.gsd/milestones/M001/slices/S06/S06-UAT.md` — concrete live verification record for glossary, Academy links, and cross-page navigation.
- `.gsd/REQUIREMENTS.md` — updated status/validation text reflecting final proof for R026 and any fully closed supporting requirements.
- `.gsd/milestones/M001/M001-ROADMAP.md` — S06 marked complete if verification passes.
- `.gsd/milestones/M001/slices/S06/S06-ASSESSMENT.md` — concise slice closure artifact summarizing whether the milestone is now end-to-end usable.
