# Decisions Register

<!-- Append-only. Never edit or remove existing rows.
     To reverse a decision, add a new row that supersedes it.
     Read this file at the start of any planning or research phase. -->

| # | When | Scope | Decision | Choice | Rationale | Revisable? |
|---|------|-------|----------|--------|-----------|------------|
| D001 | M001 | arch | Frontend framework | Next.js (React) replacing Dash | Dash callback model caused jank; React gives full UX control needed for guided Academy experience | No |
| D002 | M001 | arch | Backend framework | FastAPI wrapping existing Python analysis | analysis/research.py already has zero Dash imports; natural separation. FastAPI adds OpenAPI docs, async, Pydantic validation | No |
| D003 | M001 | arch | Frontend-backend communication | REST API (FastAPI → Next.js) | Simple, well-understood, sufficient for the workload. No need for GraphQL or WebSockets yet | Yes — if real-time trading needs streaming |
| D004 | M001 | data | Data pipeline | Keep existing CCXT/Bitvavo → parquet cache as-is | Working pipeline with months of data. API layer wraps it, doesn't replace it | No |
| D005 | M001 | scope | Exchange support | Bitvavo only, no multi-exchange abstraction | User preference. Keeps scope focused. Revisit only if trading scope expands | Yes — if user wants other exchanges |
| D006 | M001 | convention | DataFrame library | Polars (not Pandas) for all dataframe operations | Existing codebase convention. Polars is faster and more explicit | No |
| D007 | M001 | arch | Chart library | Plotly via react-plotly.js | Existing chart code produces Plotly figures. react-plotly.js renders them natively in React | No |
| D008 | M001 | scope | Deployment target | Local development only (laptop) | Server deployment deferred until live trading proves viable | Yes — migrate to home server for M004 |
| D009 | M001 | convention | Platform transparency | Every formula, assumption, and decision visible to user | Core value anchor. Applies to Academy, Research, and Backtesting equally. Platform must never feel like a black box | No |
| D010 | M001/S03 | arch | Academy step rendering architecture | Standalone 'use client' step components dispatched by activeStep index in page.tsx, with data fetched at page level and passed as props | Separates data fetching from rendering. Page-level fetch + cache (useRef keyed by asset1-asset2-timeframe) avoids redundant API calls when navigating between steps | No |
| D011 | M001/S03 | convention | Plotly subplot implementation in react-plotly.js | Manual dual-axis positioning (xaxis/xaxis2 with domain splits) instead of make_subplots | react-plotly.js has no subplot helper like Python's make_subplots. Manual domain positioning gives full control. Must manually apply dark theme to xaxis2/yaxis2 | No |
| D012 | M001/S03 | convention | SSR-safe synthetic chart data | Deterministic seededRandom() PRNG instead of Math.random() | Math.random() produces different values on server vs client, causing React hydration mismatches. Seeded PRNG ensures identical output on both render passes | No |
| D013 | M001/S05 | frontend-performance | How Scanner executes large batch cointegration scans | Run pair scans in chunks of 5 concurrent requests with progress tracking | Chunked concurrency avoids overwhelming the local FastAPI backend while still giving responsive progress feedback and predictable failure handling. | Yes |
| D014 | M001/S05 | frontend-data | How Deep Dive derives configurable z-scores | Recompute z-scores client-side from the returned spread and keep OHLCV fetches aligned with the selected history window | The cointegration endpoint hardcodes a 60-period z-score, so client-side recomputation preserves the page's z-score-window control without changing the backend contract. | Yes |
| D015 | M001/S06/T03 | frontend-shell | How to handle the Mantine-generated hydration mismatch that appeared during final dev-stack UAT. | Render the dashboard AppShell only after mount in the client layout. | The final live pass surfaced SSR/client id and classname mismatches from Mantine layout primitives. Mount-gating the dashboard shell removed the mismatch cleanly while preserving the real runtime behavior needed for local UAT and keeping the static gate green. | Yes |
