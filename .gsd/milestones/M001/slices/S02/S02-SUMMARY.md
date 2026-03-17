---
id: S02
parent: M001
milestone: M001
provides:
  - Next.js 16 App Router project in frontend/ with Mantine v8 dark theme
  - AppShell layout with 240px sidebar + 60px header matching Dash structure
  - Sidebar navigation with 4 NavLinks (Scanner, Deep Dive, Academy, Glossary) and active highlighting
  - Global PairContext providing asset1/asset2/timeframe to all pages via React context
  - Typed API client (lib/api.ts) with fetchPairs, fetchOHLCV, postCointegration
  - Header pair selects populated from GET /api/pairs with real coin data
  - SSR-safe PlotlyChart wrapper with auto-applied mantine_dark theme
  - PLOTLY_DARK_TEMPLATE constant ported from Dash (17 values)
  - 4 placeholder pages at /academy, /scanner, /deep-dive, /glossary
  - Root / redirect to /academy
requires:
  - slice: S01
    provides: GET /api/pairs endpoint (consumed by PairContext for coin list population)
affects:
  - S03
  - S04
  - S05
  - S06
key_files:
  - frontend/app/layout.tsx
  - frontend/app/(dashboard)/layout.tsx
  - frontend/components/layout/Sidebar.tsx
  - frontend/components/layout/Header.tsx
  - frontend/components/charts/PlotlyChart.tsx
  - frontend/contexts/PairContext.tsx
  - frontend/lib/api.ts
  - frontend/lib/theme.ts
key_decisions:
  - Mantine v8.3.17 (plan said v7+; identical API surface, no code changes needed)
  - (dashboard) route group for shared AppShell layout without URL segment
  - next/dynamic with ssr:false for Plotly (mandatory — 'use client' alone is insufficient)
  - Deterministic pseudo-random demo data to avoid hydration mismatches
  - Mantine Select with value={x || null} pattern for uncontrolled placeholder display
patterns_established:
  - Layout components in frontend/components/layout/ — Sidebar.tsx, Header.tsx
  - Dashboard pages in frontend/app/(dashboard)/<route>/page.tsx
  - PlotlyChart is THE chart wrapper — import from @/components/charts/PlotlyChart, dark theme auto-merges
  - PairContext wraps at (dashboard)/layout.tsx level — all pages share pair/timeframe state via usePairContext()
  - API client uses generic apiFetch<T> wrapper with console.error logging on failure
  - Active nav highlighting via usePathname() with variant="light"
  - Dynamic import pattern for browser-only libs — next/dynamic + { ssr: false } + Mantine Skeleton loading
observability_surfaces:
  - npm run build exit code — 0 = healthy, non-zero = SSR regression or type error
  - Browser console — no hydration warnings or window errors = correct SSR config
  - Network tab GET /api/pairs — 200 = API connected, ERR_CONNECTION_REFUSED = backend not running
  - Header selects red error border + tooltip = API unreachable (graceful degradation)
  - .js-plotly-plot CSS selector in DOM = Plotly loaded and rendered
drill_down_paths:
  - .gsd/milestones/M001/slices/S02/tasks/T01-SUMMARY.md
  - .gsd/milestones/M001/slices/S02/tasks/T02-SUMMARY.md
  - .gsd/milestones/M001/slices/S02/tasks/T03-SUMMARY.md
  - .gsd/milestones/M001/slices/S02/tasks/T04-SUMMARY.md
duration: 45m
verification_result: passed
completed_at: 2026-03-17
---

# S02: Next.js App Shell + Navigation

**Dark-themed Next.js app shell with Mantine AppShell, sidebar navigation, global pair selector wired to FastAPI, and SSR-safe PlotlyChart wrapper — the foundation all downstream slices build into.**

## What Happened

Built the complete frontend foundation in 4 tasks:

**T01 — Scaffold** created the Next.js 16 + Mantine v8 project. Configured dark theme via `MantineProvider` with `ColorSchemeScript`, created `lib/theme.ts` with Mantine theme object and `PLOTLY_DARK_TEMPLATE` (all 17 color/font/margin values ported from the Dash `layout.py`). Build passes clean.

**T02 — AppShell + Navigation** built the visual shell: Mantine `<AppShell>` with 240px sidebar and 60px header inside a `(dashboard)` route group. Sidebar has 4 `NavLink` items (Scanner, Deep Dive, Academy, Glossary) using `next/link` for SPA navigation with active highlighting via `usePathname()`. Header has a gradient logo and 3 placeholder Select components. Root `/` redirects to `/academy`. Four placeholder pages render inside the shell.

**T03 — PairContext + API Client** wired the selects to real data. Created `PairContext` holding `asset1/asset2/timeframe` state, fetching pairs from `GET /api/pairs` on mount. Built `lib/api.ts` with typed `apiFetch<T>` wrapper and functions for all S01 endpoints. Header selects now show real coin names from the API, persist selections across navigation, and degrade gracefully (red border + tooltip) when the backend is unreachable.

**T04 — PlotlyChart wrapper** installed `react-plotly.js` + `plotly.js` and created an SSR-safe `<PlotlyChart>` component using `next/dynamic` with `{ ssr: false }`. The component deep-merges `PLOTLY_DARK_TEMPLATE` into user layout props. A demo chart on `/academy` with two deterministic price series proves the integration works. `npm run build` passes — the definitive SSR canary.

## Verification

All slice-level verification checks pass:

