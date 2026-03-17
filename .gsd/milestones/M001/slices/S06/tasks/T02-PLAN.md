---
estimated_steps: 6
estimated_files: 7
---

# T02: Wire Academy glossary links into steps 2-6 and close the remaining polish gaps

**Slice:** S06 — Glossary + Polish + Integration Test
**Milestone:** M001

## Description

Connect the completed glossary into the Academy without changing the established Academy architecture. The Academy already supports rich `ReactNode` content inside `EducationalPanel`, so this task should be surgical: replace the documented concept terms with shared `GlossaryLink` usage in steps 2-6, then make only the focused polish fixes needed to keep the cross-page experience cohesive.

**Relevant skills to load:** `frontend-design`

## Steps

1. Read `src/statistical_arbitrage/app/pages/learn.py` and mirror the original glossary-link placements instead of inventing new ones.
2. Update `StepPriceComparison.tsx` so the mechanics panel links `correlation`.
3. Update `StepCorrelationVsCointegration.tsx` so the mechanics panel links `correlation` and `cointegration`.
4. Update `StepCointegrationTest.tsx`, `StepSpread.tsx`, and `StepZScoreSignals.tsx` so they use the shared `GlossaryLink` helper for these exact terms: Step 4 → `cointegration`, `hedge ratio`, `ADF test`; Step 5 → `spread`, `mean reversion`, `stationarity`; Step 6 → `z-score`, `spread`.
5. Keep `EducationalPanel` unchanged; if small visual issues appear while wiring links (link color contrast, spacing, inline wrapping, anchor affordances, sidebar/header active-state inconsistencies), fix them in the narrowest file that owns the problem without broad redesign.
6. Finish with typecheck/build and a live browser pass through Academy steps 2-6 to confirm every planned glossary link is clickable and lands on the correct glossary anchor.

## Must-Haves

- [ ] Academy steps 2-6 contain the documented glossary links and all links share the same slug logic from T01.
- [ ] `EducationalPanel` remains a generic container; the slice does not fork its API just to support glossary links.
- [ ] Link styling and route transitions stay visually consistent with the existing dark theme.

## Verification

- `cd frontend && npx tsc --noEmit && npm run build`
- In the running app, open `/academy`, visit steps 2-6, click each linked term, and confirm the browser lands on the correct `/glossary#glossary-*` target without broken layout or dead navigation.

## Inputs

- `.gsd/milestones/M001/slices/S06/tasks/T01-PLAN.md` — glossary contract and helper created in the prior task.
- `frontend/components/glossary/GlossaryLink.tsx` — shared link helper to reuse, not duplicate.
- `src/statistical_arbitrage/app/pages/learn.py` — authoritative placement for Academy glossary links.
- `frontend/components/academy/StepPriceComparison.tsx` — Step 2 mechanics text.
- `frontend/components/academy/StepCorrelationVsCointegration.tsx` — Step 3 mechanics text.
- `frontend/components/academy/StepCointegrationTest.tsx` — Step 4 educational content.
- `frontend/components/academy/StepSpread.tsx` and `frontend/components/academy/StepZScoreSignals.tsx` — Steps 5-6 educational content.

## Expected Output

- `frontend/components/academy/StepPriceComparison.tsx` — mechanics panel contains a shared glossary link for correlation.
- `frontend/components/academy/StepCorrelationVsCointegration.tsx` — mechanics panel links correlation and cointegration.
- `frontend/components/academy/StepCointegrationTest.tsx` — educational text links cointegration, hedge ratio, and ADF test.
- `frontend/components/academy/StepSpread.tsx` — educational text links spread, mean reversion, and stationarity.
- `frontend/components/academy/StepZScoreSignals.tsx` — educational text links z-score and spread.
- Any narrowly scoped UI-owner file touched for polish — only if needed to preserve visual consistency while adding the links.

## Observability Impact

- Changed signals: Academy mechanics/education copy in steps 2-6 now exposes clickable glossary anchors that should update the browser URL to `/glossary#glossary-*` for the linked term.
- Inspection path for future agents: inspect `frontend/components/academy/StepPriceComparison.tsx`, `StepCorrelationVsCointegration.tsx`, `StepCointegrationTest.tsx`, `StepSpread.tsx`, and `StepZScoreSignals.tsx` for `GlossaryLink` usage; verify runtime behavior from `/academy` by clicking links and confirming the resulting `/glossary#glossary-{slug}` hash plus the presence of the matching `[data-glossary-card="true"]` card id.
- Failure visibility: broken wiring will show up as missing inline links, wrong hashes/slugs, navigation that stays on `/academy`, glossary loads without scrolling to the intended card, or dark-theme regressions such as unreadable link styling or broken inline wrapping in educational copy.
