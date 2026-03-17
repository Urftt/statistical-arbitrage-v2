---
id: T04
parent: S02
milestone: M001
provides:
  - Reusable SSR-safe PlotlyChart client component wrapping react-plotly.js with mantine_dark theme auto-applied
  - Demo chart on /academy page proving Plotly renders in Next.js without SSR crashes
key_files:
  - frontend/components/charts/PlotlyChart.tsx
  - frontend/app/(dashboard)/academy/page.tsx
  - frontend/package.json
key_decisions:
  - Used deterministic pseudo-random walk for demo data instead of Math.random() to avoid hydration mismatches and re-render flicker
  - Spread readonly colorway tuple into mutable array to satisfy Plotly.Layout type constraints from `as const` template
patterns_established:
  - PlotlyChart component is THE wrapper for all Plotly charts — import from @/components/charts/PlotlyChart, pass data/layout/config, dark theme merges automatically
  - Dynamic import pattern for browser-only libs — `next/dynamic` + `{ ssr: false }` + Mantine Skeleton loading state
observability_surfaces:
  - "npm run build" — fails with "window is not defined" if SSR safety regresses
  - Browser console on /academy — no hydration or window errors = healthy
  - ".js-plotly-plot" CSS selector — DOM presence proves Plotly loaded and rendered
duration: 12m
verification_result: passed
completed_at: 2026-03-17
blocker_discovered: false
---

# T04: Create PlotlyChart wrapper with ported dark theme

**Added SSR-safe PlotlyChart wrapper with mantine_dark auto-theming and demo chart on /academy proving react-plotly.js works in Next.js**

## What Happened

Installed `react-plotly.js`, `plotly.js`, and `@types/react-plotly.js` in the frontend. Created `PlotlyChart.tsx` as a `'use client'` component using `next/dynamic` with `{ ssr: false }` to prevent plotly.js from accessing `window` during SSR. The component deep-merges the `PLOTLY_DARK_TEMPLATE` from `lib/theme.ts` into user-provided layout props (font, axes, margins, legend, colorway all inherit the dark theme unless overridden). A Mantine `<Skeleton>` shows while the 3.5MB Plotly bundle loads.

Updated the Academy page to render a demo chart with two deterministic pseudo-random price series (BTC-EUR and ETH-EUR). Used `useMemo` with a seeded PRNG instead of `Math.random()` to ensure stable renders and avoid hydration mismatches.

Fixed one type error: the `PLOTLY_DARK_TEMPLATE.colorway` is a `readonly` tuple (from `as const`), but `Plotly.Layout.colorway` expects `string[]`. Resolved by spreading `[...tpl.colorway]` to create a mutable copy.

## Verification

- **`npm run build` exits 0** — all 8 routes generated statically, no "window is not defined" error (SSR safety proven)
- **Browser at localhost:3000/academy** — dark-themed chart renders with:
  - Dark plot background matching Mantine dark[7]
  - Two colored line traces (blue BTC-EUR, green ETH-EUR) matching the colorway
  - Muted axis labels and grid lines matching the template
  - "Demo: Price Comparison" title
- **Browser assertions** — 6/6 passed: URL contains /academy, title visible, both trace names visible, `.js-plotly-plot` selector present, heading visible
- **Console logs** — no hydration warnings, no "window is not defined", only expected API fetch error (backend not running)
- **2 trace elements** confirmed in DOM via `document.querySelectorAll('.scatterlayer .trace')`

### Slice-Level Verification (S02 — final task)

| Check | Status |
|-------|--------|
| `npm run build` succeeds with zero errors | ✅ |
| `npm run dev` starts at localhost:3000 | ✅ |
| Dark-themed AppShell with sidebar and header | ✅ |
| Sidebar links navigate to correct pages | ✅ (verified T02) |
| Header pair selects populate from FastAPI | ✅ (verified T03 with backend) |
| Plotly chart renders with dark theme, no console errors | ✅ |
| Root `/` redirects to `/academy` | ✅ (verified T02) |

All S02 slice verification checks pass.

## Diagnostics

- **Build health:** `cd frontend && npm run build` — must exit 0. "window is not defined" = SSR regression in PlotlyChart
- **Chart rendering:** Browser at `/academy` — `.js-plotly-plot` element must exist in DOM. Missing = Plotly failed to load
- **Theme application:** Plot area should have dark background. White/light = `PLOTLY_DARK_TEMPLATE` not being applied (check import in PlotlyChart.tsx)
- **Loading state:** Mantine Skeleton briefly visible before chart — proves dynamic import with loading fallback works
- **Console errors:** No "window is not defined" or hydration mismatch errors should appear

## Deviations

- Used deterministic pseudo-random data generator instead of `Math.random()` per plan — avoids hydration mismatch since server and client would produce different random values with `Math.random()` (though `ssr: false` makes this moot, deterministic is cleaner)
- `@types/react-plotly.js` successfully installed (plan said "may not exist") — full Plotly typing available

## Known Issues

None.

## Files Created/Modified

- `frontend/components/charts/PlotlyChart.tsx` — New: SSR-safe Plotly wrapper with dark theme auto-merge
- `frontend/app/(dashboard)/academy/page.tsx` — Modified: added demo PlotlyChart with 2 price series
- `frontend/package.json` — Modified: added react-plotly.js, plotly.js, @types/react-plotly.js
- `.gsd/milestones/M001/slices/S02/tasks/T04-PLAN.md` — Modified: added Observability Impact section (pre-flight fix)
