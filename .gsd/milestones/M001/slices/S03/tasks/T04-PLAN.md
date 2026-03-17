---
estimated_steps: 5
estimated_files: 2
---

# T04: Build Step 3 (StepCorrelationVsCointegration) — concept chart + pair badges

**Slice:** S03 — Academy Step Engine + First 3 Steps
**Milestone:** M001

## Description

Build the Correlation vs Cointegration step — the conceptual heart of the Academy. This step combines a synthetic concept chart (side-by-side Plotly subplots showing correlated-but-drifting vs cointegrated pairs) with real pair comparison badges from the API. This retires the Plotly subplot risk and completes the S03 scope.

**Relevant skill:** `frontend-design` — for subplot layout, badge comparison display.

## Steps

1. **Create `frontend/components/academy/StepCorrelationVsCointegration.tsx`** — A `'use client'` component:
   - **Props:** `{ cointegrationData: CointegrationResponse | null; loading: boolean; asset1: string; asset2: string }`

   - **Deterministic PRNG:** Port the `pseudoRandom` seeded pattern from the S02 demo chart (already in the codebase at `frontend/app/(dashboard)/academy/page.tsx` before T02 rewrote it — use the same algorithm). The seed function takes a string, produces deterministic floats in [-1, 1]. Do NOT use `Math.random()` — it causes hydration mismatches in SSR.
     ```typescript
     function seededRandom(seedStr: string) {
       let seed = 0;
       for (let i = 0; i < seedStr.length; i++) {
         seed = (seed * 31 + seedStr.charCodeAt(i)) | 0;
       }
       return () => {
         seed = (seed * 16807 + 12345) & 0x7fffffff;
         return (seed / 0x7fffffff) * 2 - 1;
       };
     }
     ```

   - **Concept chart (always rendered — uses synthetic data only):**
     - Port logic from `_build_concept_chart()` in learn.py (lines 632-698)
     - Generate 300 data points using the deterministic PRNG
     - **Left subplot: "Correlated but NOT Cointegrated"** — Two correlated random walks that drift apart:
       - Generate two cumulative products of returns with shared variance (simulate correlated walks)
       - Start both at 100, apply random returns with positive covariance
     - **Right subplot: "Cointegrated"** — Two series sharing a trend with mean-reverting spread:
       - Shared trend: cumulative sum of small random increments
       - Series A: 100 + trend + noise
       - Series B: 50 + 0.5×trend + noise
       - Normalize both to base 100
     - **Plotly multi-axis layout** (this is the subplot pattern for react-plotly.js):
       - 4 traces total: 2 for left subplot (xaxis: 'x', yaxis: 'y'), 2 for right (xaxis: 'x2', yaxis: 'y2')
       - Layout must define `xaxis`, `xaxis2`, `yaxis`, `yaxis2` and use `grid: { rows: 1, columns: 2, pattern: 'independent' }` OR manually position axes:
         ```
         xaxis: { domain: [0, 0.45], title: 'Time' },
         xaxis2: { domain: [0.55, 1], title: 'Time' },
         yaxis: { title: 'Normalized Price', anchor: 'x' },
         yaxis2: { anchor: 'x2' },
         ```
       - Use layout `annotations` for subplot titles: "Correlated but NOT Cointegrated" above left, "Cointegrated" above right
       - Height: 350, margin top: 60 (to accommodate annotations)
       - Set `showlegend: false` on all traces (subplots are self-explanatory)
     - Render via `<PlotlyChart data={traces} layout={subplotLayout} />`
     - **Note:** The PlotlyChart wrapper deep-merges xaxis/yaxis from the dark template. For xaxis2/yaxis2, pass them explicitly — the template only has xaxis/yaxis. The merge will apply template styles to xaxis/yaxis and leave xaxis2/yaxis2 as-is, so copy the gridcolor/zerolinecolor/tickfont styles to xaxis2/yaxis2 manually for visual consistency.

   - **Pair comparison section (only when pair is selected):**
     - If `!asset1 || !asset2`: show Mantine `<Alert>` "Select a pair to see the comparison" (concept chart still visible above)
     - If `loading`: show `<Skeleton height={100} />`
     - If `cointegrationData` available, render a centered `<Group>` with 3 stat blocks:
       - **Correlation:** dimmed label + filled Badge `r = {correlation.toFixed(3)}` colored by strength (green ≥0.7, yellow ≥0.3, red <0.3)
       - **Cointegration:** dimmed label + filled Badge "Cointegrated" (green) or "Not Cointegrated" (orange)
       - **p-value:** dimmed label + light Badge `p = {p_value.toFixed(4)}` colored green if <0.05, orange otherwise
       - Vertical `<Divider orientation="vertical">` between each block
     - Below badges: conditional interpretation text:
       - If cointegrated: "✓ Good news: {asset1} and {asset2} are cointegrated (p=X.XXXX < 0.05). The spread is statistically mean-reverting — this is what we need for pairs trading."
       - If not cointegrated: "⚠ {asset1} and {asset2} are NOT cointegrated (p=X.XXXX ≥ 0.05). Their prices may move together but the gap drifts without reverting."

   - **Educational panel:** `<EducationalPanel>` with content from learn.py lines 778-830:
     - Intuition: Restaurant / bill-splitting analogy — correlation = going to same restaurant, cointegration = splitting the bill
     - Mechanics: List of key differences (correlation changes over time vs cointegration structural; high correlation ≠ cointegration; low correlation ≠ no cointegration; cointegration gives tradeable spread). Mention Engle-Granger test.
     - Your Pair: Conditional text — if data available, show "correlation = X.XXX, cointegrated = Yes/No (p = X.XXXX)" with context. If not: "Select a pair to see the comparison."

