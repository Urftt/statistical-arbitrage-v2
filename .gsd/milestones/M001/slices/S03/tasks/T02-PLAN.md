---
estimated_steps: 5
estimated_files: 2
---

# T02: Build Step 1 (StepPairSelector) and wire Academy page

**Slice:** S03 — Academy Step Engine + First 3 Steps
**Milestone:** M001

## Description

Build the Step 1 content component (static pair selection guidance with curated suggestion cards) and rewrite the Academy page to wire the stepper, step dispatching, and cointegration result caching. This validates the stepper→step architecture without any API data dependency — step 1 is entirely static content.

**Relevant skill:** `frontend-design` — for card layouts, Mantine Paper/Badge/SimpleGrid patterns.

## Steps

1. **Create `frontend/components/academy/StepPairSelector.tsx`** — A `'use client'` component:
   - Import `usePairContext` from `@/contexts/PairContext` to access `setAsset1`, `setAsset2`
   - **Intro section:** Step header with icon (IconCoin), title "Select Your Pair", subtitle "Choose two assets to analyze"
   - **Curated pair cards:** 3 clickable `<Paper>` components in a `<SimpleGrid cols={3}>`:
     - BTC × ETH: Badge "Cointegrated" (green), description about largest crypto assets, good first pair
     - SOL × AVAX: Badge "Try it" (blue), description about L1 competitors, may or may not cointegrate
     - BTC × DOGE: Badge "Likely fails" (orange), description about different asset classes, educational failure
     - Each card `onClick` calls `setAsset1("BTC")` / `setAsset2("ETH")` etc. via PairContext — this populates the header selects
     - Cards should have `style={{ cursor: 'pointer' }}` and a hover effect (Mantine `withBorder`, `bg="dark.7"`)
   - **Timeframe guidance:** `<SimpleGrid cols={4}>` with 4 timeframes (15m, 1h, 4h recommended/filled, 1d) — each showing a Badge + description. Match text from learn.py lines ~357-397
   - **Learning roadmap:** `<List>` with 4 items: price comparison, cointegration test, spread analysis, z-score signals. Match learn.py lines ~400-407
   - **Educational panel:** `<EducationalPanel>` with:
     - Intuition: "Two dogs on leashes" analogy (from learn.py step 1 placeholder)
     - Mechanics: Price comparison normalizes both assets to common base, Pearson correlation
     - Your Pair: "Select a pair above to see how your chosen assets move together."

2. **Rewrite `frontend/app/(dashboard)/academy/page.tsx`**:
   - Remove the old demo chart placeholder entirely
   - `'use client'` directive at top
   - Import: `AcademyStepper`, `StepPairSelector`, `usePairContext`, `postCointegration`, `CointegrationResponse`
   - Local state: `const [activeStep, setActiveStep] = useState(0)`
   - **Cointegration cache:** Use `useRef<{ key: string; data: CointegrationResponse } | null>(null)` to cache the last cointegration result. Key format: `${asset1}-${asset2}-${timeframe}`. This avoids re-fetching when navigating between steps.
   - **Fetch effect:** `useEffect` that watches `[asset1, asset2, timeframe]` — when both assets are selected, check if cache key matches; if not, call `postCointegration({ asset1: \`${asset1}/EUR\`, asset2: \`${asset2}/EUR\`, timeframe })` and update cache. Set loading/error state.
   - **Step dispatch:** Render step content based on `activeStep`:
     - 0 → `<StepPairSelector />`
     - 1 → placeholder `<Text>Step 2: Price Comparison — coming in T03</Text>`
     - 2 → placeholder `<Text>Step 3: Correlation vs Cointegration — coming in T04</Text>`
     - 3-5 → placeholder `<Text>Steps 4-6 coming in S04</Text>`
   - Layout: `<Container>` → `<Stack gap="lg">` → Page title → `<AcademyStepper>` → step content
   - Pass cointegration data, loading state, and error state as needed to step components (for T03/T04 to consume)

3. **Verify TypeScript:** `cd frontend && npx tsc --noEmit`

4. **Verify build:** `cd frontend && npm run build` — exits 0

5. **Visual check:** Start dev server, navigate to /academy:
   - Stepper shows 6 steps, clicking navigates between them
   - Step 1 shows pair cards, timeframe guidance, learning roadmap, educational panel
   - Clicking "BTC × ETH" card updates header selects to BTC and ETH

## Must-Haves

- [ ] Academy page renders AcademyStepper with 6 navigable steps
- [ ] Step 1 shows 3 curated pair cards that set PairContext on click
- [ ] Step 1 shows timeframe guidance and learning roadmap
- [ ] Step 1 shows EducationalPanel with 3 layers
- [ ] Cointegration result cache exists at page level (useRef keyed by asset1-asset2-timeframe)
- [ ] `npm run build` exits 0

## Verification

- `cd frontend && npx tsc --noEmit` passes
- `cd frontend && npm run build` exits 0
- Navigate to localhost:3000/academy → stepper visible → step 1 shows pair cards → clicking card populates header selects
- Clicking stepper steps navigates between them (step 0 shows content, others show placeholders)

## Inputs

- `frontend/components/academy/AcademyStepper.tsx` — from T01 (Stepper component)
- `frontend/components/academy/EducationalPanel.tsx` — from T01 (Accordion component)
- `frontend/contexts/PairContext.tsx` — existing global pair state with `setAsset1`, `setAsset2` setters
- `frontend/lib/api.ts` — `postCointegration()` function and `CointegrationResponse` interface (extended in T01)
- `src/statistical_arbitrage/app/pages/learn.py` — lines 300-418 for step 1 content (pair cards, timeframe guidance, learning roadmap text). Lines 144-195 for educational panel placeholder text.

## Expected Output

- `frontend/components/academy/StepPairSelector.tsx` — new file with static step 1 content, pair cards wired to PairContext
- `frontend/app/(dashboard)/academy/page.tsx` — rewritten from demo placeholder to full Academy page with stepper, step dispatch, and cointegration cache
