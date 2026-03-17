---
estimated_steps: 7
estimated_files: 4
---

# T01: Port the glossary contract and replace the glossary stub with the real searchable page

**Slice:** S06 — Glossary + Polish + Integration Test
**Milestone:** M001

## Description

Build the missing React glossary route first, using the old Dash glossary as the authoritative source of truth for both content and deep-link behavior. This task is the foundation for the rest of S06: Academy links cannot be wired safely until the frontend has one shared term dataset and one shared slug/id helper.

**Relevant skills to load:** `frontend-design`

## Steps

1. Read `src/statistical_arbitrage/app/pages/glossary.py` and port the full 17-term glossary dataset into a new typed frontend module, preserving term names, aliases, definitions, and any display metadata needed on the page.
2. In that same shared frontend module, add one canonical slug/id helper that matches the Dash anchor contract exactly: lowercase the term, replace spaces and `/` with `-`, and prefix ids with `glossary-`.
3. Create a small reusable `GlossaryLink` helper/component that builds `/glossary#glossary-{slug}` hrefs from the shared helper instead of duplicating string logic in Academy steps.
4. Replace `frontend/app/(dashboard)/glossary/page.tsx` with a `'use client'` searchable glossary implementation inside the existing Mantine dark theme — include page intro copy, search input, visible aliases, per-term cards, and stable `id` attributes on every rendered glossary card.
5. Implement client-side filtering over `term`, `aka`, and `definition`, but keep the initial render unfiltered so deep links always have a visible target before the user types.
6. Add a clear no-results state for unmatched searches without breaking the normal anchored-card behavior.
7. Finish with typecheck/build plus a live browser check for full render, search behavior, and anchored deep links.

## Must-Haves

- [ ] The frontend has one shared glossary dataset and one shared slug/id helper matching the Dash contract.
- [ ] `/glossary` renders the full glossary with search over term, alias, and definition.
- [ ] `/glossary#glossary-cointegration` resolves to the correct visible card.
- [ ] A reusable `GlossaryLink` surface exists for Academy steps to consume in T02.

## Verification

- `cd frontend && npx tsc --noEmit && npm run build`
- Run the app, open `/glossary`, confirm 17 term cards render by default, search for `cointegration`, `beta`, and `mean`, and confirm `/glossary#glossary-cointegration` lands on the correct card.

## Inputs

- `src/statistical_arbitrage/app/pages/glossary.py` — authoritative glossary terms, aliases, and Dash anchor behavior to preserve.
- `frontend/app/(dashboard)/glossary/page.tsx` — current stub route to replace.
- `frontend/components/layout/Header.tsx` — reference for existing Mantine shell styling and page-level tone.
- `frontend/lib/theme.ts` — existing dark-theme palette/patterns; stay inside this system rather than inventing a new one.

## Expected Output

- `frontend/lib/glossary.ts` — typed glossary data plus shared slug/id helpers.
- `frontend/components/glossary/GlossaryLink.tsx` — reusable helper for Academy cross-links.
- `frontend/app/(dashboard)/glossary/page.tsx` — real client-side glossary page with search, empty-state copy, and stable anchored cards.

## Observability Impact

- Runtime signals: the `/glossary` route now exposes a visible search field, 17 rendered glossary cards on the default view, stable `id="glossary-{slug}"` anchors on each card, and an explicit no-results state when filtering removes all matches.
- Inspection surfaces: future agents can verify the task via the shared `frontend/lib/glossary.ts` dataset/helpers, the rendered DOM ids on glossary cards, the browser URL hash after visiting deep links like `/glossary#glossary-cointegration`, and the live card count/filter results in the page UI.
- Failure visibility: anchor-contract regressions will surface as broken or missing card ids / wrong URL hashes, while filtering regressions will surface as incorrect match sets or a missing no-results message for unmatched queries.
