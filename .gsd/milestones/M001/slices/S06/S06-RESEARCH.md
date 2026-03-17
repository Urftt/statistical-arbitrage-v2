# M001/S06 — Research

**Date:** 2026-03-17

## Summary

S06 is a targeted frontend integration slice, not a new architecture slice. The primary owned requirement is **R026** (searchable glossary with Academy cross-links). It also supports final proof for **R004** (React frontend replacement), **R006** (header pair/timeframe propagation across pages), and **R007** (consistent dark-theme polish). The main implementation gap is straightforward: `frontend/app/(dashboard)/glossary/page.tsx` is still a stub, while the old Dash app already contains the full 17-term glossary dataset, the search/filter behavior, and the exact anchor/slug contract used by teaching-flow links.

The cleanest path is to port the glossary into a shared typed frontend module and add a tiny reusable glossary-link helper. The React Academy is already set up for this: `EducationalPanel` accepts arbitrary `ReactNode` content, so cross-links can be inserted surgically inside step components without changing the shared panel API. No backend work is needed, and there is no frontend test runner configured today, so the slice should finish with build verification plus a live cross-page/browser UAT pass rather than introducing a new test stack.

## Recommendation

Create a shared glossary data/helper layer on the frontend first, then build the real glossary page on top of it, preserving the old Dash anchor contract: `#glossary-{slug}` where slug lowercases the term and replaces spaces/slashes with `-`. After that, wire glossary links into the Academy educational panels by following the old Dash `learn.py` placements instead of inventing new link targets.

Keep the glossary entirely client-side: static term data, local search over `term` / `aka` / `definition`, all terms rendered by default so deep links always land on a visible card. For polish, stay inside the existing Mantine + Plotly dark-theme system and use S06 mainly to remove the last placeholder route, tighten cross-page navigation, and collect final live integration evidence.

## Implementation Landscape

### Key Files

- `frontend/app/(dashboard)/glossary/page.tsx` — currently a placeholder; replace with the real searchable glossary UI.
- `src/statistical_arbitrage/app/pages/glossary.py` — authoritative source for the 17 glossary terms, search behavior, and the canonical DOM id pattern `glossary-{slug}`.
- `src/statistical_arbitrage/app/pages/learn.py` — authoritative source for glossary-link placement in the Academy; `_glossary_link()` shows the exact href shape and the step content that should be linked.
- `frontend/components/academy/EducationalPanel.tsx` — already link-ready because all three panels accept `ReactNode`; no component API change needed.
- `frontend/components/academy/StepPriceComparison.tsx` — add glossary link for `correlation` in the mechanics panel.
- `frontend/components/academy/StepCorrelationVsCointegration.tsx` — add glossary links for `correlation` and `cointegration` in the mechanics text.
- `frontend/components/academy/StepCointegrationTest.tsx` — add glossary links for `cointegration`, `hedge ratio`, and `ADF test`.
- `frontend/components/academy/StepSpread.tsx` — add glossary links for `spread`, `mean reversion`, and `stationarity`.
- `frontend/components/academy/StepZScoreSignals.tsx` — add glossary links for `z-score` and `spread`.
- `frontend/components/academy/StepPairSelector.tsx` — optional polish target; the current panel mentions correlation/co-movement but old Dash did not depend on this step for glossary linking.
- `frontend/components/layout/Sidebar.tsx` — existing `/glossary` navigation entry; verify active-state and route flow during UAT.
- `frontend/components/layout/Header.tsx` — header persistence surface for R006 verification across glossary/academy/deep-dive/scanner.
- `frontend/app/(dashboard)/layout.tsx` — shared AppShell; integration surface to re-check, not likely a major code-change file.
- `frontend/lib/theme.ts` — existing dark-theme baseline; only touch if a specific polish inconsistency is found.
- `.gsd/REQUIREMENTS.md` — S06 should update requirement proof, especially R026 and the final validation status for R004/R006/R007 if evidence is gathered.
- `.gsd/milestones/M001/slices/S06/S06-UAT.md` — likely artifact for the final live integration pass.
- `.gsd/milestones/M001/slices/S06/S06-ASSESSMENT.md` / `S06-SUMMARY.md` — expected closure artifacts once execution finishes.

### Build Order

1. **Port the glossary data and slug contract first.** Create a shared frontend glossary module from the Dash source so the page and Academy links use exactly the same term list and anchor generation.
2. **Replace the glossary stub page.** Build the searchable page with stable card ids and an explicit empty-result state. Prove `/glossary#glossary-cointegration` works before touching Academy links.
3. **Wire Academy cross-links step-by-step.** Follow the old Dash placements:
   - Step 2: `correlation`
   - Step 3: `correlation`, `cointegration`
   - Step 4: `cointegration`, `hedge ratio`, `ADF test`
   - Step 5: `spread`, `mean reversion`, `stationarity`
   - Step 6: `z-score`, `spread`
4. **Run the final polish/integration pass last.** Verify route flow, header/sidebar persistence, dark-theme consistency, and then update requirement/UAT artifacts with evidence.

### Verification Approach

- **Static verification**
  - `cd frontend && npm run build`
  - `cd frontend && npx tsc --noEmit`

- **Live verification**
  - API: `uv run python run_api.py`
  - Frontend: `cd frontend && npm run dev`

- **Behavioral checks**
  - `/glossary` renders the full glossary (17 terms from the Dash source) with search over term, alias, and definition.
  - Searching for terms like `cointegration`, `beta`, or `mean` filters correctly; a no-results state is shown when nothing matches.
  - `/glossary#glossary-cointegration` and `/glossary#glossary-z-score` land on the correct term cards.
  - Academy EducationalPanel text contains clickable glossary links on steps 2-6; clicking a link navigates to the anchored glossary term without a blank or broken state.
  - Cross-page navigation remains intact: Academy → Glossary → Deep Dive → Scanner → Academy.
  - Header pair/timeframe selectors remain visible and persistent across all routes, with Scanner remaining the intentional exception for active pair-selection controls.
  - No console errors or failed requests occur during glossary navigation/search; charts on other pages still render with the current dark theme.

## Constraints

- `frontend/package.json` has **no dedicated frontend test runner** configured today (no Vitest/Jest/Playwright script), so S06 should not assume automated component/e2e tests already exist.
- The glossary anchor contract must stay compatible with the old Dash link format: lowercase term, replace spaces and `/` with `-`, prefix with `glossary-`.
- The app shell already uses shared PairContext and the existing Mantine dark theme; S06 should finish the integration rather than redesign the UI system.
- The glossary page will need client-side state for search, so it must be a `'use client'` page or delegate search behavior to a client child component.

## Common Pitfalls

- **Slug drift breaks Academy deep links** — use one shared slug helper for both glossary card ids and Academy link hrefs; do not duplicate the string logic in multiple files.
- **Filtering can hide the hashed target** — render all terms by default and keep search local/user-driven so incoming `#glossary-*` links always have a visible target to scroll to.
- **Over-scoping the “integration test”** — there is no existing frontend e2e stack here; use build + live browser/UAT evidence unless the user explicitly wants new test infrastructure.
- **Polish work spreading too wide** — the slice’s main value is porting the glossary and proving integration. Prefer focused consistency fixes over a broad restyle.

## Skills Discovered

| Technology | Skill | Status |
|------------|-------|--------|
| Frontend UI polish | `frontend-design` | available |
| Testing / verification | `test` | available |
| Next.js App Router | `wshobson/agents@nextjs-app-router-patterns` | suggested via `npx skills find "next.js"` |
| Mantine | `itechmeat/llm-code@mantine-dev` | suggested via `npx skills find "mantine"` |