| Check | Status |
|-------|--------|
| `cd frontend && npm run build` succeeds with zero errors | ✅ PASS — all 8 routes generated |
| `cd frontend && npm run dev` starts at localhost:3000 | ✅ PASS |
| Browser shows dark-themed AppShell with sidebar and header | ✅ PASS |
| Clicking each sidebar link navigates to correct page | ✅ PASS — 4/4 routes verified |
| Root `/` redirects to `/academy` | ✅ PASS |
| With FastAPI at :8000: header pair selects populate with real coin names | ✅ PASS — ADA through XRP visible |
| Pair selection persists across page navigation | ✅ PASS — ETH/ETC/1h persists |
| Plotly chart renders with dark theme, no console errors | ✅ PASS — .js-plotly-plot in DOM, 2 traces |
| Without FastAPI: selects show error state, no crash | ✅ PASS — graceful degradation |

## Requirements Advanced

- R004 — Next.js project scaffolded and running. AppShell, routing, and navigation structurally replace Dash. Awaiting page content (S03–S06) for full validation.
- R006 — Global pair selector implemented via PairContext. Header selects populate from API, selections propagate to all pages. Downstream pages need to consume the context.
- R007 — Dark theme consistent across all pages. PLOTLY_DARK_TEMPLATE ported (17 values). PlotlyChart wrapper auto-applies theme. SSR-safe with build verification.

## Requirements Validated

- none — R004/R006/R007 are structurally delivered but need downstream slices to consume and prove end-to-end.

## New Requirements Surfaced

- none

## Requirements Invalidated or Re-scoped

- none

## Deviations

- **Mantine v8 instead of v7+**: Plan specified v7+, installed v8.3.17 (latest). API is identical for all usage patterns. No code adjustments needed.
- **Next.js 16 instead of 14+**: Latest version installed. App Router API is stable. No issues.

## Known Limitations

- Minor Mantine SSR hydration warning ("attributes didn't match") — cosmetic, pre-existing from Mantine's ColorSchemeScript. Does not affect functionality.
- API client only has `fetchPairs`, `fetchOHLCV`, `postCointegration`. Additional endpoint functions (spread, zscore, stationarity) will be added as S03–S05 need them.
- Placeholder pages have no real content yet — S03–S06 fill them.

## Follow-ups

- S03 must add `postSpread()` and `postZscore()` to `lib/api.ts` when implementing Academy steps that need those endpoints.
- The minor hydration warning may resolve with Mantine's next patch; not blocking.

## Files Created/Modified

- `frontend/package.json` — Next.js 16 + Mantine v8 + react-plotly.js + Plotly.js + Tabler Icons
- `frontend/next.config.ts` — optimizePackageImports for Mantine tree-shaking
- `frontend/tsconfig.json` — TypeScript config (generated)
- `frontend/eslint.config.mjs` — ESLint config (generated)
- `frontend/.env.local` — NEXT_PUBLIC_API_URL=http://localhost:8000
- `frontend/app/layout.tsx` — Root layout with MantineProvider dark theme + ColorSchemeScript
- `frontend/app/(dashboard)/layout.tsx` — AppShell layout with PairProvider wrapping all pages
- `frontend/app/(dashboard)/page.tsx` — Root redirect to /academy
- `frontend/app/(dashboard)/academy/page.tsx` — Academy placeholder with demo PlotlyChart
- `frontend/app/(dashboard)/scanner/page.tsx` — Scanner placeholder
- `frontend/app/(dashboard)/deep-dive/page.tsx` — Deep Dive placeholder
- `frontend/app/(dashboard)/glossary/page.tsx` — Glossary placeholder
- `frontend/components/layout/Sidebar.tsx` — 4 NavLinks, active highlighting, version footer
- `frontend/components/layout/Header.tsx` — Gradient logo + 3 pair/timeframe selects wired to PairContext
- `frontend/components/charts/PlotlyChart.tsx` — SSR-safe Plotly wrapper with dark theme auto-merge
- `frontend/contexts/PairContext.tsx` — Global pair/timeframe state via React context
- `frontend/lib/api.ts` — Typed API client with fetchPairs, fetchOHLCV, postCointegration
- `frontend/lib/theme.ts` — Mantine theme + PLOTLY_DARK_TEMPLATE (17 values ported from Dash)

## Forward Intelligence

### What the next slice should know
- Import `PlotlyChart` from `@/components/charts/PlotlyChart` — pass `data` and `layout`, dark theme is automatic.
- Import `usePairContext` from `@/contexts/PairContext` — get `asset1`, `asset2`, `timeframe` for API calls.
- Import API functions from `@/lib/api` — `fetchPairs()`, `fetchOHLCV(symbol, timeframe)`, `postCointegration(req)`. Add new endpoint functions there as needed.
- All dashboard pages share the AppShell via `(dashboard)/layout.tsx`. New pages go in `app/(dashboard)/<route>/page.tsx`.
- `npm run build` is the definitive SSR canary — run it after any change that touches Plotly or client components.

### What's fragile
- **Plotly SSR safety** — Any new component that imports from `plotly.js` directly (not through `PlotlyChart`) will crash the build. Always use the `PlotlyChart` wrapper or the `next/dynamic` + `ssr: false` pattern.
- **`as const` template vs mutable Layout** — `PLOTLY_DARK_TEMPLATE` uses `as const`. Readonly arrays must be spread (`[...tpl.colorway]`) before passing to Plotly types.

### Authoritative diagnostics
- `cd frontend && npm run build` — exit 0 confirms SSR safety, TypeScript correctness, and route generation. This is the single most trustworthy signal.
- Browser Network tab for `GET /api/pairs` — confirms frontend-backend connectivity.
- `.js-plotly-plot` selector in DOM — confirms Plotly chart rendered.

### What assumptions changed
- Plan assumed Mantine v7 — v8 was current and has identical API. No impact on downstream work.
- Plan assumed `@types/react-plotly.js` might not exist — it does, full typing available.
- Plan assumed Next.js 14 — v16 installed, App Router API stable across versions.
