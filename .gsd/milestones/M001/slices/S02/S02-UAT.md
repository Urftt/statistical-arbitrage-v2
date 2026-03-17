# S02: Next.js App Shell + Navigation — UAT

**Milestone:** M001
**Written:** 2026-03-17

## UAT Type

- UAT mode: mixed (artifact-driven build check + live-runtime browser verification)
- Why this mode is sufficient: Build success proves SSR safety and type correctness. Live browser confirms visual rendering, navigation, and API integration. No complex user flows yet — just shell verification.

## Preconditions

1. `cd frontend && npm install` has been run (node_modules present)
2. For API-dependent tests: FastAPI backend running at `localhost:8000` (`uv run uvicorn api.main:app --host 0.0.0.0 --port 8000`)
3. For non-API tests: backend not required (app degrades gracefully)

## Smoke Test

Run `cd frontend && npm run build` — must exit 0 with all routes listed (/, /_not-found, /academy, /deep-dive, /glossary, /scanner). This single command proves TypeScript compiles, SSR works, and all routes are valid.

## Test Cases

### 1. Build succeeds (SSR canary)

1. `cd frontend && npm run build`
2. **Expected:** Exit code 0. Output lists 6 routes: /, /_not-found, /academy, /deep-dive, /glossary, /scanner. No "window is not defined" errors.

### 2. Dark theme renders

1. Start dev server: `cd frontend && npm run dev`
2. Open `http://localhost:3000` in browser
3. **Expected:** Page has dark background (Mantine dark[7]: #1A1B1E or similar). No white flash. Text is light-colored. Sidebar and header visible.

### 3. Root redirect

1. Navigate to `http://localhost:3000/`
2. **Expected:** URL changes to `http://localhost:3000/academy`. Academy placeholder page content visible.

### 4. Sidebar navigation — all 4 routes

1. Click "Pair Scanner" in sidebar
2. **Expected:** URL = `/scanner`, page shows "Pair Scanner" title, NavLink highlighted
3. Click "Pair Deep Dive" in sidebar
4. **Expected:** URL = `/deep-dive`, page shows "Pair Deep Dive" title, NavLink highlighted
5. Click "Academy" in sidebar
6. **Expected:** URL = `/academy`, page shows Academy content, NavLink highlighted
7. Click "Glossary" in sidebar
8. **Expected:** URL = `/glossary`, page shows "Glossary" title, NavLink highlighted

### 5. Client-side navigation (no full reload)

1. Open browser DevTools Network tab
2. Click from `/academy` to `/scanner`
3. **Expected:** No full document reload — only JS chunks fetched. Page transitions feel instant (SPA behavior).

### 6. Header layout

1. Look at the 60px header bar
2. **Expected:** Left side: gradient blue→cyan icon with candle chart, "StatArb Research" bold text. Right side: 3 Select dropdowns labeled "Asset 1", "Asset 2", "Timeframe".

### 7. Pair selects populate from API (requires backend)

1. Ensure FastAPI is running at `localhost:8000`
2. Refresh `http://localhost:3000/academy`
3. Click the "Asset 1" dropdown
4. **Expected:** Dropdown shows real coin names (ADA, ALGO, APT, ARB, ATOM, AVAX, BTC, DOGE, DOT, ETC, ETH, etc.). Selects are searchable — typing "ETH" filters the list.

### 8. Pair selection persists across navigation

1. Select "ETH" in Asset 1, "BTC" in Asset 2, "4h" in Timeframe
2. Navigate to `/scanner` via sidebar
3. Navigate to `/deep-dive` via sidebar
4. **Expected:** All three selects still show ETH, BTC, 4h respectively. Context persists.

### 9. Graceful API failure (no backend)

1. Stop FastAPI backend
2. Refresh `http://localhost:3000`
3. **Expected:** App loads without crash. Asset 1 and Asset 2 selects show red error border. Hovering over a select shows a red tooltip with error message. Timeframe select still works (static data). No unhandled promise rejection in console.

### 10. Plotly chart renders with dark theme

1. Navigate to `/academy`
2. **Expected:** A Plotly chart is visible with:
   - Dark background (matching the app theme)
   - Two colored line traces (BTC-EUR, ETH-EUR in legend)
   - Muted gray axis labels and grid lines
   - Title "Demo: Price Comparison"
   - No white borders or light-theme elements

### 11. Plotly chart — no console errors

1. Open browser DevTools Console before navigating to `/academy`
2. Navigate to `/academy`
3. **Expected:** No "window is not defined", no hydration mismatch errors, no React errors. Only expected messages (HMR connected, React DevTools info, possibly API fetch error if backend is down).

### 12. Sidebar version footer

1. Scroll to bottom of sidebar (if needed)
2. **Expected:** "StatArb Research v0.1" text visible in dimmed color at bottom of sidebar.

## Edge Cases

### Browser direct URL navigation

1. Type `http://localhost:3000/deep-dive` directly in browser address bar (not via sidebar click)
2. **Expected:** Deep Dive page renders inside the AppShell with sidebar visible and "Pair Deep Dive" NavLink highlighted.

### Invalid route

1. Navigate to `http://localhost:3000/nonexistent`
2. **Expected:** Next.js 404 page renders (default or custom). No crash.

### Plotly loading state

1. Hard refresh `/academy` with browser cache disabled (DevTools → Network → Disable cache)
2. **Expected:** A Mantine Skeleton placeholder briefly appears where the chart will render, then the chart loads.

### Rapid navigation during API fetch

1. Navigate to `/academy` and immediately click `/scanner` before pairs finish loading
2. **Expected:** No crash, no stale state. Selects may briefly show loading state, then populate.

## Failure Signals

- `npm run build` fails with "window is not defined" → Plotly SSR safety broken
- White flash on page load → Missing `ColorSchemeScript` or `defaultColorScheme="dark"` 
- Selects empty when backend is running → CORS issue or API URL misconfigured (check `.env.local`)
- Full page reload on nav click → `component={Link}` missing from NavLink
- No active NavLink highlighting → `usePathname()` returning unexpected value
- Plotly chart missing → Check for `.js-plotly-plot` element in DOM; if absent, dynamic import failed
- Sidebar invisible → Check `(dashboard)/layout.tsx` AppShell navbar config

## Requirements Proved By This UAT

- R004 — Next.js frontend running, routing works, Dash structurally replaced (content pending S03-S06)
- R006 — Global pair selector populates from API, persists across navigation (test cases 7, 8, 9)
- R007 — Dark theme consistent, Plotly renders with mantine_dark template (test cases 2, 10, 11)

## Not Proven By This UAT

- R004 full validation — pages have placeholder content only; real page functionality is S03–S06
- R006 downstream consumption — pages don't yet use pair context for data fetching (S03+)
- R007 with real data charts — demo chart uses mock data; real cointegration charts are S03+
- Academy step flow, Scanner, Deep Dive, Glossary content — all S03–S06
- API endpoints beyond /api/pairs — S01 UAT covers those

## Notes for Tester

- The minor Mantine hydration warning ("attributes didn't match") in browser console is known and cosmetic — does not affect functionality. Ignore it.
- Plotly.js is a ~3.5MB bundle. First chart render may take 1-2 seconds — this is normal. Subsequent renders are instant.
- The demo chart on /academy uses deterministic pseudo-random data. The exact numbers don't matter — verify it renders with dark theme and two visible traces.
