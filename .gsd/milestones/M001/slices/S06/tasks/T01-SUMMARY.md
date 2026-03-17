---
id: T01
parent: S06
milestone: M001
provides:
  - Shared typed glossary data and Dash-compatible slug/id helpers for frontend deep links
  - Real searchable `/glossary` route with 17 rendered term cards, alias visibility, and empty-state handling
  - Reusable `GlossaryLink` component for Academy cross-links in T02
key_files:
  - frontend/lib/glossary.ts
  - frontend/components/glossary/GlossaryLink.tsx
  - frontend/app/(dashboard)/glossary/page.tsx
  - .gsd/milestones/M001/slices/S06/tasks/T01-PLAN.md
key_decisions:
  - Kept the old Dash glossary contract centralized in `frontend/lib/glossary.ts` so data, slug generation, DOM ids, and future Academy links all resolve from one source of truth
  - Added `scrollMarginTop` plus stable `data-glossary-card`/`id` attributes on glossary cards so hash targets remain visible beneath the fixed dashboard header and are easy to inspect in browser automation
patterns_established:
  - Shared cross-route content contract pattern: dataset + `getGlossarySlug()` + `getGlossaryId()` + `getGlossaryHref()` live together in one typed helper module
  - Searchable dashboard content page pattern: static full initial render for deep links, client-side filtering via shared matcher, and explicit empty-state copy when no cards match
observability_surfaces:
  - `/glossary` search input, results summary text, `[data-glossary-card="true"]` card markers, `id="glossary-{slug}"` anchors, no-results copy, clean browser console/network logs, and visible URL hashes after deep-link navigation
duration: 55m
verification_result: passed
completed_at: 2026-03-17
blocker_discovered: false
---

# T01: Port the glossary contract and replace the glossary stub with the real searchable page

**Ported the Dash glossary into a shared typed frontend contract and shipped the real searchable `/glossary` route with stable deep-link anchors.**

## What Happened

I read the Dash glossary source in `src/statistical_arbitrage/app/pages/glossary.py` and ported all 17 terms into a new shared frontend module at `frontend/lib/glossary.ts`, preserving the exact term names, alias strings, and definitions.

Implementation details:
- Added `GLOSSARY_TERMS` plus shared helpers:
  - `getGlossarySlug()`
  - `getGlossaryId()`
  - `getGlossaryHref()`
  - `getGlossaryAliases()`
  - `glossaryMatchesQuery()`
- Preserved the Dash anchor contract exactly: lowercase the term, replace spaces and `/` with `-`, then prefix with `glossary-`.
- Added `frontend/components/glossary/GlossaryLink.tsx` so Academy steps can link to glossary anchors without hand-rolled hash strings in T02.
- Replaced the placeholder `frontend/app/(dashboard)/glossary/page.tsx` with a real `'use client'` searchable glossary page inside the existing Mantine dark shell.
- The new page renders all 17 terms by default, shows aliases as visible badges, filters on term/alias/definition, exposes a clear empty state, and keeps stable card ids on every rendered entry.
- Added `scrollMarginTop` to the cards so `/glossary#glossary-{slug}` targets remain visible below the fixed AppShell header.
- Added `data-glossary-card="true"` and `data-glossary-term` attributes to make browser verification and future debugging straightforward.

I also patched `.gsd/milestones/M001/slices/S06/tasks/T01-PLAN.md` to add the missing `## Observability Impact` section before implementation, per the unit pre-flight requirement.

## Verification

Passed:
- `cd frontend && npx tsc --noEmit && npm run build`

Real runtime verification with background servers:
- API: `uv run python run_api.py`
- Frontend: `cd frontend && npm run dev`

Browser verification at `http://localhost:3000/glossary`:
- Confirmed 17 glossary cards render by default via selector count on `[data-glossary-card="true"]`
- Searched `cointegration` and confirmed the `#glossary-cointegration` card is visible
- Searched `beta` and confirmed alias search resolves to `Hedge Ratio`
- Searched `mean` and confirmed definition-text search returns matching glossary content including `Mean Reversion`
- Searched an unmatched term (`zzzzzzzz`) and confirmed the explicit `No glossary matches` empty state plus clear-search action
- Cleared search and confirmed the full 17-term view returns
- Navigated to `http://localhost:3000/glossary#glossary-cointegration`
  - URL hash assertion passed
  - `#glossary-cointegration` visibility assertion passed
  - Browser evaluation confirmed the target card was within the viewport (`top: 91.86`, `withinViewport: true`)
- Browser diagnostics passed:
  - `no_console_errors`
  - `no_failed_requests`

Slice-level status after this task:
- `cd frontend && npx tsc --noEmit` — passed
- `cd frontend && npm run build` — passed
- `/glossary` live verification from the slice plan — passed
- `/academy` glossary-link verification — not yet implemented in this task (T02)
- final cross-page integration/UAT artifact updates — not yet run in this task (T03)

## Diagnostics

Future agents can inspect this task via:
- `frontend/lib/glossary.ts` for the canonical dataset and slug/id/href contract
- `frontend/components/glossary/GlossaryLink.tsx` for the shared Academy-facing link helper
- `/glossary` results summary text (`Showing all 17...` / filtered counts)
- DOM selectors:
  - `[data-glossary-card="true"]`
  - `#glossary-cointegration`
  - other `#glossary-{slug}` ids derived from `getGlossaryId()`
- The explicit no-results copy when a search matches nothing
- Browser URL hashes plus clean console/network logs on the happy path

## Deviations

- No product-scope deviations from the task plan.
- I added card-level `data-*` markers and `scrollMarginTop` as small implementation details to improve inspectability and deep-link visibility under the fixed header.

## Known Issues

- No known issues in the implemented glossary flow.
- There is still no dedicated frontend unit/integration test harness in `frontend/`; this task used the plan’s required typecheck/build plus explicit live browser assertions for verification.

## Files Created/Modified

- `frontend/lib/glossary.ts` — added the shared 17-term glossary dataset plus canonical slug/id/href/search helpers.
- `frontend/components/glossary/GlossaryLink.tsx` — added a reusable glossary deep-link component for Academy copy.
- `frontend/app/(dashboard)/glossary/page.tsx` — replaced the placeholder with the real searchable glossary page, visible alias badges, stable anchors, and empty-state UI.
- `.gsd/milestones/M001/slices/S06/tasks/T01-PLAN.md` — added the missing `Observability Impact` section required by pre-flight.
- `.gsd/milestones/M001/slices/S06/S06-PLAN.md` — marked T01 complete.
