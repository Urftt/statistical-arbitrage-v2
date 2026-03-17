---
id: T02
parent: S03
milestone: M001
provides:
  - StepPairSelector component with 3 curated pair cards wired to PairContext
  - Academy page with AcademyStepper, step dispatch, and cointegration cache
key_files:
  - frontend/components/academy/StepPairSelector.tsx
  - frontend/app/(dashboard)/academy/page.tsx
key_decisions:
  - Pair cards use responsive SimpleGrid cols (base:1, sm:3) for mobile compat
  - Cointegration cache uses useRef keyed by asset1-asset2-timeframe to avoid re-fetching between steps
patterns_established:
  - Step components are standalone 'use client' components dispatched by activeStep index in page.tsx
  - Static content steps (no API dependency) prove the stepper→step architecture before data-driven steps
observability_surfaces:
  - console.error from apiFetch on cointegration fetch failure (URL + status)
  - Browser Network tab shows POST /api/analysis/cointegration when pair selected
  - Placeholder text ("coming in T03/T04/S04") confirms step dispatch correctness
duration: 18m
verification_result: passed
completed_at: 2026-03-17
blocker_discovered: false
---

# T02: Build Step 1 (StepPairSelector) and wire Academy page

**Built Academy page with 6-step stepper, step dispatch, cointegration cache, and Step 1 with curated pair cards, timeframe guidance, learning roadmap, and educational panel**

## What Happened

Created `StepPairSelector.tsx` with all content from learn.py step 1: 3 curated pair suggestion cards (BTC×ETH "Cointegrated" green, SOL×AVAX "Try it" blue, BTC×DOGE "Likely fails" orange), timeframe guidance grid (15m/1h/4h recommended/1d), learning roadmap list (4 items), and EducationalPanel with intuition/mechanics/pairSpecific layers.

Rewrote `academy/page.tsx` from the demo chart placeholder to a full Academy page: AcademyStepper renders 6 steps with free navigation, `useState(0)` drives step dispatch, `useRef<CointCache>` caches cointegration results keyed by `${asset1}-${asset2}-${timeframe}`, and `useEffect` fetches cointegration data when pair/timeframe changes (with cache hit bypass). Step dispatch renders StepPairSelector at step 0, placeholder text for steps 1-2 (T03/T04), and steps 3-5 (S04).

## Verification

- `npx tsc --noEmit` — zero errors ✅
- `npm run build` — exits 0, all pages static ✅
- Browser: /academy renders stepper with 6 labeled steps ✅
- Browser: Step 1 shows 3 pair cards, timeframe grid, learning roadmap, educational panel with 💡 Intuition open by default ✅
- Browser: Clicking BTC×ETH card sets header selects to BTC/ETH ✅
- Browser: POST /api/analysis/cointegration fires on pair selection and returns 200 ✅
- Browser: Clicking stepper steps navigates correctly — step 0 shows full content, steps 1-2 show T03/T04 placeholders, steps 3-5 show S04 placeholder ✅
- Browser: No console errors ✅

### Slice-level verification (partial — T02 is intermediate):
- ✅ Stepper shows 6 labeled steps; clicking any step navigates to it
- ✅ Step 1 shows 3 curated pair cards, timeframe guidance grid, learning roadmap
- ✅ Clicking a pair card populates the header selects (sets global PairContext)
- ⏳ Step 2 shows normalized price chart + correlation badge (T03)
- ⏳ SegmentedControl toggles between normalized and raw price views (T03)
- ⏳ Step 3 shows synthetic concept chart (2 subplots) + real pair badges (T04)
- ✅ Educational panels on each step expand/collapse with all 3 layers
- ⏳ Steps 2-3 without a pair selected show info alert (T03/T04)
- ✅ No console errors or hydration warnings in browser dev tools
- ✅ No TypeScript errors: `npx tsc --noEmit` passes

## Diagnostics

- Navigate to `/academy` — stepper renders 6 steps, step 1 shows all content
- Click any pair card → header selects update → Network tab shows cointegration POST
- Click stepper steps → content switches → placeholder text confirms dispatch
- `console.error` fires if cointegration fetch fails (message includes URL + status code)

## Deviations

- SimpleGrid cols uses responsive object `{ base: 1, sm: 3 }` instead of bare `cols={3}` for better mobile layout. Same for timeframe grid `{ base: 2, sm: 4 }`.
- Added `py="xl"` to placeholder step Text components for visual spacing.

## Known Issues

None.

## Files Created/Modified

- `frontend/components/academy/StepPairSelector.tsx` — new: Step 1 content with curated pair cards, timeframe guidance, learning roadmap, educational panel
- `frontend/app/(dashboard)/academy/page.tsx` — rewritten: Academy page with AcademyStepper, step dispatch, cointegration cache
- `.gsd/milestones/M001/slices/S03/tasks/T02-PLAN.md` — added Observability Impact section (pre-flight fix)
