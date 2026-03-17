---
estimated_steps: 4
estimated_files: 3
---

# T04: Create PlotlyChart wrapper with ported dark theme

**Slice:** S02 — Next.js App Shell + Navigation
**Milestone:** M001

## Description

Create a reusable `<PlotlyChart>` client component that wraps `react-plotly.js` with dynamic import (SSR-safe) and automatically applies the `mantine_dark` Plotly template. Prove it works by rendering a demo chart on the Academy placeholder page. This closes requirement R007 (Plotly charts via react-plotly.js with dark theme) and retires the "react-plotly.js in Next.js SSR" risk identified in the milestone roadmap.

**Critical SSR constraint:** `plotly.js` accesses `window` and `document` at import time. The component MUST use `next/dynamic` with `{ ssr: false }` to avoid "window is not defined" build errors. The `'use client'` directive alone is NOT sufficient — dynamic import is also required because Next.js still server-renders client components for the initial HTML.

## Steps

1. **Install Plotly dependencies:**
   ```bash
   cd /Users/luckleineschaars/repos/statistical-arbitrage-v2/frontend
   npm install react-plotly.js plotly.js
   npm install -D @types/react-plotly.js
   ```
   Note: `@types/react-plotly.js` may not exist on npm. If installation fails, skip it and use a local type declaration or inline types.

2. **Create `frontend/components/charts/PlotlyChart.tsx`:**
   - Add `'use client'` directive at top
   - Use `next/dynamic` to import the Plot component:
     ```typescript
     import dynamic from 'next/dynamic';
     
     const Plot = dynamic(() => import('react-plotly.js'), {
       ssr: false,
       loading: () => <Skeleton height={400} radius="md" />,
     });
     ```
   - Import `Skeleton` from `@mantine/core` for loading state
   - Import `PLOTLY_DARK_TEMPLATE` from `@/lib/theme`
   - Component props interface:
     ```typescript
     interface PlotlyChartProps {
       data: Plotly.Data[];
       layout?: Partial<Plotly.Layout>;
       config?: Partial<Plotly.Config>;
       style?: React.CSSProperties;
       className?: string;
     }
     ```
   - Component merges `PLOTLY_DARK_TEMPLATE` into the layout prop:
     ```typescript
     const mergedLayout: Partial<Plotly.Layout> = {
       ...PLOTLY_DARK_TEMPLATE.layout,
       ...layout,
       font: { ...PLOTLY_DARK_TEMPLATE.layout.font, ...layout?.font },
       xaxis: { ...PLOTLY_DARK_TEMPLATE.layout.xaxis, ...layout?.xaxis },
       yaxis: { ...PLOTLY_DARK_TEMPLATE.layout.yaxis, ...layout?.yaxis },
       margin: { ...PLOTLY_DARK_TEMPLATE.layout.margin, ...layout?.margin },
     };
     ```
   - Default config: `{ responsive: true, displayModeBar: false }` (clean look, user can override)
   - Render: `<Plot data={data} layout={mergedLayout} config={mergedConfig} style={{ width: '100%', ...style }} useResizeHandler />`
   - For Plotly types: if `@types/react-plotly.js` is not available, use `any` for the Plot component type and define minimal prop interfaces locally. The important thing is it works, not perfect typing.

3. **Add demo chart to Academy page:**
   - Edit `frontend/app/(dashboard)/academy/page.tsx`
   - Make it a `'use client'` component (since it renders PlotlyChart)
   - Import `PlotlyChart` from `@/components/charts/PlotlyChart`
   - Render existing placeholder content (Title, Text) PLUS a demo chart below:
     ```typescript
     const demoData = [
       {
         x: Array.from({ length: 50 }, (_, i) => i),
         y: Array.from({ length: 50 }, () => Math.random() * 100 + 50),
         type: 'scatter' as const,
         mode: 'lines' as const,
         name: 'Asset 1',
       },
       {
         x: Array.from({ length: 50 }, (_, i) => i),
         y: Array.from({ length: 50 }, () => Math.random() * 80 + 40),
         type: 'scatter' as const,
         mode: 'lines' as const,
         name: 'Asset 2',
       },
     ];
     ```
   - Use a `useMemo` or constant for demo data so it doesn't regenerate on every render
   - Chart with layout title: "Demo: Price Comparison"
   - This demo chart will be replaced in S03 T01 with the real Academy stepper

4. **Verify the critical SSR constraint:**
   - Run `npm run build` — this is the definitive test. The build does full SSR rendering and will fail with "window is not defined" if the dynamic import is wrong.
   - Run `npm run dev` and verify: chart renders on /academy page with dark background, colored traces matching the colorway, no console errors
   - Check that the loading skeleton appears briefly before the chart (Plotly JS takes a moment to load)

## Must-Haves

- [ ] `react-plotly.js` and `plotly.js` installed in frontend/package.json
- [ ] `PlotlyChart` component uses `next/dynamic` with `{ ssr: false }` — NOT just `'use client'`
- [ ] `PlotlyChart` auto-applies `PLOTLY_DARK_TEMPLATE` to all charts (paper/plot bgcolor, font, axis, colorway, margins)
- [ ] Loading state shows Mantine Skeleton while Plotly JS loads
- [ ] Demo chart renders on /academy page with dark theme and 2 colored line traces
- [ ] `npm run build` exits 0 (SSR safety proven)
- [ ] No "window is not defined" or hydration mismatch errors in console

## Verification

- `cd /Users/luckleineschaars/repos/statistical-arbitrage-v2/frontend && npm run build` exits with code 0 (THE critical check — proves no SSR crash)
- `npm run dev` — browser at localhost:3000/academy shows the demo chart with:
  - Dark background (plot area: `rgba(26, 27, 30, 1)`)
  - Two colored line traces
  - Correctly styled axes (muted colors, grid lines)
  - No console errors (check browser dev tools)
- Chart is responsive (resizes with window)

## Inputs

- `frontend/lib/theme.ts` from T01 — `PLOTLY_DARK_TEMPLATE` constant
- `frontend/app/(dashboard)/academy/page.tsx` from T02 — placeholder to add chart to
- `frontend/package.json` from T01/T02 — add plotly dependencies

## Expected Output

- `frontend/components/charts/PlotlyChart.tsx` — reusable SSR-safe Plotly wrapper with dark theme
- `frontend/app/(dashboard)/academy/page.tsx` — updated with demo Plotly chart
- `frontend/package.json` — updated with react-plotly.js, plotly.js dependencies
