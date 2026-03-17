---
id: T03
parent: S02
milestone: M001
provides:
  - PairContext React context providing global asset1/asset2/timeframe state to all dashboard pages
  - Typed API client (lib/api.ts) with fetchPairs, fetchOHLCV, postCointegration
  - Header pair selects populated from GET /api/pairs with real coin names
key_files:
  - frontend/lib/api.ts
  - frontend/contexts/PairContext.tsx
  - frontend/components/layout/Header.tsx
  - frontend/app/(dashboard)/layout.tsx
  - frontend/.env.local
key_decisions:
  - Mantine Select with value={x || null} pattern to distinguish "no selection" (empty string) from "cleared" — Mantine v8 Select needs null for uncontrolled placeholder display
patterns_established:
  - API client in lib/api.ts uses generic apiFetch<T> wrapper with console.error logging on failure
  - Context providers wrap PairProvider at (dashboard)/layout.tsx level so all pages share state
  - usePairContext() hook throws descriptive error if used outside PairProvider
observability_surfaces:
  - console.error on API fetch failure with URL and status code
  - PairContext.error field becomes non-null with descriptive message when API unreachable
  - Network tab shows GET /api/pairs request; React DevTools shows PairContext value
duration: 15m
verification_result: passed
completed_at: 2026-03-17
blocker_discovered: false
---

# T03: Wire global pair context, API client, and header pair selectors

**Created PairContext, typed API client, and wired header pair selects to real coin data from FastAPI /api/pairs**

## What Happened

Built 3 new files and updated 2 existing ones:

1. **`lib/api.ts`** — Typed API client with `API_BASE_URL` from env, generic `apiFetch<T>` wrapper, and 3 endpoint functions: `fetchPairs()`, `fetchOHLCV()`, `postCointegration()`. All interfaces match the FastAPI schemas. Error handling logs to console.error with URL and status.

2. **`contexts/PairContext.tsx`** — React context holding `asset1`, `asset2`, `timeframe` state plus `pairs`, `coins`, `loading`, `error`. Provider fetches pairs on mount, derives sorted unique base currencies. Cleanup cancels in-flight fetch. `usePairContext()` hook throws if used outside provider.

3. **`(dashboard)/layout.tsx`** — Wrapped `<AppShell>` in `<PairProvider>` so all dashboard pages share the same pair/timeframe context.

4. **`Header.tsx`** — Replaced placeholder Selects with context-wired versions. Asset 1/2 show `coins` from API, Timeframe shows `["15m","1h","4h","1d"]`. Disabled while loading, red error border + tooltip when API unreachable.

5. **`.env.local`** — `NEXT_PUBLIC_API_URL=http://localhost:8000`.

## Verification

- **Build:** `cd frontend && npm run build` — exit 0, all 4 routes listed ✅
- **Without API:** App loads, selects show red error border, no crash, no unhandled errors ✅
- **With API (FastAPI at :8000):** Header selects populate with real coin names (ADA, ALGO, APT, ARB, ARPA, ATOM, AVAX, BTC, DOGE, DOT, ETC, ETH, ...) ✅
- **Selection works:** Typed "ETH" in Asset 1 → filtered dropdown → selected ETH. Typed "ETC" in Asset 2 → selected ETC ✅
- **Context persistence:** Selected ETH/ETC/1h on /academy → navigated to /scanner → values still ETH/ETC/1h → navigated to /deep-dive → still ETH/ETC/1h ✅
- **Hydration:** Minor "attributes didn't match" warning from Mantine SSR (pre-existing from T02, not introduced by T03)

### Slice-level verification (partial — T03 is intermediate):
- ✅ `cd frontend && npm run build` — succeeds with zero errors
- ✅ `cd frontend && npm run dev` — starts at localhost:3000 without errors
- ✅ Browser at localhost:3000 shows dark-themed AppShell with sidebar and header
- ✅ Clicking each sidebar link navigates to correct page
- ✅ With FastAPI running: header pair selects populate with real coin names
- ⬜ Plotly chart renders on at least one page (T04)
- ✅ Root `/` redirects to `/academy`

## Diagnostics

- **API connectivity:** Check Network tab for `GET /api/pairs` — 200 = OK, ERR_CONNECTION_REFUSED = backend not running
- **Context state:** React DevTools → Components → PairProvider → shows asset1, asset2, timeframe, coins array
- **Error shape:** When API is unreachable, `PairContext.error` is a string like `"API fetch failed: http://localhost:8000/api/pairs — Failed to fetch"` and selects show `error={true}` (red border)
- **No data in selects:** Check that backend returns `{ pairs: [...] }` with `base` field on each item

## Deviations

None — implemented exactly as planned.

## Known Issues

- Minor Mantine SSR hydration warning ("attributes didn't match") — pre-existing from T02, not introduced here. Cosmetic only, does not affect functionality.

## Files Created/Modified

- `frontend/lib/api.ts` — new: typed API client with fetchPairs, fetchOHLCV, postCointegration
- `frontend/contexts/PairContext.tsx` — new: React context for global pair/timeframe state
- `frontend/components/layout/Header.tsx` — updated: wired selects to PairContext with live data
- `frontend/app/(dashboard)/layout.tsx` — updated: wrapped AppShell in PairProvider
- `frontend/.env.local` — new: NEXT_PUBLIC_API_URL=http://localhost:8000
