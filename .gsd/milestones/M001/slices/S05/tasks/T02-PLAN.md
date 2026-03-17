---
estimated_steps: 8
estimated_files: 1
---

# T02: Build Deep Dive page with stat cards and 4 analysis charts

**Slice:** S05 — Pair Scanner + Deep Dive Pages
**Milestone:** M001

## Description

Replace the Deep Dive placeholder page with a full single-pair analysis view. The page reads the globally selected pair from PairContext, runs cointegration analysis on button click, and displays 8 summary stat cards plus 4 complementary Plotly charts.

This is a port of the Dash `pair_deep_dive.py` (247 lines) to a React `'use client'` component. The main chart work — dual y-axis, stacked subplots, manual dark theme on secondary axes — was already proven in Academy steps (S03/S04), so patterns are established.

**Key constraints from KNOWLEDGE.md:**
- PlotlyChart only auto-merges `xaxis`/`yaxis` — `xaxis2`/`yaxis2` need manual dark theme application
- Timestamps are epoch-ms — use `new Date(ts).toISOString()` directly, NOT `* 1000`
- Z-score arrays contain nulls for first window-1 values — filter before charting
- `nbinsx` not in Plotly type definitions — cast trace `as Data`
- Plotly Layout.title must be `{ text: string }` object, not bare string
- Use `'text+markers'` not `'markers+text'` for mode union type

**Relevant skill:** `frontend-design` (for Mantine component patterns and chart layouts)

## Steps

1. **Replace the placeholder** in `frontend/app/(dashboard)/deep-dive/page.tsx` with a `'use client'` component. Import `usePairContext`, `postCointegration` and `CointegrationResponse` from `lib/api.ts`, `PlotlyChart` from `components/charts/PlotlyChart.tsx`, `PLOTLY_DARK_TEMPLATE` from `lib/theme.ts`, and Mantine components (`Container`, `Title`, `Text`, `Badge`, `Group`, `Paper`, `SimpleGrid`, `Button`, `Alert`, `Stack`, `NumberInput`, `Skeleton`).

2. **Build the controls section:** A `Paper` with a `Group` containing:
   - `NumberInput` for history days (label "History (days)", default 90, min 7, max 365)
   - `NumberInput` for z-score window (label "Z-score window", default 60, min 5, max 500)
   - "Analyze" `Button` with microscope icon
   - Dimmed text: "Pair and timeframe are set in the header bar above."

3. **Implement the analysis fetch:** On "Analyze" click:
   - Read `asset1`, `asset2`, `timeframe` from `usePairContext()`.
   - Validate both assets selected and different; show yellow Alert if not.
   - Call `postCointegration({ asset1: asset1 + "/EUR", asset2: asset2 + "/EUR", timeframe })`.
   - **Important:** PairContext stores base currencies like "ETH". The API expects full symbols like "ETH/EUR". Construct by appending "/EUR".
   - Store result in state. Show loading skeleton while fetching.
   - Handle errors with a red Alert.

4. **Build the 8 stat cards:** Use Mantine `SimpleGrid` with responsive cols (`{ base: 2, sm: 4, lg: 8 }`). Each card is a `Paper` with colored left border (3px solid), containing: title (dimmed, xs), value (Title order 4), subtitle (dimmed, xs). Cards:
   - Cointegrated? — "✅ Yes" / "❌ No", subtitle: "p = {p_value:.4f}", border: green/red
   - p-value — formatted to 4 decimals, subtitle: "Stat: {score:.2f}", border: blue
   - Half-life — formatted to 1 decimal (or "∞" if null or > 10000), subtitle: "periods", border: blue
   - Correlation — formatted to 3 decimals, subtitle: "Pearson", border: blue
   - Hedge Ratio — formatted to 4 decimals, subtitle: "{asset1} = β × {asset2}", border: blue
   - Skewness — formatted to 2 decimals, subtitle: "spread distribution", border: yellow if |value| > 1 else blue
   - Kurtosis — formatted to 2 decimals, subtitle: "excess (normal=0)", border: yellow if value > 3 else blue
   - Datapoints — integer, subtitle: "overlapping candles", border: gray

5. **Chart 1 — Price Comparison (dual y-axis):** Two scatter traces (mode: "lines") for asset1 and asset2 prices. Use manual dual y-axis: `yaxis` for asset1 (left), `yaxis2` for asset2 (right) with `overlaying: 'y'` and `side: 'right'`. Second trace must specify `yaxis: 'y2'`. **Manually apply dark theme** to `yaxis2` by spreading `PLOTLY_DARK_TEMPLATE.layout.yaxis` styles (gridcolor, zerolinecolor, tickfont, title.font). Same for `xaxis` variants if using subplots. Convert timestamps using `new Date(ts).toISOString()`. Height: 350.

