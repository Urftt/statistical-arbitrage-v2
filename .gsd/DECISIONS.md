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
