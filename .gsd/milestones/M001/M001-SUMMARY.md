---
id: M001
provides:
  - Next.js 16 + Mantine frontend replacing the active Dash user experience for Academy, Scanner, Deep Dive, and Glossary
  - FastAPI REST API exposing cached OHLCV and PairAnalysis results to the frontend
  - Complete 6-step Academy with real pair data, interactive Plotly charts, and client-side slider-driven exploration
  - Batch Scanner, single-pair Deep Dive, and searchable Glossary integrated into one dark-themed app shell
  - Final live route-loop proof across Academy → Glossary → Deep Dive → Scanner → Academy
key_decisions:
  - D001/D002/D003 fixed the V2 split as Next.js frontend + FastAPI REST backend over the existing Python analysis core
  - D010 kept Academy data fetching at the page level with standalone step components for rendering
  - D013 chunked Scanner batch requests in groups of 5 to keep the local API responsive during scans
  - D014 kept Deep Dive z-score controls honest by recomputing z-scores client-side from spread data
  - D015 mount-gated the dashboard AppShell to eliminate Mantine hydration mismatch noise surfaced during final live UAT
patterns_established:
  - Page-level fetch/cache + step/page-local derived computation is the standard frontend pattern for analysis views
  - Plotly runs through a single SSR-safe wrapper with manual secondary-axis theming where subplots or dual axes are used
  - Shared typed contracts live centrally (API client types, glossary slug/id helpers, PairContext) and are reused across routes
observability_surfaces:
  - `uv run pytest tests -q` for whole-repo Python regression coverage
  - `uv run pytest tests/test_api.py -q` for FastAPI contract verification
  - `cd frontend && npm run build` as the authoritative SSR/type/build gate
  - `cd frontend && node scripts/check-academy-glossary-links.mjs` for Academy→Glossary link coverage
  - `.gsd/milestones/M001/slices/S06/S06-UAT.md` as the canonical live-runtime integration artifact
requirement_outcomes:
  - id: R001
    from_status: active
    to_status: validated
    proof: S03 delivered steps 1-3, S04 delivered steps 4-6, and the complete 6-step flow was verified end-to-end with real BTC/ETH data.
  - id: R002
    from_status: active
    to_status: validated
    proof: S03-S04 proved every Academy step has a populated 3-layer EducationalPanel with working expand/collapse behavior.
  - id: R003
    from_status: active
    to_status: validated
    proof: S04 verified the Step 5 rolling-window slider and Step 6 entry/exit/stop sliders update charts and summaries client-side with zero network requests after interaction.
  - id: R004
    from_status: active
    to_status: validated
    proof: S02-S06 replaced the active Dash experience with the Next.js app shell, Academy, Scanner, Deep Dive, and Glossary, and S06 live UAT closed the full route loop on localhost.
  - id: R005
    from_status: active
    to_status: validated
    proof: S01 delivered 7 FastAPI endpoints with 51 API tests, and S03-S05 consumed those endpoints from the React frontend.
  - id: R006
    from_status: active
    to_status: validated
    proof: S06 live UAT confirmed the shared header selectors persisted across Academy, Glossary, Deep Dive, and Scanner, with Deep Dive consuming the selected BTC/ETH/1h state end-to-end.
  - id: R007
    from_status: active
    to_status: validated
    proof: S02 established the dark shell/template and S06 live UAT confirmed consistent dark presentation across the full route loop with no broken navigation.
  - id: R016
    from_status: active
    to_status: validated
    proof: S01 exposed all cached parquet-backed datasets via API without triggering exchange fetches, and S03-S05 used that cached data successfully in the running app.
  - id: R026
    from_status: active
    to_status: validated
    proof: S06 delivered the searchable 17-term glossary, direct hash anchors, Academy cross-links, and live browser verification for search, empty state, and anchor navigation.
duration: 1 day across S01-S06
verification_result: passed
completed_at: 2026-03-17
---

# M001: Frontend Foundation + Academy

**Completed the V2 frontend foundation: FastAPI + Next.js replaced the active Dash experience, the full 6-step Academy now runs on real pair data, and Scanner, Deep Dive, and Glossary were integrated and live-verified as one application.**

## What Happened

M001 rebuilt the user-facing surface of the platform without disturbing the analytical core.

S01 wrapped the existing Python work in a clean FastAPI layer. The backend now serves cached pair metadata, OHLCV history, and PairAnalysis outputs through typed REST endpoints, with numpy-safe serialization, OpenAPI docs, and a 51-test contract suite. That established the stable interface the frontend could build against.

S02 created the new Next.js shell: Mantine AppShell, dark theme, global pair/timeframe selectors, sidebar navigation, and an SSR-safe Plotly wrapper. That gave the milestone a stable route structure and the first proof that Plotly could render cleanly in React without SSR breakage.

