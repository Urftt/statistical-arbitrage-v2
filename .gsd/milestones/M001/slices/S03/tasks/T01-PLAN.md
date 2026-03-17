---
estimated_steps: 5
estimated_files: 3
---

# T01: Extend API types and build shared Academy components

**Slice:** S03 — Academy Step Engine + First 3 Steps
**Milestone:** M001

## Description

Extend the `CointegrationResponse` TypeScript interface to match all fields the FastAPI backend actually returns, then build the two shared components that every Academy step depends on: `AcademyStepper` (6-step navigator) and `EducationalPanel` (3-layer knowledge accordion). These are prerequisites for all downstream tasks.

**Relevant skill:** `frontend-design` — for Mantine component patterns and dark theme consistency.

## Steps

1. **Extend `CointegrationResponse` in `frontend/lib/api.ts`** — Add these interfaces and fields to match `api/schemas.py`:
   - Add `CriticalValues` interface: `{ one_pct: number; five_pct: number; ten_pct: number }`
   - Add `StationarityResult` interface: `{ name: string; adf_statistic: number; p_value: number; critical_values: CriticalValues; is_stationary: boolean; interpretation: string }`
   - Add `SpreadProperties` interface: `{ mean: number; std: number; min: number; max: number; median: number; skewness: number; kurtosis: number; autocorr_lag1: number }`
   - Add to existing `CointegrationResponse`: `critical_values: CriticalValues`, `intercept: number`, `interpretation: string`, `half_life_note: string | null`, `spread_stationarity: StationarityResult`, `spread_properties: SpreadProperties`
   - Note: `spread` field type is already `(number | null)[]` — correct per D010/D012

2. **Create `frontend/components/academy/AcademyStepper.tsx`** — A `'use client'` component:
   - Define `TEACHING_STEPS` array with 6 entries matching the Dash `learn.py` definitions:
     ```
     0: "Select Your Pair" / "Choose two assets to analyze" / IconCoin
     1: "Price Comparison" / "Do these assets move together?" / IconChartLine
     2: "Correlation vs Cointegration" / "Why correlation isn't enough" / IconArrowsShuffle
     3: "Cointegration Test" / "Proving the statistical link" / IconFlask
     4: "The Spread" / "Building the trading signal" / IconChartAreaLine
     5: "Z-Score & Signals" / "When to trade" / IconAdjustments
     ```
   - Use `@tabler/icons-react` for icons (already installed)
   - Props: `activeStep: number`, `onStepClick: (step: number) => void`
   - Render Mantine `<Stepper>` with `active={activeStep}`, `onStepClick={onStepClick}`, `allowNextStepsSelect` (so users can freely navigate, not locked-linear)
   - Each `<Stepper.Step>` gets `label`, `description`, and `icon` from the registry
   - Export both the component and the `TEACHING_STEPS` array (S04 may need it)

3. **Create `frontend/components/academy/EducationalPanel.tsx`** — A `'use client'` component:
   - Props: `intuition: ReactNode`, `mechanics: ReactNode`, `pairSpecific: ReactNode`
   - Render Mantine `<Accordion>` with `multiple` variant, `variant="separated"`, `radius="md"`
   - `defaultValue={["intuition"]}` — Intuition panel opens by default (matching Dash behavior)
   - Three `<Accordion.Item>` entries:
     - value="intuition": control label "💡 Intuition" with `IconBulb` icon
     - value="mechanics": control label "🔧 How It Works" with `IconTool` icon
     - value="your-pair": control label "📊 Your Pair" with `IconChartDots` icon
   - Content is passed through as children — caller provides the ReactNode content for each layer

4. **Verify TypeScript:** `cd frontend && npx tsc --noEmit` — zero errors

5. **Verify build:** `cd frontend && npm run build` — exits 0 (SSR safety check)

## Must-Haves

- [ ] `CointegrationResponse` interface includes `critical_values`, `intercept`, `interpretation`, `half_life_note`, `spread_stationarity`, `spread_properties` with correct types matching `api/schemas.py`
- [ ] `AcademyStepper` renders 6 steps with labels, descriptions, and icons; supports free navigation via click
- [ ] `EducationalPanel` renders 3-layer Accordion with Intuition open by default
- [ ] `npm run build` exits 0

## Verification

- `cd frontend && npx tsc --noEmit` passes with zero errors
- `cd frontend && npm run build` exits 0
- AcademyStepper and EducationalPanel are importable from their paths

## Inputs

- `frontend/lib/api.ts` — existing API client with incomplete `CointegrationResponse` (from S02)
- `api/schemas.py` — Python Pydantic models defining the exact API response shape (authoritative reference for field names and types)
- `frontend/components/charts/PlotlyChart.tsx` — existing pattern for `'use client'` + dynamic import (reference for component conventions)
- `@mantine/core` v8.3.17, `@tabler/icons-react` v3.40.0 — already installed

## Observability Impact

- **TypeScript type safety**: `npx tsc --noEmit` catches any mismatch between the `CointegrationResponse` interface and actual API usage across all consuming components. If a downstream task adds a field reference that doesn't exist, tsc will fail.
- **Build verification**: `npm run build` exits 0 confirms SSR safety — no `window`/`document` references in AcademyStepper or EducationalPanel.
- **Import verification**: Any downstream file that imports `AcademyStepper`, `EducationalPanel`, `TEACHING_STEPS`, `CriticalValues`, `StationarityResult`, or `SpreadProperties` will get a compile error if names/paths are wrong.
- **Failure shapes**: If the API schema changes and CointegrationResponse drifts, downstream fetch calls will have type mismatches caught at compile time, not runtime.

## Expected Output

- `frontend/lib/api.ts` — extended with `CriticalValues`, `StationarityResult`, `SpreadProperties` interfaces and 6 new fields on `CointegrationResponse`
- `frontend/components/academy/AcademyStepper.tsx` — new file, exports `AcademyStepper` component and `TEACHING_STEPS` array
- `frontend/components/academy/EducationalPanel.tsx` — new file, exports `EducationalPanel` component