6. **Chart 2 — Spread + Z-score (stacked subplots):** Two vertically stacked panels using manual domain positioning: `yaxis` domain [0.6, 1.0] for spread (top), `yaxis2` domain [0, 0.55] for z-score (bottom). Spread trace: blue line. Z-score trace: red line on `yaxis: 'y2'`, `xaxis: 'x2'`. Add horizontal threshold lines using `shapes` array in layout: ±2.0 (green dashed), ±0.5 (orange dotted), 0 (white faint solid). Add green-tinted rectangles for entry zones (y 2.0→4.0 and -4.0→-2.0) using shapes with `fillcolor`. **Filter null values** from z-score array before creating the trace. Manually apply dark theme to `xaxis2`/`yaxis2`. Height: 500.

7. **Chart 3 — Scatter + Regression:** Scatter trace of asset2 prices (x) vs asset1 prices (y) with small markers (size 3, semi-transparent blue). Add regression line trace: two points from [min(x), max(x)] with y = hedge_ratio * x + intercept. Red dashed line. Height: 350. Use data from `CointegrationResponse` — note: the response doesn't include raw close prices, but it has `spread`, `zscore`, and `timestamps`. For the scatter plot and price chart, we need close prices. Since `postCointegration` doesn't return close prices, fetch them separately using `fetchOHLCV` for both assets — OR compute prices from spread + hedge_ratio (less ideal). **Simplest approach:** call `fetchOHLCV` for both assets alongside the cointegration call to get the close price arrays. Import `fetchOHLCV` from `lib/api.ts`.

8. **Chart 4 — Distribution Histograms:** Side-by-side using manual domain positioning: `xaxis` domain [0, 0.45] for spread histogram, `xaxis2` domain [0.55, 1.0] for z-score histogram. Filter nulls from z-score. Use `nbinsx: 50` (cast `as Data`). Add subplot titles via annotations. Height: 350.

## Must-Haves

- [ ] Controls: days-back input, z-score window input, Analyze button
- [ ] 8 stat cards with correct values, colored borders, responsive grid
- [ ] Price comparison chart with dual y-axis and dark theme on both axes
- [ ] Spread + Z-score stacked subplots with threshold lines and entry zone shading
- [ ] Scatter plot with regression line showing hedge ratio
- [ ] Distribution histograms for spread and z-score
- [ ] Null z-score values filtered before charting
- [ ] Timestamps converted with `new Date(ts).toISOString()` (not * 1000)
- [ ] Error/loading states handled
- [ ] `npm run build` exits 0

## Verification

- `cd frontend && npm run build` — exit 0 (SSR safe, no TypeScript errors)
- Start `uv run python run_api.py` and `cd frontend && npm run dev`
- Navigate to `/deep-dive`
- Select a pair in the header (e.g., ETH + ETC + 1h)
- Click "Analyze"
- 8 stat cards render with real values (p-value, half-life, correlation, etc.)
- 4 charts render with dark theme:
  - Price comparison shows two lines with separate y-axes
  - Spread/z-score shows stacked panels with threshold lines
  - Scatter shows data cloud with regression line
  - Histograms show spread and z-score distributions
- Change pair in header, click "Analyze" again — all cards and charts update

## Inputs

- `frontend/app/(dashboard)/deep-dive/page.tsx` — current placeholder (to be replaced)
- `frontend/app/(dashboard)/scanner/page.tsx` — T01 output (for pattern consistency, if helpful)
- `frontend/contexts/PairContext.tsx` — provides `asset1`, `asset2`, `timeframe`
- `frontend/lib/api.ts` — `postCointegration()`, `fetchOHLCV()`, `CointegrationResponse`, `OHLCVResponse` types
- `frontend/components/charts/PlotlyChart.tsx` — chart wrapper
- `frontend/lib/theme.ts` — `PLOTLY_DARK_TEMPLATE` for manual axis styling on secondary axes
- `src/statistical_arbitrage/app/pages/pair_deep_dive.py` — Dash original for reference (stat cards, chart layouts, threshold lines)

## Expected Output

- `frontend/app/(dashboard)/deep-dive/page.tsx` — fully functional Deep Dive page (~350-450 lines) with 8 stat cards and 4 analysis charts, all using dark theme and real API data
