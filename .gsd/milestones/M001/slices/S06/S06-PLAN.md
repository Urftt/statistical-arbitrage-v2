# S06: Glossary + Polish + Integration Test

**Goal:** Ship the real glossary, wire Academy educational-panel cross-links into it, and finish the final integration/polish pass so M001 works as one coherent React application instead of a set of isolated pages.
**Demo:** Open `/academy`, click glossary terms inside steps 2-6, land on the correct anchored glossary card, use `/glossary` search to filter terms, then navigate Academy → Glossary → Deep Dive → Scanner → Academy with the shared shell, header selectors, and dark theme all staying intact.

## Must-Haves

- Shared glossary data + slug helpers preserve the Dash anchor contract (`#glossary-{slug}`), and `/glossary` renders the full 17-term searchable glossary with a clear empty-result state.
- Academy steps 2-6 contain clickable glossary links in the documented concept callouts, and those links resolve to visible glossary cards without blank or broken states.
- Final integration proof covers route flow, shared header/sidebar behavior, and dark-theme consistency across Academy, Glossary, Deep Dive, and Scanner.
- Requirement evidence is updated so R026 is no longer deferred once the glossary and cross-link behavior are proven live.

## Proof Level

- This slice proves: final-assembly
- Real runtime required: yes
- Human/UAT required: yes

## Verification

- `cd frontend && npx tsc --noEmit`
- `cd frontend && npm run build`
- Run the real stack (`uv run python run_api.py` and `cd frontend && npm run dev`), then verify `/glossary` shows all 17 terms, searches term/alias/definition correctly, and anchored URLs like `/glossary#glossary-cointegration` and `/glossary#glossary-z-score` land on the correct cards.
- In `/academy`, verify glossary links exist in steps 2-6 and clicking them navigates to the correct glossary anchors for: correlation, cointegration, hedge ratio, ADF test, spread, mean reversion, stationarity, and z-score.
- Verify the cross-page path Academy → Glossary → Deep Dive → Scanner → Academy with no blank states, broken navigation, or inconsistent dark-theme styling; confirm the shared header pair/timeframe controls remain visible across routes while Scanner keeps its intentional page-local scan controls.
- Capture final live evidence in `.gsd/milestones/M001/slices/S06/S06-UAT.md` and update `.gsd/REQUIREMENTS.md` with the results for R026 and any supporting requirements fully proven by the run.

## Observability / Diagnostics

- Runtime signals: glossary empty-state copy, visible URL hashes after Academy link clicks, Deep Dive success alert, Scanner summary alert, and sidebar active-route state.
- Inspection surfaces: browser URL + hash, `/glossary` search input and rendered cards, header pair/timeframe selectors, browser console/network logs, and the recorded `S06-UAT.md` artifact.
- Failure visibility: broken glossary wiring shows up as wrong hashes, missing card ids, empty/incorrect search results, dead route transitions, or console/network errors during navigation.
- Redaction constraints: public market-data only; do not record secret values or env contents if local tooling emits setup warnings.

## Integration Closure

- Upstream surfaces consumed: `frontend/components/academy/*` step components from S03/S04, `EducationalPanel`, `frontend/app/(dashboard)/glossary/page.tsx`, `frontend/components/layout/{Header,Sidebar}.tsx`, `frontend/app/(dashboard)/{academy,deep-dive,scanner}/page.tsx`, and the Dash source contracts in `src/statistical_arbitrage/app/pages/{glossary.py,learn.py}`.
- New wiring introduced in this slice: shared frontend glossary data/slug utilities, reusable Academy-to-glossary links, the real glossary route, and final milestone UAT/requirement proof.
- What remains before the milestone is truly usable end-to-end: nothing, if this slice’s verification passes.

## Tasks

