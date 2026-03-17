---
estimated_steps: 5
estimated_files: 2
---

# T01: Build StepCointegrationTest component and wire step 4 into Academy

**Slice:** S04 — Academy Steps 4-6 (Cointegration → Z-Score & Signals)
**Milestone:** M001

## Description

Build the Step 4 (Cointegration Test) component — the simplest of the three new steps. It displays the ADF test results visually (number line chart with critical value zones), a regression scatter plot showing the hedge ratio, and a pass/fail verdict. This proves the data display pattern works for steps 4-6 and establishes the component structure that Steps 5-6 will follow. Ports content from the existing Dash `learn.py` implementation.

**Relevant skills:** `frontend-design` (for component structure and styling patterns).

## Steps

1. **Create `frontend/components/academy/StepCointegrationTest.tsx`** — a `'use client'` component. Define props interface matching the S03 step pattern:
   ```typescript
   interface StepCointegrationTestProps {
     cointegrationData: CointegrationResponse | null;
     ohlcv1: OHLCVResponse | null;
     ohlcv2: OHLCVResponse | null;
     loading: boolean;
     asset1: string;
     asset2: string;
   }
   ```
   Import types from `@/lib/api`: `CointegrationResponse`, `OHLCVResponse`. Import from `plotly.js`: `Data`, `Layout`, `Shape`, `Annotations`. Import Mantine components: `Alert`, `Badge`, `Group`, `Paper`, `Skeleton`, `Stack`, `Text`, `Title`, `Code`, `List`, `SimpleGrid`. Import `PlotlyChart` from `@/components/charts/PlotlyChart` and `EducationalPanel` from `./EducationalPanel`. Import `IconFlask`, `IconInfoCircle` from `@tabler/icons-react`.

2. **Build the ADF number line chart** as a memoized sub-component or useMemo block. This is a horizontal visual showing the ADF test statistic relative to critical values:
   - Use Plotly `shapes` (type: `'rect'`) for 4 colored zones: reject at 1% (green, `rgba(81,207,102,0.15)`), reject at 5% (yellow, `rgba(252,196,25,0.12)`), reject at 10% (red faint, `rgba(255,107,107,0.10)`), fail to reject (very faint red, `rgba(255,107,107,0.05)`). Zones span from `x_min` to `cv_1pct`, `cv_1pct` to `cv_5pct`, etc.
   - Use Plotly `annotations` for critical value labels (e.g., "1%: -3.43") at the boundary lines.
   - Use a `shapes` array for vertical lines at each critical value (`type: 'line'`, x0=x1=cv_value, y0=0, y1=1).
   - Add a single scatter trace for the test statistic diamond marker (`mode: 'markers+text'`, symbol `'diamond'`, size 18, colored green if cointegrated / red if not, text showing `ADF = X.XXX`).
   - Layout: height 200, yaxis `visible: false`, range `[0, 1]`. xaxis title `{ text: '← More negative = stronger evidence against unit root' }`.
   - **Critical**: use `title: { text: '...' }` object form for all Plotly titles. Use `as Partial<Shape>` type assertion for shapes.

3. **Build the regression scatter plot** as a memoized sub-component or useMemo block:
   - Scatter trace: `x = ohlcv2.close`, `y = ohlcv1.close`, mode `'markers'`, marker `{ size: 4, opacity: 0.4 }`.
   - OLS line trace: compute `fitted = hedge_ratio * ohlcv2.close[i] + intercept` for each point. Sort by x-value for a clean line. Mode `'lines'`, color `#FF6B6B`, width 3. Name shows the regression equation: `OLS: {asset1} = {hedge:.2f} × {asset2} + {intercept:.0f}`.
   - Layout: height 380, hovermode `'closest'`, legend horizontal at bottom.

4. **Build the main component body** following the S03 step pattern exactly:
   - **No-pair state**: Paper wrapper with StepHeader + Alert "No pair selected" (blue, light variant).
   - **Loading state**: Paper + StepHeader + Skeleton placeholders.
   - **Data state**: Paper + StepHeader + traffic light Alert (green "✓ PASS" / orange "✗ FAIL" with p-value Badge) + ADF number line chart + descriptive text + regression scatter chart + descriptive text + hedge ratio card (Paper with violet Badge `β = X.XXXX` and explanation text) + EducationalPanel.
   - **StepHeader**: Group with IconFlask + Title "Cointegration Test" + description text.
   - **EducationalPanel content** — port from Dash learn.py:
     - 💡 Intuition: drunk person and dog on leash analogy for cointegration. ADF test checks for "snap-back" force.
     - 🔧 How It Works: Engle-Granger two-step procedure (regression → ADF on residuals). Include Code block for formulas. Explain null hypothesis.
     - 📊 Your Pair: Show actual test statistic, p-value, hedge ratio. Interpret whether test statistic exceeds critical value. Position sizing implication.