S03 and S04 built the Academy in two passes. S03 established the step engine, the shared EducationalPanel, and steps 1-3 with real OHLCV and cointegration data flowing from the API. S04 finished steps 4-6 with the heavier statistical surfaces: ADF verdicts, regression views, spread bands, z-score thresholds, and signal generation. The important architectural outcome is that live chart exploration no longer depends on server round-trips for slider changes; derived computations happen client-side from cached analysis data.

S05 replaced the remaining placeholder research surfaces. Scanner now runs real batch cointegration scans with progress, sorted/highlighted results, a p-value histogram, and explicit failed-row handling. Deep Dive now performs a real single-pair analysis with stat cards and four Plotly diagnostics, while recomputing configurable z-scores client-side so the UI stays truthful despite the backend’s fixed 60-period z-score in the cointegration endpoint.

S06 closed the remaining user-facing gap with a real glossary and the final integration proof. The glossary dataset, slug contract, and deep-link helpers were centralized, Academy steps 2-6 were wired to those shared links, and a lightweight source regression check was added for link coverage. Final live UAT then exercised the real application through the route loop `Academy → Glossary → Deep Dive → Scanner → Academy`. That pass surfaced one real issue — Mantine hydration mismatch noise in the dashboard shell — and the milestone fixed it by mount-gating the AppShell. After that, the final runtime evidence was clean.

Taken together, M001 leaves the project with a stable V2 foundation: the active learning and exploratory workflows now run through the Next.js/FastAPI stack, the old Dash UX is no longer the running application surface for the milestone scope, and the project is positioned for M002’s research/backtesting work.

## Cross-Slice Verification

### Success criteria

- **User can walk through all 6 Academy steps with real pair data and see interactive charts at each step** — met.
  - S03 verified steps 1-3 with real OHLCV/cointegration data.
  - S04 verified steps 4-6 with real analysis outputs, including ADF, spread, and z-score/signal charts.
  - Rerun support checks in this closeout: `cd frontend && npm run build` passed; `uv run pytest tests -q` passed with `99 passed`.

- **Parameter sliders in steps 5-6 update charts in real-time without jank** — met.
  - S04 verified Step 5 rolling-window updates and Step 6 threshold/stop-loss updates with zero fetch/XHR requests after slider interaction.
  - S06 final live UAT confirmed clean browser buffers after the final shell fix.

- **Three-layer educational panels expand/collapse smoothly** — met.
  - S03 established `EducationalPanel`; S03/S04 verified all 6 steps have populated Intuition / How It Works / Your Pair layers with working accordion behavior.

- **Global pair selector propagates to all pages** — met, with the planned Scanner exception.
  - S02 built the shared PairContext and header selectors.
  - S03 proved Academy consumption.
  - S05 proved Deep Dive consumption.
  - S06 live UAT verified selectors remained visible across Academy, Glossary, Deep Dive, and Scanner; Scanner intentionally keeps page-local batch controls while reusing the shared pair universe.

- **Scanner runs batch cointegration across multiple pairs** — met.
  - S05 live verification confirmed a 19-coin scan rendered `171` rows with `30` cointegrated / `141` not cointegrated, and the failure path degraded to `⚠️` rows instead of crashing.

- **Deep Dive shows full single-pair analysis** — met.
  - S05 live verification confirmed `Analysis complete`, 8 stat cards, and all 4 chart sections for `BTC / ETH · 1h`.

- **Dark theme is consistent across all pages and charts** — met.
  - S02 ported the Mantine/Plotly dark theme and SSR-safe chart wrapper.
  - S06 live UAT verified the shell stayed visually consistent through the full route loop with no blank pages or broken navigation.

- **No Dash code remains in the running application** — met for the milestone surface.
  - S04/S05/S06 proved Academy, Scanner, Deep Dive, and Glossary all run through the new Next.js/FastAPI stack.
  - R004 was advanced to validated only after S06 confirmed the complete route loop on localhost.

### Definition of done

- **All 6 Academy steps render with real pair data and interactive charts** — verified by S03/S04 runtime checks.
- **Parameter sliders in steps 5-6 produce smooth, real-time chart updates** — verified by S04 zero-network slider checks.
- **Educational panels show all 3 layers with real pair-specific content** — verified by S03/S04.
- **Global pair/timeframe selector works across all pages** — verified by S06 live UAT, with Scanner remaining the deliberate page-local-control exception documented in requirements/decisions.
- **Scanner and Deep Dive pages produce correct analysis results** — verified by S05 runtime checks.
- **The app runs cleanly on localhost (Next.js :3000, FastAPI :8000)** — verified in S06 live UAT and supported by the fresh closeout gates: `npm run build`, `pytest tests/test_api.py -q`, `pytest tests -q`, and `node scripts/check-academy-glossary-links.mjs` all passed.
- **No visible jank, broken states, or dead navigation links** — verified by S06 final route-loop UAT and clean final browser console/network buffers.
- **Success criteria are verified against live behavior, not just artifacts** — satisfied by the slice UAT evidence, especially S05 and S06.

