---
id: T01
parent: S03
milestone: M001
provides:
  - CriticalValues, StationarityResult, SpreadProperties TypeScript interfaces
  - Extended CointegrationResponse with all API fields
  - AcademyStepper component with 6-step navigator
  - EducationalPanel component with 3-layer accordion
  - TEACHING_STEPS array export for downstream reuse
key_files:
  - frontend/lib/api.ts
  - frontend/components/academy/AcademyStepper.tsx
  - frontend/components/academy/EducationalPanel.tsx
key_decisions: []
patterns_established:
  - Academy components use 'use client' directive, Mantine primitives, and @tabler/icons-react with size=18 stroke=1.5 (consistent with Sidebar.tsx)
  - EducationalPanel accepts ReactNode props for content injection — keeps component agnostic to step-specific content
  - TEACHING_STEPS registry exported from AcademyStepper for cross-component reuse
observability_surfaces:
  - tsc --noEmit catches type drift between CointegrationResponse and api/schemas.py
  - npm run build validates SSR safety of new components
duration: 8m
verification_result: passed
completed_at: 2026-03-17T13:19:00+01:00
blocker_discovered: false
---

# T01: Extend API types and build shared Academy components

**Extended CointegrationResponse with all backend fields and built AcademyStepper + EducationalPanel shared components**

## What Happened

1. Added 3 new interfaces to `frontend/lib/api.ts`: `CriticalValues`, `StationarityResult`, `SpreadProperties` — each matching the Pydantic models in `api/schemas.py` field-for-field.
2. Extended `CointegrationResponse` with 6 new fields: `critical_values`, `intercept`, `interpretation`, `half_life_note`, `spread_stationarity`, `spread_properties`.
3. Created `AcademyStepper.tsx` — Mantine `<Stepper>` with 6 steps from `TEACHING_STEPS` registry, free navigation via `allowNextStepsSelect`, controlled active/onStepClick props. Icons from `@tabler/icons-react`.
4. Created `EducationalPanel.tsx` — Mantine `<Accordion multiple variant="separated">` with 3 items (💡 Intuition, 🔧 How It Works, 📊 Your Pair). Intuition opens by default. Content passed as ReactNode props.

## Verification

- `cd frontend && npx tsc --noEmit` — **passed** (zero errors, 5s)
- `cd frontend && npm run build` — **passed** (exit 0, 10.5s, all 8 routes generated)
- Both new component files compile and are importable

### Slice-level verification (partial — T01 is first task):
- ✅ `npm run build` exits 0
- ⬜ Stepper visible at /academy (needs T02 page wiring)
- ⬜ Step 1 content (needs T02)
- ⬜ Step 2 charts (needs T03)
- ⬜ Step 3 concept chart + badges (needs T04)
- ⬜ Educational panels on each step (needs T02-T04)

## Diagnostics

- TypeScript compilation (`npx tsc --noEmit`) catches any field mismatch between `CointegrationResponse` and API usage
- Build exit code confirms SSR safety — no `window`/`document` access in these components
- Import errors from downstream files will surface at compile time if component paths or exports change

## Deviations

None

## Known Issues

None

## Files Created/Modified

- `frontend/lib/api.ts` — Added CriticalValues, StationarityResult, SpreadProperties interfaces; extended CointegrationResponse with 6 new fields
- `frontend/components/academy/AcademyStepper.tsx` — New: 6-step stepper with TEACHING_STEPS registry, free navigation, icon support
- `frontend/components/academy/EducationalPanel.tsx` — New: 3-layer educational accordion with Intuition open by default
- `.gsd/milestones/M001/slices/S03/tasks/T01-PLAN.md` — Added Observability Impact section (pre-flight fix)
