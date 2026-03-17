---
estimated_steps: 6
estimated_files: 5
---

# T01: Scaffold Next.js project with Mantine dark theme

**Slice:** S02 — Next.js App Shell + Navigation
**Milestone:** M001

## Description

Create the `frontend/` directory with a Next.js App Router project, install Mantine v7+ with dark theme, and configure the root layout. This is pure scaffolding — no pages, no navigation, just a working Next.js + Mantine foundation that builds and renders a dark page. Also ports the Plotly dark template from the existing Dash `layout.py` as a TypeScript constant for T04 to consume.

**Relevant skill:** `frontend-design` (installed) — load for Mantine theme configuration guidance.

## Steps

1. **Scaffold Next.js project:**
   ```bash
   cd /Users/luckleineschaars/repos/statistical-arbitrage-v2
   npx create-next-app@latest frontend --typescript --eslint --app --no-tailwind --no-src-dir --import-alias "@/*"
   ```
   When prompted: use App Router = Yes, Tailwind = No, `src/` directory = No, import alias = `@/*`. If `create-next-app` asks about Turbopack, accept default (it's only for dev mode).

2. **Install Mantine and icon dependencies:**
   ```bash
   cd frontend
   npm install @mantine/core @mantine/hooks @tabler/icons-react
   ```

3. **Configure `next.config.ts`** for Mantine tree-shaking:
   ```typescript
   import type { NextConfig } from "next";
   
   const nextConfig: NextConfig = {
     experimental: {
       optimizePackageImports: ["@mantine/core", "@mantine/hooks"],
     },
   };
   
   export default nextConfig;
   ```

4. **Create `frontend/lib/theme.ts`** with:
   - Mantine theme object: `primaryColor: "blue"`, system font family, dark scheme config
   - `PLOTLY_DARK_TEMPLATE` constant — a complete TypeScript object porting the Plotly template from the existing Dash `layout.py`. Values to port exactly:
     ```
     paper_bgcolor: "rgba(0,0,0,0)"
     plot_bgcolor: "rgba(26, 27, 30, 1)"
     font.color: "#C1C2C5"
     font.family: "-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif"
     grid/zeroline: "rgba(55, 58, 64, 0.8)"
     axis tick/title color: "#909296"
     colorway: ["#339AF0", "#51CF66", "#FF6B6B", "#FCC419", "#CC5DE8", "#20C997", "#FF922B", "#845EF7"]
     margins: { t: 48, b: 40, l: 56, r: 24 }
     ```
   - Export both `theme` and `PLOTLY_DARK_TEMPLATE`.

5. **Create `frontend/app/layout.tsx`** — the root layout:
   - Import `@mantine/core/styles.css`
   - Import `ColorSchemeScript` and `MantineProvider` from `@mantine/core`
   - Import `theme` from `@/lib/theme`
   - The `<html>` tag must receive Mantine HTML props: use `import { mantineHtmlProps } from '@mantine/core'` (Mantine v7.15+) or just set `lang="en" data-mantine-color-scheme="dark"`
   - Place `<ColorSchemeScript defaultColorScheme="dark" />` inside `<head>` to prevent flash of light theme
   - Wrap `{children}` in `<MantineProvider theme={theme} defaultColorScheme="dark">`
   - Set metadata: `title: "StatArb Research"`, `description: "Statistical arbitrage research platform"`
   - **Delete** any default CSS files (`globals.css`, `page.module.css`) and their imports — Mantine handles all styling

6. **Create a minimal `frontend/app/page.tsx`** with just a `<div>` or Mantine `<Text>` saying "StatArb Research" so we can verify the dark theme works. (This file will be replaced/removed in T02 when the dashboard route group is created.)

## Must-Haves

- [ ] `frontend/` directory exists with a working Next.js 14+ App Router project
- [ ] Mantine v7+ installed with `@mantine/core/styles.css` imported in root layout
- [ ] `ColorSchemeScript` in `<head>` prevents light-mode flash
- [ ] `MantineProvider` wraps app with `defaultColorScheme="dark"`
- [ ] `PLOTLY_DARK_TEMPLATE` in `lib/theme.ts` matches the existing Dash Plotly template values exactly
- [ ] No Tailwind CSS installed or configured
- [ ] `npm run build` exits 0

## Verification

- `cd /Users/luckleineschaars/repos/statistical-arbitrage-v2/frontend && npm run build` exits with code 0
- `npm run dev` starts without errors; visiting `http://localhost:3000` shows dark background
- No Tailwind references in `package.json`, `postcss.config.*`, or `tailwind.config.*`
- `lib/theme.ts` exports `PLOTLY_DARK_TEMPLATE` with all required color/font/margin values

## Inputs

- Existing Dash Plotly template values (provided above in step 4 — ported from `src/statistical_arbitrage/app/layout.py`)
- No prior task outputs needed (this is T01)

## Expected Output

- `frontend/package.json` — Next.js + Mantine + @tabler/icons-react dependencies
- `frontend/next.config.ts` — optimizePackageImports for Mantine
- `frontend/app/layout.tsx` — root layout with MantineProvider dark theme
- `frontend/lib/theme.ts` — Mantine theme object + PLOTLY_DARK_TEMPLATE constant
- `frontend/app/page.tsx` — minimal placeholder proving dark theme renders

## Observability Impact

- **Build canary:** `cd frontend && npm run build` — primary signal that the Next.js + Mantine integration is healthy. Non-zero exit = broken foundation for all downstream tasks.
- **Dev server:** `npm run dev` at localhost:3000 — visual confirmation of dark theme. A white/light flash on load indicates missing `ColorSchemeScript`.
- **Browser console:** Hydration warnings in the console indicate Mantine SSR misconfiguration (e.g. missing `mantineHtmlProps` on `<html>`).
- **Theme constant:** `lib/theme.ts` exports `PLOTLY_DARK_TEMPLATE` — downstream PlotlyChart wrapper (T04) will fail to compile if this export is missing or mis-typed.
- **Failure shapes:** Missing `@mantine/core/styles.css` → unstyled components; missing `MantineProvider` → runtime error "useMantineTheme must be used within MantineProvider".
