# S02: Next.js App Shell + Navigation

**Goal:** A dark-themed Next.js app shell at localhost:3000 with sidebar navigation, global pair selector, page routing, and a reusable PlotlyChart wrapper — ready for S03–S06 to build on.
**Demo:** Browser shows dark-themed AppShell at localhost:3000. Sidebar has working navigation links to /academy, /scanner, /deep-dive, /glossary. Header pair selects populate from FastAPI /api/pairs. A test Plotly chart renders with the mantine_dark theme. `npm run build` succeeds with zero SSR errors.

## Must-Haves

- Next.js App Router project in `frontend/` with Mantine v7+ dark theme (no Tailwind)
- `<AppShell>` layout: 240px sidebar, 60px header — matching existing Dash layout
- Sidebar navigation with NavLinks: Pair Scanner, Pair Deep Dive, Academy, Glossary (Research Hub deferred to M002)
- Header with logo ("StatArb Research") and global pair/timeframe selectors
- `PairContext` React context providing `{ asset1, asset2, timeframe }` to all pages
- API client (`lib/api.ts`) fetching from `localhost:8000` with typed responses
- Header selects populated from `GET /api/pairs` with real data
- `<PlotlyChart>` client-only wrapper via `next/dynamic` with `ssr: false`
- Ported `mantine_dark` Plotly template as TypeScript constant
- 4 placeholder pages at `/academy`, `/scanner`, `/deep-dive`, `/glossary`
- `npm run build` succeeds (proves no SSR hydration issues)

## Proof Level

- This slice proves: integration (Next.js + Mantine + API data + Plotly rendering)
- Real runtime required: yes (localhost:3000 frontend + localhost:8000 API)
- Human/UAT required: no (build success + API fetch prove the contracts)

## Verification

- `cd frontend && npm run build` — succeeds with zero errors (SSR canary)
- `cd frontend && npm run dev` — starts at localhost:3000 without errors
- Browser at localhost:3000 shows dark-themed AppShell with sidebar and header
- Clicking each sidebar link navigates to the correct page (URL changes, placeholder content visible)
- With FastAPI running at localhost:8000: header pair selects populate with real coin names
- A Plotly chart renders on at least one placeholder page using the dark theme, no console errors
- Root `/` redirects to `/academy`

## Observability / Diagnostics

- Runtime signals: browser console errors for SSR issues, network tab for API fetch failures
- Inspection surfaces: `localhost:3000` (visual), `npm run build` output (SSR errors), React DevTools (context state)
- Failure visibility: Mantine dark scheme flicker = missing `ColorSchemeScript`; Plotly crash = missing `ssr: false`; empty selects = API CORS or fetch error
- Redaction constraints: none (no secrets in frontend)

## Integration Closure

- Upstream surfaces consumed: `GET /api/pairs` from S01's FastAPI (pairs listing with symbol, base, quote, timeframe fields)
- New wiring introduced: `frontend/` directory, `PairContext` wrapping dashboard layout, `lib/api.ts` fetch layer targeting `localhost:8000`
- What remains: S03 (Academy stepper + first 3 steps), S04 (steps 4-6), S05 (Scanner + Deep Dive), S06 (Glossary + polish)

## Tasks

- [x] **T01: Scaffold Next.js project with Mantine dark theme** `est:45m`
  - Why: Foundation for the entire frontend. Nothing else can start until the project exists with Mantine configured and `npm run build` passing.
  - Files: `frontend/package.json`, `frontend/next.config.ts`, `frontend/app/layout.tsx`, `frontend/lib/theme.ts`, `frontend/tsconfig.json`
  - Do: Run `npx create-next-app@latest frontend` (App Router, TypeScript, ESLint — decline Tailwind, decline `src/` dir). Install Mantine + deps. Create root layout with `MantineProvider` (dark scheme), `ColorSchemeScript`, and CSS import. Create `lib/theme.ts` with Mantine theme object and `PLOTLY_DARK_TEMPLATE` constant ported from Dash. Configure `next.config.ts` with `optimizePackageImports` for Mantine tree-shaking.
  - Verify: `cd frontend && npm run build` succeeds; `npm run dev` shows blank dark page at localhost:3000
  - Done when: `npm run build` exits 0 and browser shows dark background at localhost:3000

