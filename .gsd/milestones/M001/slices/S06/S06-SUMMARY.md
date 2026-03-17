---
id: S06
parent: M001
milestone: M001
provides:
  - Searchable glossary page with 17 typed stat-arb terms, stable deep-link anchors, alias/definition search, and explicit empty-state handling
  - Academy steps 2-6 wired to shared glossary deep links matching the Dash anchor contract
  - Final live integration proof for glossary routes, Academy cross-links, and the Academy → Glossary → Deep Dive → Scanner → Academy route loop
  - Dashboard-shell hydration fix that removed Mantine SSR/client mismatch noise from the final dev-stack UAT
requires:
  - slice: S03
    provides: Academy step content surfaces that can host glossary links
  - slice: S04
    provides: Complete Academy steps 4-6 for final Academy cross-link and slider/runtime validation
  - slice: S05
    provides: Real Scanner and Deep Dive pages for the final cross-page integration loop
  - slice: S02
    provides: Shared app shell, header selectors, navigation, and dark theme
affects: []
key_files:
  - frontend/lib/glossary.ts
  - frontend/components/glossary/GlossaryLink.tsx
  - frontend/app/(dashboard)/glossary/page.tsx
  - frontend/components/academy/StepPriceComparison.tsx
  - frontend/components/academy/StepCorrelationVsCointegration.tsx
  - frontend/components/academy/StepCointegrationTest.tsx
  - frontend/components/academy/StepSpread.tsx
  - frontend/components/academy/StepZScoreSignals.tsx
  - frontend/app/(dashboard)/layout.tsx
  - .gsd/milestones/M001/slices/S06/S06-UAT.md
  - .gsd/milestones/M001/slices/S06/S06-ASSESSMENT.md
key_decisions:
  - D015 — mount-gate the dashboard AppShell in the client layout to eliminate Mantine-generated hydration mismatches during local dev UAT
  - Keep glossary data, slug generation, DOM ids, and href generation centralized in one typed frontend helper so Academy links cannot drift from glossary anchors
patterns_established:
  - Shared glossary contract pattern: dataset + getGlossarySlug()/getGlossaryId()/getGlossaryHref() live together and are reused across routes
  - Final-proof pattern: pass the static gate, exercise the real stack in the browser, capture exact routes/hash targets/alerts, then advance milestone proof from runtime evidence only
  - Cross-step glossary-link pattern: step-owned ReactNode copy uses the shared GlossaryLink helper while EducationalPanel stays generic
observability_surfaces:
  - /glossary results summary text, [data-glossary-card="true"] card markers, stable #glossary-{slug} anchors, and explicit empty-state copy
  - Browser URL hashes for Academy→Glossary links (correlation, cointegration, hedge ratio, ADF test, spread, mean reversion, stationarity, z-score)
  - Deep Dive success alert and Scanner summary alert during the final route loop
  - Clean final browser console/network buffers after the hydration fix
  - frontend/scripts/check-academy-glossary-links.mjs source-level regression check
  - .gsd/milestones/M001/slices/S06/S06-UAT.md as the authoritative live-runtime artifact
duration: ~5h across T01-T03
verification_result: passed
completed_at: 2026-03-17
---

# S06: Glossary + Polish + Integration Test

**Finished the last missing user-facing pieces for M001: a real searchable glossary, Academy cross-links into that glossary, and a clean final live integration pass across the full frontend shell.**

## What Happened

S06 closed the milestone in three tasks.

**T01 — glossary port:** The old Dash glossary contract was ported into `frontend/lib/glossary.ts` as one typed source of truth for all 17 terms, aliases, definitions, and slug/id generation. A reusable `GlossaryLink` helper was added, and `/glossary` was rebuilt as a real client-side page with search over term/alias/definition, visible aliases, stable anchored cards, and an explicit no-results state. Deep-link ergonomics were tightened with `scrollMarginTop` and card-level `data-*` markers.

**T02 — Academy cross-links:** Academy steps 2-6 were updated surgically to use the shared `GlossaryLink` helper in their mechanics/education copy, mirroring the original Dash placements instead of inventing new ones. The linked terms are: correlation, cointegration, hedge ratio, ADF test, spread, mean reversion, stationarity, and z-score. `EducationalPanel` stayed generic. A lightweight source-level regression check (`frontend/scripts/check-academy-glossary-links.mjs`) was added because the frontend has no installed component-test harness.

**T03 — final integration/UAT:** The full stack was run live and the final route loop was exercised: `Academy → Glossary → Deep Dive → Scanner → Academy`. During the first pass, the browser surfaced a real hydration mismatch in the dashboard shell caused by Mantine-generated runtime ids/classNames. The fix was to render the client dashboard shell only after mount in `frontend/app/(dashboard)/layout.tsx`. After rerunning the static gate and clearing browser buffers, the final happy-path pass was clean: glossary search and direct hashes worked, Academy links landed on the expected glossary cards, Deep Dive produced a real analysis success alert, Scanner produced a real batch summary alert, and the shared shell remained intact across routes with no console errors or failed requests.

## Verification

All planned slice-level checks passed.

**Static gate**
- ✅ `cd frontend && npx tsc --noEmit`
- ✅ `cd frontend && npm run build`
- ✅ Re-run after the hydration fix: `cd frontend && npx tsc --noEmit && npm run build`
- ✅ `cd frontend && node scripts/check-academy-glossary-links.mjs`

**Live runtime checks**
- ✅ `/glossary` renders all 17 terms by default
- ✅ Search verifies term, alias, and definition matching (`cointegration`, `beta`, `mean`)
- ✅ Empty state appears for unmatched queries with a clear reset action
- ✅ Direct hash routes land on visible cards:
  - `/glossary#glossary-cointegration`
  - `/glossary#glossary-z-score`