5. **Wire into page.tsx** — Add import for `StepCointegrationTest` and add `case 3:` to the switch statement:
   ```typescript
   case 3:
     return (
       <StepCointegrationTest
         cointegrationData={cointData}
         ohlcv1={ohlcv1}
         ohlcv2={ohlcv2}
         loading={cointLoading}
         asset1={asset1}
         asset2={asset2}
       />
     );
   ```
   Run `cd frontend && npm run build` to verify.

## Must-Haves

- [ ] ADF number line chart renders with colored significance zones and diamond marker at test statistic
- [ ] Regression scatter plot shows price pairs with OLS regression line
- [ ] Hedge ratio displayed as violet badge with position sizing explanation
- [ ] Pass/fail traffic light alert with p-value badge (green/red color coding)
- [ ] EducationalPanel with all 3 layers populated (Intuition, How It Works, Your Pair)
- [ ] "No pair selected" alert when no pair is chosen
- [ ] `npm run build` exits 0

## Verification

- `cd frontend && npx tsc --noEmit` — zero TypeScript errors
- `cd frontend && npm run build` — exits 0
- Runtime: navigate to Academy → select pair → click step 4 → ADF number line chart renders with diamond marker, scatter plot renders with OLS line, hedge ratio badge visible, pass/fail alert visible, educational panel expands with content

## Inputs

- `frontend/app/(dashboard)/academy/page.tsx` — existing Academy page with step dispatch switch, data fetching, and caching. Steps 0-2 already wired. Step 4 = switch case 3.
- `frontend/components/academy/EducationalPanel.tsx` — 3-layer accordion component accepting `intuition`, `mechanics`, `pairSpecific` as ReactNode props.
- `frontend/components/charts/PlotlyChart.tsx` — Plotly wrapper that deep-merges dark theme into xaxis/yaxis. Uses `next/dynamic` with `ssr: false`.
- `frontend/lib/api.ts` — `CointegrationResponse` type with `cointegration_score`, `p_value`, `critical_values` (CriticalValues with `one_pct`, `five_pct`, `ten_pct`), `is_cointegrated`, `hedge_ratio`, `intercept`, `spread`, `zscore`, `half_life`, `correlation`, `spread_stationarity`, `spread_properties`, `interpretation`, `timestamps`. `OHLCVResponse` type with `close: number[]`, `timestamps: number[]`.
- `frontend/lib/theme.ts` — `PLOTLY_DARK_TEMPLATE` with dark axis styles for manual application.
- **Dash reference**: `src/statistical_arbitrage/app/pages/learn.py` lines 837-1120 — `_build_adf_number_line()`, `_build_regression_scatter()`, `_step_cointegration_test()`. Port the chart logic and educational text.

**Key Plotly TypeScript constraints (from KNOWLEDGE.md):**
- `Layout.title` must be `{ text: string }` object, never bare string
- `LayoutAxis.title` must be `{ text: string, font?: {...} }` object
- Use `Partial<Shape>` for shapes array elements
- Spread `DARK_AXIS_STYLE` pattern before explicit overrides to avoid TS2783
- PlotlyChart only merges dark theme into xaxis/yaxis — if using xaxis2/yaxis2, manually apply dark axis styles

**S03 step component pattern to follow:**
- `'use client'` directive at top
- Props interface with cointegrationData, ohlcv1/2, loading, asset1, asset2
- No-pair → Alert, Loading → Skeleton, Data → full render
- StepHeader sub-component with icon + title + description
- Charts via `useMemo` returning `{ data, layout }` passed to `<PlotlyChart data={data} layout={layout} />`
- EducationalPanel at end of component with all 3 layers

## Expected Output

- `frontend/components/academy/StepCointegrationTest.tsx` — new ~350-line component with ADF number line chart, regression scatter, hedge ratio card, traffic light alert, educational panel
- `frontend/app/(dashboard)/academy/page.tsx` — modified with 1 new import + 1 new switch case (case 3)
