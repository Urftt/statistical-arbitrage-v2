---
id: T02
parent: S02
milestone: M001
provides:
  - Mantine AppShell layout with 240px sidebar + 60px header in dark theme
  - Sidebar navigation with 4 NavLinks (Scanner, Deep Dive, Academy, Glossary) and active highlighting
  - Header with gradient logo and placeholder pair/timeframe selects
  - 4 placeholder pages at /academy, /scanner, /deep-dive, /glossary
  - Root / redirect to /academy
key_files:
  - frontend/components/layout/Sidebar.tsx
  - frontend/components/layout/Header.tsx
  - frontend/app/(dashboard)/layout.tsx
  - frontend/app/(dashboard)/page.tsx
  - frontend/app/(dashboard)/academy/page.tsx
  - frontend/app/(dashboard)/scanner/page.tsx
  - frontend/app/(dashboard)/deep-dive/page.tsx
  - frontend/app/(dashboard)/glossary/page.tsx
key_decisions:
  - Used (dashboard) route group so all pages share the AppShell layout without adding a URL segment
  - NavLink items use component={Link} from next/link for client-side SPA navigation
  - Header selects are inert placeholders with empty data — T03 wires them to PairContext
patterns_established:
  - Layout components live in frontend/components/layout/ with named exports
  - Dashboard pages live in frontend/app/(dashboard)/<route>/page.tsx as server components where possible
  - Active nav state uses usePathname() === href with variant="light"
observability_surfaces:
  - Browser at localhost:3000 — visual shell with sidebar, header, and page content
  - npm run build output — lists all 6 routes (/, /_not-found, /academy, /deep-dive, /glossary, /scanner)
  - Browser console — no errors on navigation; React DevTools shows AppShell tree
duration: 8m
verification_result: passed
completed_at: 2026-03-17
blocker_discovered: false
---

# T02: Build dashboard AppShell with sidebar navigation and placeholder pages

**Built Mantine AppShell with 240px sidebar, 60px header, 4 NavLink items with active highlighting, 3 header pair selects, 4 placeholder pages, and root redirect to /academy**

## What Happened

Created the visual shell that all downstream slices build into:

1. **Sidebar.tsx** — 4 NavLinks matching the Dash layout: Pair Scanner (/scanner, IconSearch), Pair Deep Dive (/deep-dive, IconMicroscope), Academy (/academy, IconSchool with description), Glossary (/glossary, IconVocabulary with description). Includes dividers, flexible spacer, and "StatArb Research v0.1" footer. Active state via `usePathname()` with `variant="light"`.

2. **Header.tsx** — Left: gradient ThemeIcon (blue→cyan, deg 45) with IconChartCandle + bold "StatArb Research" text. Right: 3 placeholder Select components (Asset 1, Asset 2, Timeframe with ["15m","1h","4h","1d"] defaulting to "1h"). Selects are inert — T03 connects them to PairContext.

3. **Dashboard layout** — `(dashboard)/layout.tsx` wraps all pages in `<AppShell>` with header height 60, navbar width 240, breakpoint 0, padding "lg".

4. **Placeholder pages** — Academy, Scanner, Deep Dive, Glossary each render a Title + dimmed description. Root `(dashboard)/page.tsx` uses `redirect('/academy')`.

5. **Removed T01's root `app/page.tsx`** to avoid conflict with the `(dashboard)` route group's `page.tsx` which serves `/`.

## Verification

- **`npm run build`** — exits 0, generates all 6 routes (/, /_not-found, /academy, /deep-dive, /glossary, /scanner)
- **Root redirect** — `localhost:3000` → redirected to `/academy` ✅
- **All 4 navigations** — browser_batch clicked each sidebar link and asserted URL + visible text: all 8 checks PASS
- **Active highlight** — "Pair Scanner" highlighted blue when on /scanner, "Academy" highlighted when on /academy ✅
- **Header** — gradient logo icon, "StatArb Research" title, 3 Select placeholders visible with coin/clock icons ✅
- **Console** — no errors (only HMR connected + React DevTools info) ✅
- **Client-side nav** — NavLinks use `component={Link}` from next/link, no full page reloads observed

### Slice-level verification (partial — T02 is task 2 of 4):
- ✅ `npm run build` succeeds with zero errors
- ✅ `npm run dev` starts at localhost:3000 without errors
- ✅ Browser shows dark-themed AppShell with sidebar and header
- ✅ Clicking each sidebar link navigates to correct page
- ⬜ Header pair selects populate from FastAPI (T03)
- ⬜ Plotly chart renders with dark theme (T04)
- ✅ Root `/` redirects to `/academy`

## Diagnostics

- **Visual check:** `localhost:3000` — dark AppShell with sidebar visible at all routes
- **Build health:** `cd frontend && npm run build` — route table in output lists all pages
- **Broken nav:** Full page reload instead of SPA transition → check `component={Link}` prop on NavLink
- **Missing sidebar:** Import error in `(dashboard)/layout.tsx` → verify Sidebar.tsx export name
- **No active highlight:** `usePathname()` returning different path than expected → log pathname in Sidebar
- **Redirect loop:** Both root `app/page.tsx` and `(dashboard)/page.tsx` exist → delete root `app/page.tsx`

## Deviations

None. Implementation matches the plan exactly.

## Known Issues

None.

## Files Created/Modified

- `frontend/components/layout/Sidebar.tsx` — Sidebar navigation with 4 NavLinks, active highlighting, version footer
- `frontend/components/layout/Header.tsx` — Header with gradient logo and 3 placeholder pair selects
- `frontend/app/(dashboard)/layout.tsx` — AppShell layout wrapping all dashboard pages
- `frontend/app/(dashboard)/page.tsx` — Root redirect to /academy
- `frontend/app/(dashboard)/academy/page.tsx` — Academy placeholder page
- `frontend/app/(dashboard)/scanner/page.tsx` — Scanner placeholder page
- `frontend/app/(dashboard)/deep-dive/page.tsx` — Deep Dive placeholder page
- `frontend/app/(dashboard)/glossary/page.tsx` — Glossary placeholder page
- `frontend/app/page.tsx` — Removed (T01 splash page, replaced by dashboard route group)
- `.gsd/milestones/M001/slices/S02/tasks/T02-PLAN.md` — Added Observability Impact section