2. **Update `frontend/app/(dashboard)/academy/page.tsx`** — Wire step 3:
   - Import `StepCorrelationVsCointegration`
   - Update step dispatch: activeStep 2 → `<StepCorrelationVsCointegration cointegrationData={cointData} loading={loading} asset1={asset1} asset2={asset2} />`
   - No new API calls needed — step 3 reuses the cointegration data already fetched for step 2

3. **Verify TypeScript:** `cd frontend && npx tsc --noEmit`

4. **Verify build:** `cd frontend && npm run build` — exits 0 (critical: subplot layout must not break SSR)

5. **Full slice runtime verification:** With FastAPI running at :8000 and Next.js at :3000:
   - Navigate to /academy → stepper shows 6 steps
   - Step 1: pair cards visible, clicking card populates header
   - Step 2: price chart renders, correlation badge shows, toggle works
   - Step 3: concept chart shows 2 subplots even WITHOUT pair selected; with pair selected, badges show correct values; educational panel works
   - No console errors in browser dev tools

## Must-Haves

- [ ] Concept chart renders with 2 side-by-side subplots using deterministic synthetic data (no Math.random)
- [ ] Subplot layout uses Plotly multi-axis pattern (xaxis/xaxis2, yaxis/yaxis2) through PlotlyChart wrapper
- [ ] Pair comparison badges show correlation, cointegration status, and p-value from real API data
- [ ] Concept chart renders even when no pair is selected (synthetic data only)
- [ ] Educational panel with correlation vs cointegration analogy and key differences
- [ ] `npm run build` exits 0
- [ ] All 3 steps work end-to-end: stepper navigation, content rendering, API data, charts, panels

## Verification

- `cd frontend && npx tsc --noEmit` passes
- `cd frontend && npm run build` exits 0
- Step 3 concept chart renders with 2 subplots — both subplots show different patterns
- With pair: 3 badges show correct values; interpretation text matches cointegration status
- Without pair: concept chart still visible, "select a pair" alert shown below it
- Full slice walkthrough: steps 1→2→3 all render correctly with working stepper navigation

## Inputs

- `frontend/app/(dashboard)/academy/page.tsx` — from T02/T03 (Academy page with stepper, step dispatch, cointegration cache, OHLCV fetching)
- `frontend/components/academy/EducationalPanel.tsx` — from T01
- `frontend/components/charts/PlotlyChart.tsx` — deep-merges dark theme; must pass xaxis2/yaxis2 explicitly
- `frontend/lib/api.ts` — `CointegrationResponse` with `correlation`, `is_cointegrated`, `p_value` fields
- `src/statistical_arbitrage/app/pages/learn.py` — lines 632-698 for concept chart logic, lines 700-835 for step 3 content and pair comparison layout

## Expected Output

- `frontend/components/academy/StepCorrelationVsCointegration.tsx` — new file with synthetic concept chart (Plotly subplots), pair comparison badges, educational panel
- `frontend/app/(dashboard)/academy/page.tsx` — updated step dispatch for activeStep===2

## Observability Impact

- **Concept chart rendering**: `.js-plotly-plot` CSS selector confirms the subplot chart rendered in the DOM. Both subplots are visible even without a pair selected.
- **Pair comparison badges**: When a pair is selected, 3 badges (Correlation, Cointegration, p-value) appear in the DOM with exact values from the API response. Badge text contains `r = X.XXX`, `Cointegrated`/`Not Cointegrated`, and `p = X.XXXX`.
- **No-pair alert**: When no pair is selected, the "No pair selected" Mantine Alert renders (landmark count increases from 3→4 due to the alert region).
- **API errors**: `console.error('Academy fetch failed: ...')` in `page.tsx` surfaces any fetch failures with URL + status code.
- **Build safety**: `npm run build` exit code 0 confirms SSR safety — the Plotly subplot layout with xaxis2/yaxis2 does not break server rendering.
