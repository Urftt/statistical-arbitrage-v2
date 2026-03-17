---
estimated_steps: 5
estimated_files: 8
---

# T02: Build dashboard AppShell with sidebar navigation and placeholder pages

**Slice:** S02 — Next.js App Shell + Navigation
**Milestone:** M001

## Description

Create the Mantine `<AppShell>` layout with sidebar navigation and header, 4 placeholder pages with route navigation, and active link highlighting. This task produces the visual shell that every downstream slice (S03–S06) builds into. Ports the sidebar structure, header layout, and icon usage from the existing Dash `layout.py`.

**Relevant skill:** `frontend-design` (installed) — load for Mantine component patterns.

The existing Dash layout uses these exact specifications:
- AppShell: header height 60px, navbar width 240px, breakpoint 0 (always visible), padding "lg"
- Sidebar items: Pair Scanner (tabler:search), Pair Deep Dive (tabler:microscope), divider, Academy (tabler:school, desc "Step-by-step guide"), Glossary (tabler:vocabulary, desc "Stat arb terms"), spacer, divider, "StatArb Research v0.1"
- Header: gradient ThemeIcon (blue→cyan) with candle icon, "StatArb Research" text bold lg, then pair selector group (placeholder in this task — wired in T03)
- Research Hub is excluded from M001 scope (deferred to M002)

## Steps

1. **Create `frontend/components/layout/Sidebar.tsx`** — `'use client'` component:
   - Import icons from `@tabler/icons-react`: `IconSearch`, `IconMicroscope`, `IconSchool`, `IconVocabulary`
   - Use `usePathname()` from `next/navigation` for active link detection
   - Render Mantine `<NavLink>` components matching the Dash sidebar structure:
     - Pair Scanner → `/scanner` (IconSearch)
     - Pair Deep Dive → `/deep-dive` (IconMicroscope)
     - `<Divider />`
     - Academy → `/academy` (IconSchool, description: "Step-by-step guide")
     - Glossary → `/glossary` (IconVocabulary, description: "Stat arb terms")
     - Flexible spacer (`<Box style={{ flex: 1 }} />`)
     - `<Divider />`
     - "StatArb Research v0.1" (Text, size xs, dimmed, centered)
   - NavLinks use `component={Link}` from `next/link` for client-side navigation
   - Active state: `active={pathname === href}` with `variant="light"`
   - Wrap in `<Stack gap={0} style={{ height: '100%' }}>` with padding "sm"

2. **Create `frontend/components/layout/Header.tsx`** — `'use client'` component:
   - Left group: Mantine `<ThemeIcon>` with gradient (from blue to cyan, deg 45), size lg, radius md, containing `<IconChartCandle>` (size 22). Next to it: `<Text fw={700} size="lg">StatArb Research</Text>` with letterSpacing -0.3px
   - Right group: 3 Mantine `<Select>` components as placeholders (not wired to context yet — T03 does that):
     - Asset 1: placeholder "Asset 1", searchable, w=160, size sm, left section IconCoin
     - "×" text between them (dimmed, size lg)
     - Asset 2: placeholder "Asset 2", searchable, w=160, size sm, left section IconCoin
     - Timeframe: placeholder "Timeframe", w=100, size sm, left section IconClock, static data: `["15m", "1h", "4h", "1d"]`, default value "1h"
   - Wrap all in `<Group justify="space-between" h="100%" px="md">`

3. **Create `frontend/app/(dashboard)/layout.tsx`** — dashboard route group layout:
   - Import `Sidebar` and `Header` components
   - Import `AppShell` from `@mantine/core`
   - Render `<AppShell>` with props: `header={{ height: 60 }}`, `navbar={{ width: 240, breakpoint: 0 }}`, `padding="lg"`
   - Inside: `<AppShell.Header><Header /></AppShell.Header>`, `<AppShell.Navbar><Sidebar /></AppShell.Navbar>`, `<AppShell.Main>{children}</AppShell.Main>`
   - This is a `'use client'` component (or mark children as needed — AppShell is a client component)

4. **Create placeholder pages** — each is a simple server or client component:
   - `frontend/app/(dashboard)/page.tsx` — redirect to `/academy`:
     ```tsx
     import { redirect } from 'next/navigation';
     export default function DashboardRoot() { redirect('/academy'); }
     ```
   - `frontend/app/(dashboard)/academy/page.tsx`:
     ```tsx
     import { Title, Text, Container } from '@mantine/core';
     export default function AcademyPage() {
       return <Container><Title order={2}>Academy</Title><Text c="dimmed">Step-by-step learning flow — coming soon.</Text></Container>;
     }
     ```
   - `frontend/app/(dashboard)/scanner/page.tsx` — similar with "Pair Scanner" title
   - `frontend/app/(dashboard)/deep-dive/page.tsx` — similar with "Pair Deep Dive" title
   - `frontend/app/(dashboard)/glossary/page.tsx` — similar with "Glossary" title

5. **Remove or update the root `app/page.tsx`** from T01 — it should no longer be needed since the `(dashboard)` route group handles `/`. If the root `page.tsx` conflicts with the dashboard redirect, remove it and let the route group's `page.tsx` handle the root path. **Verify there is no conflict** — Next.js route groups with `(dashboard)/page.tsx` serve the `/` path.

## Must-Haves

- [ ] `<AppShell>` renders with 240px sidebar and 60px header in dark theme
- [ ] Sidebar has all 4 NavLink items with correct icons, labels, and href paths
- [ ] Header shows logo with gradient icon and "StatArb Research" title
- [ ] Header has 3 Select placeholders (asset1, asset2, timeframe)
- [ ] All 4 routes render their placeholder content: `/academy`, `/scanner`, `/deep-dive`, `/glossary`
- [ ] Root `/` redirects to `/academy`
- [ ] Active NavLink highlights based on current route
- [ ] Sidebar NavLinks use Next.js `<Link>` for client-side navigation (no full page reloads)
- [ ] `npm run build` exits 0

## Verification

- `cd /Users/luckleineschaars/repos/statistical-arbitrage-v2/frontend && npm run build` exits with code 0
- `npm run dev` — browser at localhost:3000 shows AppShell with dark sidebar and header
- Clicking "Pair Scanner" in sidebar → URL changes to /scanner, page shows "Pair Scanner" title
- Clicking "Academy" → URL /academy, shows "Academy" title
- Clicking "Glossary" → URL /glossary, shows "Glossary" title
- Clicking "Pair Deep Dive" → URL /deep-dive, shows "Pair Deep Dive" title
- Visiting localhost:3000 directly → redirects to /academy
- Active sidebar link is highlighted

## Inputs

- `frontend/` project from T01 with Mantine configured, `lib/theme.ts` with theme object
- Dash layout structure (provided above in step descriptions — ported from `src/statistical_arbitrage/app/layout.py`)

## Expected Output

- `frontend/app/(dashboard)/layout.tsx` — AppShell layout with Sidebar + Header
- `frontend/components/layout/Sidebar.tsx` — sidebar navigation with 4 NavLinks
- `frontend/components/layout/Header.tsx` — header with logo and placeholder selects
- `frontend/app/(dashboard)/page.tsx` — redirect to /academy
- `frontend/app/(dashboard)/academy/page.tsx` — Academy placeholder
- `frontend/app/(dashboard)/scanner/page.tsx` — Scanner placeholder
- `frontend/app/(dashboard)/deep-dive/page.tsx` — Deep Dive placeholder
- `frontend/app/(dashboard)/glossary/page.tsx` — Glossary placeholder