- [x] **T01: Port the glossary contract and replace the glossary stub with the real searchable page** `est:45m`
  - Why: R026 cannot be validated until the React app has a real glossary route backed by one authoritative term list and anchor/slug contract.
  - Files: `frontend/lib/glossary.ts`, `frontend/components/glossary/GlossaryLink.tsx`, `frontend/app/(dashboard)/glossary/page.tsx`, `src/statistical_arbitrage/app/pages/glossary.py`
  - Do: Port the 17-term Dash glossary dataset into a typed frontend module, add one shared slug/id helper that exactly preserves the old `glossary-{slug}` behavior (lowercase, spaces/slashes → hyphens), add a tiny reusable glossary-link helper that consumes the same helper, and replace the placeholder glossary route with a client-side searchable page that filters on term/alias/definition, renders all terms by default, shows stable card ids for deep links, and exposes an explicit no-results state inside the existing Mantine dark theme.
  - Verify: `cd frontend && npx tsc --noEmit && npm run build`; live check `/glossary`, search for `cointegration`, `beta`, and `mean`, then open `/glossary#glossary-cointegration` and confirm the correct card is visible.
  - Done when: the glossary page renders the full dataset, search behaves like the Dash version, and the shared slug helper is ready for Academy links.

- [x] **T02: Wire Academy glossary links into steps 2-6 and close the remaining polish gaps** `est:50m`
  - Why: The glossary page alone does not satisfy S06 — the Academy must link into it cleanly, and this is the moment to fix any focused consistency issues discovered while wiring those routes together.
  - Files: `frontend/components/academy/StepPriceComparison.tsx`, `frontend/components/academy/StepCorrelationVsCointegration.tsx`, `frontend/components/academy/StepCointegrationTest.tsx`, `frontend/components/academy/StepSpread.tsx`, `frontend/components/academy/StepZScoreSignals.tsx`, `frontend/components/glossary/GlossaryLink.tsx`, `src/statistical_arbitrage/app/pages/learn.py`
  - Do: Follow the Dash `learn.py` glossary-link placements exactly — Step 2: correlation; Step 3: correlation + cointegration; Step 4: cointegration + hedge ratio + ADF test; Step 5: spread + mean reversion + stationarity; Step 6: z-score + spread. Use the shared glossary helper so hashes cannot drift, keep `EducationalPanel` API unchanged, and make only focused polish fixes needed to keep link styling, spacing, route affordances, and dark-theme consistency solid across Academy, Glossary, Header, and Sidebar surfaces.
  - Verify: `cd frontend && npx tsc --noEmit && npm run build`; live check each Academy step 2-6 for the expected linked terms and confirm clicking them lands on the correct glossary anchor without broken layout.
  - Done when: all planned Academy glossary links are live, hash-stable, and visually integrated with the existing UI.

- [ ] **T03: Run the final live integration pass and update milestone proof artifacts** `est:35m`
  - Why: S06 is the final assembly slice for M001, so completion depends on live end-to-end evidence and updated requirement traceability, not just merged UI code.
  - Files: `.gsd/milestones/M001/slices/S06/S06-UAT.md`, `.gsd/REQUIREMENTS.md`, `.gsd/milestones/M001/M001-ROADMAP.md`, `.gsd/milestones/M001/slices/S06/S06-ASSESSMENT.md`
  - Do: Run typecheck/build, launch the API and frontend, and perform the final browser UAT across glossary search/anchors, Academy link-outs, Academy → Glossary → Deep Dive → Scanner → Academy navigation, header/sidebar persistence, and dark-theme consistency. Record concrete evidence in `S06-UAT.md`, then update requirement proof/statuses (at minimum R026, and any supporting requirements fully closed by the evidence) plus the roadmap/slice assessment to reflect the finished milestone state.
  - Verify: `cd frontend && npx tsc --noEmit && npm run build`; live runtime checks with browser assertions for correct URL/hash navigation plus clean console/network on the happy path.
  - Done when: the UAT artifact contains concrete pass evidence, requirement docs reflect the proof, and milestone M001 no longer has an unproven S06 integration gap.

## Files Likely Touched

- `frontend/lib/glossary.ts`
- `frontend/components/glossary/GlossaryLink.tsx`
- `frontend/app/(dashboard)/glossary/page.tsx`
- `frontend/components/academy/StepPriceComparison.tsx`
- `frontend/components/academy/StepCorrelationVsCointegration.tsx`
- `frontend/components/academy/StepCointegrationTest.tsx`
- `frontend/components/academy/StepSpread.tsx`
- `frontend/components/academy/StepZScoreSignals.tsx`
- `.gsd/milestones/M001/slices/S06/S06-UAT.md`
- `.gsd/REQUIREMENTS.md`
- `.gsd/milestones/M001/M001-ROADMAP.md`
- `.gsd/milestones/M001/slices/S06/S06-ASSESSMENT.md`
