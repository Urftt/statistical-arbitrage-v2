# S02: Next.js App Shell + Navigation — Research

**Date:** 2026-03-17
**Depth:** Targeted — known technology (Next.js + Mantine) applied to a well-defined Dash app port. The Dash layout and navigation are clear; the main work is translating DMC patterns to Mantine React + Next.js App Router.

## Summary

S02 is greenfield: no `frontend/` directory exists yet. The work is to scaffold a Next.js App Router project with Mantine component library, port the existing Dash AppShell layout (sidebar navigation, header with global pair selector, dark theme), create a `<PlotlyChart>` wrapper, and set up page routing with placeholder content for all pages.

The existing Dash app (`app/layout.py`, `app/main.py`) provides a precise blueprint: 240px sidebar, 60px header, 5 top-level routes with 8 research sub-routes, global pair/timeframe state via session storage, and a `mantine_dark` Plotly template with specific color/font/grid values. The API backend (S01) is already complete with CORS configured for `localhost:3000`.

The main technical concern is `react-plotly.js` + Next.js SSR: Plotly.js requires `window`/`document` and cannot render server-side. This is solved with `next/dynamic(..., { ssr: false })`. Bundle size (~3MB for full plotly.js) is a secondary concern addressable via partial bundles but not blocking for this slice.

## Recommendation