### Artifact and integration completeness

- All roadmap slices are `[x]`: S01, S02, S03, S04, S05, S06.
- All slice summaries exist: `S01-SUMMARY.md` through `S06-SUMMARY.md` confirmed present during this closeout.
- Cross-slice integration points hold:
  - FastAPI contracts still pass: `uv run pytest tests/test_api.py -q` → `51 passed`
  - Whole Python test suite still passes: `uv run pytest tests -q` → `99 passed`
  - Frontend static/build gate still passes: `cd frontend && npm run build`
  - Academy/Glossary cross-link wiring still passes: `cd frontend && node scripts/check-academy-glossary-links.mjs`

No success criterion or definition-of-done item remains unmet.

## Requirement Changes

- R001: active → validated — S03 delivered steps 1-3, S04 delivered steps 4-6, and the full 6-step flow was verified end-to-end with real pair data.
- R002: active → validated — all Academy steps now have working 3-layer EducationalPanels with populated content.
- R003: active → validated — Step 5 and Step 6 slider interactions were verified as client-side, real-time updates with zero network calls after interaction.
- R004: active → validated — the milestone replaced the active Dash UX with the Next.js/FastAPI application and proved it live in S06.
- R005: active → validated — S01 delivered and tested the REST API layer, and later slices consumed it from the frontend.
- R006: active → validated — shared header selectors were proven across the milestone routes, with Deep Dive consuming shared state end-to-end.
- R007: active → validated — the dark Mantine/Plotly presentation stayed consistent across the full route loop.
- R016: active → validated — the existing parquet-backed pipeline remained intact and accessible through the API.
- R026: active → validated — the glossary and Academy cross-links were delivered and live-verified.

R022 remains **active**. M001 completed the Academy transparency surface, but the requirement also applies to research and backtesting outputs that belong to M002.

## Forward Intelligence

### What the next milestone should know
- The V2 frontend foundation is stable. M002 should build on the existing patterns rather than invent new ones: page-level fetch/cache for expensive analysis, client-side derivation for interactive controls, and shared typed contracts for anything reused across routes.
- The best reusable seam for strategy work already exists in frontend form: the pure signal-generation/state-machine logic from Academy step 6 should be extracted from the UI version when the backtesting engine is built.
- The glossary contract is centralized in `frontend/lib/glossary.ts`. Any future educational or research copy that references glossary terms should use the helper instead of hard-coded hash strings.

### What's fragile
- Mantine shell hydration can regress if future shell work reintroduces runtime-generated ids/classNames before mount — `frontend/app/(dashboard)/layout.tsx` is the current guardrail.
- The backend cointegration endpoint still hardcodes a 60-period z-score — any configurable z-score UI must recompute client-side from spread or call a dedicated endpoint.
- Plotly secondary axes remain manual — `xaxis2`/`yaxis2` styling can drift from the dark theme if future charts forget the established pattern.

### Authoritative diagnostics
- `cd frontend && npm run build` — most trustworthy frontend integrity signal because it catches SSR regressions, type errors, and route generation problems in one pass.
- `uv run pytest tests -q` — best whole-repo Python regression signal.
- `.gsd/milestones/M001/slices/S06/S06-UAT.md` — canonical proof for the final live integrated route loop.
- `cd frontend && node scripts/check-academy-glossary-links.mjs` — fastest check that Academy→Glossary wiring still matches the shared glossary contract.

### What assumptions changed
- The final route loop was not clean on the first pass — Mantine hydration mismatch noise surfaced during real UAT and required a shell-level fix before the milestone evidence was trustworthy.
- The scanner is the intentional exception to full header-driven interaction. It shares the coin universe but keeps page-local multi-pair controls because batch scanning is a different workflow.
- The backend cointegration response was not sufficient for configurable z-score views — Deep Dive had to recompute z-scores client-side to keep the UI honest.

## Files Created/Modified

- `.gsd/milestones/M001/M001-SUMMARY.md` — milestone closeout record with cross-slice verification, requirement outcomes, and forward intelligence.
- `.gsd/PROJECT.md` — updated current-state summary and milestone registry to reflect M001 completion.
- `.gsd/STATE.md` — updated project execution state after milestone closure.
