---
id: T02
parent: S06
milestone: M001
provides:
  - Academy steps 2-6 now use the shared GlossaryLink helper for the Dash-matched concept terms, with live-verified anchor navigation into /glossary.
key_files:
  - frontend/components/academy/StepPriceComparison.tsx
  - frontend/components/academy/StepCorrelationVsCointegration.tsx
  - frontend/components/academy/StepCointegrationTest.tsx
  - frontend/components/academy/StepSpread.tsx
  - frontend/components/academy/StepZScoreSignals.tsx
  - frontend/scripts/check-academy-glossary-links.mjs
  - .gsd/milestones/M001/slices/S06/tasks/T02-PLAN.md
key_decisions:
  - Kept EducationalPanel fully generic and wired glossary links only inside step-owned copy, using the T01 shared helper so href/hash generation cannot drift.
patterns_established:
  - Cross-step Academy glossary wiring pattern: mirror Dash term placement in step-local ReactNode copy and verify each rendered link against the canonical /glossary#glossary-{slug} target.
observability_surfaces:
  - browser URL hashes plus glossary card ids (#glossary-correlation, #glossary-cointegration, #glossary-hedge-ratio, #glossary-adf-test, #glossary-spread, #glossary-mean-reversion, #glossary-stationarity, #glossary-z-score)
  - frontend/scripts/check-academy-glossary-links.mjs
  - .gsd/milestones/M001/slices/S06/tasks/T02-PLAN.md Observability Impact section
duration: 1h15m
verification_result: passed
completed_at: 2026-03-17 16:35 CET
blocker_discovered: false
---

# T02: Wire Academy glossary links into steps 2-6 and close the remaining polish gaps

**Wired Academy steps 2-6 to the shared glossary helper and live-verified every planned Academy→Glossary hash target.**

## What Happened

I loaded the frontend-design skill, fixed the missing `## Observability Impact` block in `T02-PLAN.md`, then read the original Dash placements from `src/statistical_arbitrage/app/pages/learn.py` and mirrored them exactly in the React Academy steps.

Implementation stayed surgical:
- Step 2 now links `correlation`.
- Step 3 now links `correlation` and `cointegration`.
- Step 4 now links `cointegration`, `hedge ratio`, and `ADF test`.
- Step 5 now links `spread`, `mean reversion`, and `stationarity`.
- Step 6 now links `z-score` and `spread`.
- `EducationalPanel` was left unchanged.

I also added a small source-level regression check (`frontend/scripts/check-academy-glossary-links.mjs`) because the frontend currently has no installed component-test harness; it verifies the expected `GlossaryLink term="..."` coverage in steps 2-6 and asserts `EducationalPanel` still does not import `GlossaryLink`.

During verification I hit one implementation bug: `StepCointegrationTest.tsx` had a stray duplicated `); }` tail that caused the first typecheck/build to fail. I removed that exact trailing fragment, reran verification, and the build went green.

## Verification

Passed:
- `cd frontend && node scripts/check-academy-glossary-links.mjs`
- `cd frontend && npx tsc --noEmit && npm run build`

Live runtime verification passed against the real stack:
- Started API: `uv run python run_api.py`
- Started frontend: `cd frontend && npm run dev`
- Opened `http://localhost:3000/academy`
- Selected live pair context: `BTC` / `ETH` at `1h`
- Opened Academy steps 2-6, expanded `🔧 How It Works`, clicked each planned link, and asserted the final URL hash plus visible glossary card id:
  - Step 2: `correlation` → `/glossary#glossary-correlation`
  - Step 3: `Correlation` → `/glossary#glossary-correlation`
  - Step 3: `Cointegration` → `/glossary#glossary-cointegration`
  - Step 4: `cointegration` → `/glossary#glossary-cointegration`
  - Step 4: `hedge ratio` → `/glossary#glossary-hedge-ratio`
  - Step 4: `ADF test` → `/glossary#glossary-adf-test`
  - Step 5: `spread` → `/glossary#glossary-spread`
  - Step 5: `mean reversion` → `/glossary#glossary-mean-reversion`
  - Step 5: `stationarity` → `/glossary#glossary-stationarity`
  - Step 6: `z-score` → `/glossary#glossary-z-score`
  - Step 6: `spread` → `/glossary#glossary-spread`
- Browser assertions passed for every clicked hash target via `url_contains` + `selector_visible`.
- Final browser diagnostics were clean after clearing buffers: only dev-mode info logs (`React DevTools`, `HMR connected`), with no retained failed requests.

Partial slice-level verification completed in this task:
- The slice’s typecheck/build checks passed.
- The Academy→Glossary live link checks passed.
- Final cross-route UAT artifact updates and requirement proof updates remain for T03.

## Diagnostics

Future agents can inspect this task via:
- `frontend/scripts/check-academy-glossary-links.mjs` for source-level coverage expectations.
- `frontend/components/academy/Step*.tsx` for the actual `GlossaryLink` placements.
- Browser selectors and anchors:
  - `a[href='/glossary#glossary-correlation']`
  - `a[href='/glossary#glossary-cointegration']`
  - `a[href='/glossary#glossary-hedge-ratio']`
  - `a[href='/glossary#glossary-adf-test']`
  - `a[href='/glossary#glossary-spread']`
  - `a[href='/glossary#glossary-mean-reversion']`
  - `a[href='/glossary#glossary-stationarity']`
  - `a[href='/glossary#glossary-z-score']`
- Glossary card ids:
  - `#glossary-correlation`
  - `#glossary-cointegration`
  - `#glossary-hedge-ratio`
  - `#glossary-adf-test`
  - `#glossary-spread`
  - `#glossary-mean-reversion`
  - `#glossary-stationarity`
  - `#glossary-z-score`

## Deviations

- Added `frontend/scripts/check-academy-glossary-links.mjs` as a lightweight regression check even though the task plan did not name a test file, because the frontend has no existing installed component-test runner and the task instructions required tests/verification to be part of execution.
- Fixed the missing `## Observability Impact` section in `.gsd/milestones/M001/slices/S06/tasks/T02-PLAN.md` before implementation, per the unit pre-flight instruction.

## Known Issues

- Browser history/back navigation did not retain a previous-page entry for the Academy→Glossary jumps in this dev session, so return navigation during UAT was driven through the sidebar `Academy` link instead of `browser_go_back`. The actual hash navigation behavior itself passed.
- The remaining slice-level artifact updates (`S06-UAT.md`, `REQUIREMENTS.md`, roadmap/assessment closure) are still pending for T03.

## Files Created/Modified

- `frontend/components/academy/StepPriceComparison.tsx` — linked the mechanics-panel `correlation` term with the shared glossary helper.
- `frontend/components/academy/StepCorrelationVsCointegration.tsx` — linked `correlation` and `cointegration` in the mechanics copy.
- `frontend/components/academy/StepCointegrationTest.tsx` — linked `cointegration`, `hedge ratio`, and `ADF test`, and removed a stray duplicated file tail found during typecheck.
- `frontend/components/academy/StepSpread.tsx` — linked `spread`, `mean reversion`, and `stationarity` in the mechanics panel.
- `frontend/components/academy/StepZScoreSignals.tsx` — linked `z-score` and `spread` in the mechanics panel.
- `frontend/scripts/check-academy-glossary-links.mjs` — added a lightweight source regression check for required Academy glossary links and `EducationalPanel` genericity.
- `.gsd/milestones/M001/slices/S06/tasks/T02-PLAN.md` — added the missing `Observability Impact` section required by the unit pre-flight.