Use Next.js App Router with Mantine v7+ (matching the existing Dash Mantine Components). Do **not** use Tailwind — Mantine handles all styling, and mixing would add complexity for no gain. Use `@tabler/icons-react` for icons (the Dash app already uses tabler icons). Create a React context for global pair/timeframe state (replaces Dash's `dcc.Store`). Wrap `react-plotly.js` in a client-only component via `next/dynamic`.

Project structure: `frontend/` directory at the project root, alongside the existing `api/` and `src/` directories.

## Implementation Landscape

### Key Files

**Existing (Dash — read-only reference for porting):**
- `src/statistical_arbitrage/app/layout.py` — Dash AppShell layout, sidebar navigation with 5 sections + 8 research sub-modules, header with pair selectors, `mantine_dark` Plotly template (colors, fonts, grid). This is the primary blueprint.
- `src/statistical_arbitrage/app/main.py` — Page routing (`/scanner`, `/deep-dive`, `/research/*`, `/learn`, `/glossary`), global pair store sync, pair options population from cache.

**Existing (API — integration target):**
- `api/main.py` — FastAPI app, CORS already allows `localhost:3000`.
- `api/routers/pairs.py` — `GET /api/pairs` returns cached pairs list; needed by global pair selector.
- `api/schemas.py` — Response models, useful for typing the frontend API client.

**New files to create (inside `frontend/`):**

- `frontend/package.json` — deps: `next`, `react`, `@mantine/core`, `@mantine/hooks`, `@tabler/icons-react`, `react-plotly.js`, `plotly.js`
- `frontend/next.config.ts` — `optimizePackageImports` for Mantine tree-shaking
- `frontend/app/layout.tsx` — Root layout: `<MantineProvider>` with dark scheme, `<ColorSchemeScript>`, import `@mantine/core/styles.css`
- `frontend/app/(dashboard)/layout.tsx` — Dashboard layout: `<AppShell>` with sidebar + header. All pages nest inside this.
- `frontend/app/(dashboard)/page.tsx` — Redirect to `/academy`
- `frontend/app/(dashboard)/academy/page.tsx` — Placeholder
- `frontend/app/(dashboard)/scanner/page.tsx` — Placeholder
- `frontend/app/(dashboard)/deep-dive/page.tsx` — Placeholder
- `frontend/app/(dashboard)/glossary/page.tsx` — Placeholder
- `frontend/components/layout/Sidebar.tsx` — NavLink tree matching Dash sidebar structure
- `frontend/components/layout/Header.tsx` — Logo + global pair selector (Select components)
- `frontend/components/charts/PlotlyChart.tsx` — `'use client'` wrapper, dynamically imported with `ssr: false`
- `frontend/contexts/PairContext.tsx` — React context: `{ asset1, asset2, timeframe, setAsset1, ... }`
- `frontend/lib/api.ts` — Fetch wrapper for FastAPI (`localhost:8000`), typed responses
- `frontend/lib/theme.ts` — Mantine theme config (dark colors, fonts) + Plotly template constant (ported from `layout.py`)

### Routing Map (Dash → Next.js)

| Dash Path | Next.js Route | Page File |
|-----------|---------------|-----------|
| `/scanner` | `/scanner` | `app/(dashboard)/scanner/page.tsx` |
| `/deep-dive` | `/deep-dive` | `app/(dashboard)/deep-dive/page.tsx` |
| `/research/*` | `/research/*` | Deferred to M002 |
| `/learn` | `/academy` | `app/(dashboard)/academy/page.tsx` |
| `/glossary` | `/glossary` | `app/(dashboard)/glossary/page.tsx` |

Note: `/learn` is renamed to `/academy` per the milestone language. Research Hub routes are out of scope for M001.

### Build Order

1. **Scaffold Next.js project + Mantine setup** — `npx create-next-app frontend`, add Mantine deps, configure root layout with `MantineProvider` (dark scheme). Prove: `npm run dev` shows a blank dark page at `localhost:3000`.

2. **Dashboard layout with AppShell** — `Sidebar.tsx` + `Header.tsx` + `(dashboard)/layout.tsx`. Port the sidebar navigation links and header structure. Prove: browser shows dark sidebar + header shell with working navigation links.

3. **Global pair context + API client** — `PairContext.tsx` wrapping the dashboard layout, `api.ts` fetching from FastAPI `/api/pairs`. Header pair selectors populated from API. Prove: selects show real pair names fetched from backend.

4. **PlotlyChart wrapper** — Client-only component with dynamic import. Port the `mantine_dark` theme as a JS constant. Prove: a test chart renders inside the shell without SSR errors.

5. **Placeholder pages** — All 4 route pages with title + placeholder text. Prove: clicking sidebar links navigates between pages, each showing its title.

### Verification Approach

- `cd frontend && npm run dev` starts without errors at `localhost:3000`
- Browser shows dark-themed AppShell with sidebar navigation and header
- Clicking each sidebar link navigates to the correct page with placeholder content
- Global pair selects populate with data from `localhost:8000/api/pairs` (requires FastAPI running)
- Selecting a pair in the header updates context (visible via React DevTools or a debug display)
- A test Plotly chart renders correctly with the dark theme, no SSR hydration errors
- `npm run build` succeeds (catches SSR issues that `dev` mode hides)

## Don't Hand-Roll

| Problem | Existing Solution | Why Use It |
|---------|------------------|------------|
| UI component library | Mantine v7 (`@mantine/core`) | Matches existing DMC usage; provides AppShell, NavLink, Select, etc. out of the box |
| Icons | `@tabler/icons-react` | Dash app already uses tabler icon names; direct 1:1 mapping |
| Plotly in React | `react-plotly.js` + `plotly.js` | Decision D007 mandates Plotly; this is the official React wrapper |
| SSR-safe dynamic import | `next/dynamic` with `ssr: false` | Built into Next.js; avoids hydration mismatches for browser-only libs |

## Constraints

- **Mantine v7+ required** — v7 uses CSS modules internally (not Emotion by default). The `@mantine/core/styles.css` import is mandatory. Do NOT install `@mantine/emotion` unless needed — the default CSS approach is simpler.
- **`react-plotly.js` cannot SSR** — Plotly.js accesses `window` and `document` at import time. Every component that renders a chart must be a client component loaded via `next/dynamic(..., { ssr: false })`.
- **`plotly.js` is ~3MB** — The full bundle is large. For M001, use the full bundle and accept the load time. Optimize with `plotly.js-dist-min` or partial bundles in a later polish pass.
- **No Tailwind** — Mantine handles styling. Adding Tailwind alongside Mantine creates conflicting reset styles and adds configuration complexity. Decline Tailwind during `create-next-app` setup.
- **API base URL** — FastAPI runs at `http://localhost:8000`. The frontend API client needs this as a configurable constant (env var `NEXT_PUBLIC_API_URL`).

## Common Pitfalls

- **Plotly SSR crash** — Importing `react-plotly.js` in a server component causes `window is not defined`. Must use `next/dynamic` with `{ ssr: false }` and mark the wrapper as `'use client'`.
- **Mantine dark scheme flicker** — Without `<ColorSchemeScript>` in `<head>`, the page briefly renders in light mode before JS hydrates. Must include `<ColorSchemeScript defaultColorScheme="dark" />` in root layout.
- **`create-next-app` defaults** — The CLI now defaults to Tailwind and Turbopack. Must explicitly decline Tailwind and the `src/` directory option to keep the project structure flat and avoid style conflicts.
- **Mantine + Next.js App Router** — `MantineProvider` is a client component internally. The root layout must pass `{...mantineHtmlProps}` to the `<html>` tag for proper Mantine attribute injection.

## Skills Discovered

| Technology | Skill | Status |
|------------|-------|--------|
| Next.js App Router | `wshobson/agents@nextjs-app-router-patterns` | available (8.8K installs) |
| Mantine | `itechmeat/llm-code@mantine-dev` | available (111 installs) |
| Mantine | `mantinedev/skills@mantine-custom-components` | available (73 installs) |
| Frontend Design | `frontend-design` | installed |

## Ported Theme Values

The `mantine_dark` Plotly template from `layout.py` must be ported as a TypeScript constant. Key values:

```
paper_bgcolor: "rgba(0,0,0,0)"
plot_bgcolor: "rgba(26, 27, 30, 1)"  // Mantine dark[7]
font.color: "#C1C2C5"
font.family: system fonts
grid/zeroline: "rgba(55, 58, 64, 0.8)"
axis tick/title: "#909296"
colorway: ["#339AF0", "#51CF66", "#FF6B6B", "#FCC419", "#CC5DE8", "#20C997", "#FF922B", "#845EF7"]
margins: { t: 48, b: 40, l: 56, r: 24 }
```

## Sidebar Navigation Structure (from Dash)

```
├── Pair Scanner → /scanner
├── Pair Deep Dive → /deep-dive
├── ─────────────
├── Academy → /academy  (renamed from "Learn")
│   └── description: "Step-by-step guide"
├── Glossary → /glossary
│   └── description: "Stat arb terms"
├── (spacer)
└── StatArb Research v0.1
```

Research Hub routes are excluded from M001 scope (deferred to M002).