- [ ] **T02: Build dashboard AppShell with sidebar navigation and placeholder pages** `est:1h`
  - Why: Creates the visual shell that all pages live inside. Closes the "app shows sidebar navigation and page routing" part of the demo. Advances R004 (Next.js replacing Dash).
  - Files: `frontend/app/(dashboard)/layout.tsx`, `frontend/components/layout/Sidebar.tsx`, `frontend/components/layout/Header.tsx`, `frontend/app/(dashboard)/page.tsx`, `frontend/app/(dashboard)/academy/page.tsx`, `frontend/app/(dashboard)/scanner/page.tsx`, `frontend/app/(dashboard)/deep-dive/page.tsx`, `frontend/app/(dashboard)/glossary/page.tsx`
  - Do: Create `(dashboard)/layout.tsx` with Mantine `<AppShell>` (header height 60, navbar width 240). Build `Sidebar.tsx` with NavLinks matching Dash structure: Pair Scanner (tabler:search → /scanner), Pair Deep Dive (tabler:microscope → /deep-dive), divider, Academy (tabler:school → /academy, description "Step-by-step guide"), Glossary (tabler:vocabulary → /glossary, description "Stat arb terms"), spacer, version text "StatArb Research v0.1". Build `Header.tsx` with logo group (gradient ThemeIcon + "StatArb Research" text) and placeholder pair selector group (3 Select components — asset1, asset2, timeframe — not wired yet). Root `(dashboard)/page.tsx` redirects to `/academy`. 4 placeholder pages each show their title. Use `@tabler/icons-react` for icons. Active NavLink highlighting via `usePathname()`.
  - Verify: `npm run build` succeeds; browser shows dark AppShell with sidebar; clicking each nav link changes URL and shows correct placeholder page; root `/` goes to `/academy`
  - Done when: All 4 routes render inside the AppShell, navigation works, `npm run build` still passes

- [ ] **T03: Wire global pair context, API client, and header pair selectors** `est:45m`
  - Why: Closes R006 (persistent pair selector propagating to all pages). The API client is the typed fetch layer all downstream slices (S03–S06) use to call FastAPI.
  - Files: `frontend/contexts/PairContext.tsx`, `frontend/lib/api.ts`, `frontend/components/layout/Header.tsx`, `frontend/app/(dashboard)/layout.tsx`
  - Do: Create `PairContext.tsx` — React context with `{ asset1, asset2, timeframe, setAsset1, setAsset2, setTimeframe, pairs }`. `pairs` is the list from API. Context provider fetches `GET /api/pairs` on mount and populates the pair list. Default timeframe "1h". Create `lib/api.ts` — base URL from `NEXT_PUBLIC_API_URL` env var (default `http://localhost:8000`), typed fetch functions: `fetchPairs(): Promise<PairsListResponse>`, `fetchOHLCV(symbol, timeframe)`, `fetchCointegration(req)`, etc. TypeScript interfaces matching the API schemas from `api/schemas.py`. Wrap dashboard layout in `<PairProvider>`. Update `Header.tsx` to use `usePairContext()` — asset1/asset2 Selects show unique coin names from fetched pairs, timeframe Select has ["15m","1h","4h","1d"], selections update context. Create `frontend/.env.local` with `NEXT_PUBLIC_API_URL=http://localhost:8000`.
  - Verify: With FastAPI running at localhost:8000, header selects show real coin names; selecting a pair updates context (verify by showing selected pair on a placeholder page or via console log); `npm run build` succeeds
  - Done when: Pair selects populate from API, selection state persists across page navigation via context

- [ ] **T04: Create PlotlyChart wrapper with ported dark theme** `est:30m`
  - Why: Closes R007 (Plotly charts via react-plotly.js with dark theme). Retires the "react-plotly.js in Next.js SSR" risk. Produces the `<PlotlyChart>` component all downstream slices use.
  - Files: `frontend/components/charts/PlotlyChart.tsx`, `frontend/app/(dashboard)/academy/page.tsx`
  - Do: Create `PlotlyChart.tsx` as `'use client'` component. Use `next/dynamic` to import `react-plotly.js` with `{ ssr: false }`. Component accepts `data`, `layout`, and optional `config` props (standard Plotly types). Merges the `PLOTLY_DARK_TEMPLATE` from `lib/theme.ts` into the layout (paper_bgcolor, plot_bgcolor, font, axis styling, colorway, margins). Shows a loading skeleton via Mantine `<Skeleton>` while Plotly loads. Add a demo chart to the Academy placeholder page: a simple line chart with 2 traces using mock data, proving the component renders with the dark theme. Install `react-plotly.js` and `plotly.js` as dependencies (and `@types/react-plotly.js` if available).
  - Verify: Academy page shows a rendered Plotly chart with dark background, colored traces, and correct axis styling; no "window is not defined" errors in console; `npm run build` succeeds (critical SSR check)
  - Done when: PlotlyChart renders on the Academy page with mantine_dark theme, `npm run build` exits 0, no hydration errors in browser console

## Files Likely Touched

- `frontend/package.json`
- `frontend/next.config.ts`
- `frontend/tsconfig.json`
- `frontend/.env.local`
- `frontend/app/layout.tsx`
- `frontend/app/(dashboard)/layout.tsx`
- `frontend/app/(dashboard)/page.tsx`
- `frontend/app/(dashboard)/academy/page.tsx`
- `frontend/app/(dashboard)/scanner/page.tsx`
- `frontend/app/(dashboard)/deep-dive/page.tsx`
- `frontend/app/(dashboard)/glossary/page.tsx`
- `frontend/components/layout/Sidebar.tsx`
- `frontend/components/layout/Header.tsx`
- `frontend/components/charts/PlotlyChart.tsx`
- `frontend/contexts/PairContext.tsx`
- `frontend/lib/api.ts`
- `frontend/lib/theme.ts`