- ✅ Academy steps 2-6 click through to the expected glossary anchors for:
  - correlation
  - cointegration
  - hedge ratio
  - ADF test
  - spread
  - mean reversion
  - stationarity
  - z-score
- ✅ Final cross-page route loop `Academy → Glossary → Deep Dive → Scanner → Academy` completes without blank pages or dead states
- ✅ Shared header selectors remain visible across all four routes
- ✅ Deep Dive success alert renders after analyzing `BTC / ETH · 1h`
- ✅ Scanner batch run renders a summary alert and results table (`171` pairs in the final UAT run)
- ✅ Final browser diagnostics are clean: no console errors, no failed requests

## Requirements Advanced

- R004 — The React/Next frontend replacement moved from structurally complete to fully closed by live cross-page UAT on the real stack.
- R006 — The shared header selectors were proven visible across Academy, Glossary, Deep Dive, and Scanner; Deep Dive consumed the shared state while Scanner preserved its intentional page-local batch controls.
- R007 — Final route-loop UAT proved the dark shell remained consistent across pages with no blank states or broken navigation.
- R026 — The glossary and Academy cross-links are now fully delivered and live-verified.

## Requirements Validated

- R004 — Final live UAT closed the route loop on the running Next.js/FastAPI app and confirmed the active user-facing application no longer depends on Dash surfaces.
- R006 — Shared header pair/timeframe selectors remained visible across all key routes and powered Deep Dive end-to-end.
- R007 — Dark shell consistency and route integrity were proven live across the milestone surface.
- R026 — `/glossary` renders 17 terms, filters correctly by term/alias/definition, resolves direct hashes, and Academy steps 2-6 click through to the correct glossary anchors.

## New Requirements Surfaced

- none

## Requirements Invalidated or Re-scoped

- none

## Deviations

- Added a lightweight source regression check (`frontend/scripts/check-academy-glossary-links.mjs`) because the frontend has no installed component-test runner and the slice still needed durable link-wiring verification.
- The dashboard shell needed a mount-gating fix during final UAT to remove Mantine-generated hydration mismatch noise. This was a real runtime issue surfaced by the final pass, not speculative cleanup.

## Known Limitations

- The glossary and Academy link surfaces are covered by build checks, live browser verification, and the lightweight source script, but there is still no dedicated frontend component/integration test harness in the repo.
- Scanner intentionally keeps its own page-local batch controls; this is a deliberate exception to the otherwise shared header-driven pair workflow.

## Follow-ups

- None for M001. The planned milestone work is complete and live-verified.

## Files Created/Modified

- `frontend/lib/glossary.ts` — shared glossary dataset and canonical slug/id/href/search helpers
- `frontend/components/glossary/GlossaryLink.tsx` — reusable glossary deep-link helper
- `frontend/app/(dashboard)/glossary/page.tsx` — real searchable glossary page with stable anchors and empty-state UI
- `frontend/components/academy/StepPriceComparison.tsx` — glossary link for correlation
- `frontend/components/academy/StepCorrelationVsCointegration.tsx` — glossary links for correlation and cointegration
- `frontend/components/academy/StepCointegrationTest.tsx` — glossary links for cointegration, hedge ratio, and ADF test
- `frontend/components/academy/StepSpread.tsx` — glossary links for spread, mean reversion, and stationarity
- `frontend/components/academy/StepZScoreSignals.tsx` — glossary links for z-score and spread
- `frontend/scripts/check-academy-glossary-links.mjs` — lightweight source regression check for Academy glossary coverage
- `frontend/app/(dashboard)/layout.tsx` — mount-gated dashboard shell to remove Mantine hydration mismatch noise during dev UAT
- `.gsd/milestones/M001/slices/S06/S06-UAT.md` — final live integration proof
- `.gsd/milestones/M001/slices/S06/S06-ASSESSMENT.md` — slice closure assessment

## Forward Intelligence

### What the next slice should know
- M001 is functionally complete and has live proof across Academy, Glossary, Deep Dive, and Scanner. The next milestone can treat the frontend foundation as stable.
- The glossary contract now lives entirely in `frontend/lib/glossary.ts`; future links or glossary-powered UI should reuse that module rather than inventing new slugs or ids.
- Deep Dive and Academy already demonstrate the two main frontend computation patterns needed later: page-level cached fetches and client-side derived metrics from API-returned spread/series data.

### What's fragile
- Mantine AppShell SSR/client mismatches can reappear if future shell work reintroduces runtime-generated ids/classNames before mount. `frontend/app/(dashboard)/layout.tsx` is the guardrail.
- Glossary link integrity depends on the shared helper contract; avoid hard-coded `/glossary#...` strings in page copy.

### Authoritative diagnostics
- `.gsd/milestones/M001/slices/S06/S06-UAT.md` — canonical live-runtime evidence
- `/glossary` results summary text, hash routes, and `[data-glossary-card="true"]` markers
- `frontend/scripts/check-academy-glossary-links.mjs` — source-level check for required Academy link coverage
- Deep Dive `Analysis complete` alert and Scanner `Scan complete` alert during live verification

### What assumptions changed
- The final live pass surfaced a real Mantine hydration mismatch in the dashboard shell; the milestone needed one last runtime fix before the clean UAT evidence was trustworthy.
- Scanner remains the deliberate exception to fully shared pair control propagation: it reuses the shared coin universe but keeps page-local scan inputs for batch work.
