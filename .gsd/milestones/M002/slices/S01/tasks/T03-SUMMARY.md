---
id: T03
parent: S01
milestone: M002
provides:
  - The first live React research-to-backtest loop with a shareable URL-based preset handoff, live FastAPI-backed research/backtest pages, and explicit empty/loading/error/blocked-result product states
key_files:
  - frontend/lib/api.ts
  - frontend/components/research/LookbackSweepPanel.tsx
  - frontend/components/backtest/BacktestResultView.tsx
  - frontend/app/(dashboard)/research/page.tsx
  - frontend/app/(dashboard)/backtest/page.tsx
  - frontend/components/layout/Sidebar.tsx
  - .gsd/KNOWLEDGE.md
  - .gsd/DECISIONS.md
key_decisions:
  - D020: encode the full research recommendation as `/backtest` URL search params and hydrate the backtest page from that explicit preset instead of hidden client-side state
patterns_established:
  - Research modules can hand off a complete nested `BacktestRequest` by turning it into URL params, which keeps the contract shareable, refresh-safe, and easy to inspect during debugging
  - Honest backtest rendering keeps blocked, empty, warning, and successful states as first-class UI surfaces instead of hiding them behind blank charts
  - Browser automation against Mantine `Select` controls should verify the hidden input value, not just the visible typed text, because typed text alone does not commit selection state
observability_surfaces:
  - `/research` takeaway banner, recommendation card, and deep-link CTA
  - `/backtest` prefill banner plus URL-carried preset values
  - `/backtest` data-quality panel, blocker/warning callouts, trade log, signal/equity charts, and honest-reporting footer
  - inline API error states on both pages
  - browser-verifiable blocked-preflight empty/chart-hidden states
duration: 2h30m
verification_result: passed
completed_at: 2026-03-17 22:29 CET
blocker_discovered: false
---

# T03: Wire the first real React Research → Backtester flow

**Shipped the first live `/research` → `/backtest` React loop with shareable preset deep links, live API rendering, and explicit blocked-run diagnostics.**

## What Happened

I finished the frontend side of the first real research-to-execution loop.

In `frontend/lib/api.ts` I added the typed research and backtest client contracts, including the nested strategy payloads, structured warning/data-quality/footer shapes, and the helper that converts a complete `BacktestRequest` into explicit URL search params for a durable handoff.

In `frontend/components/research/LookbackSweepPanel.tsx` I wired the live lookback-window sweep to the selected pair/timeframe, rendered the returned sweep diagnostics and results table, exposed the takeaway banner, and turned the recommended preset into a deep link to `/backtest` that carries the full request state instead of relying on transient React state.

In `frontend/app/(dashboard)/research/page.tsx` I wrapped the panel in a real page shell that reflects the global pair context and shows a clear empty-state until both assets are selected.

In `frontend/app/(dashboard)/backtest/page.tsx` I built the live backtest page around that URL contract: it parses incoming params into editable controls, syncs the global pair context, reruns the engine with edited settings, rewrites the URL on each rerun, and exposes validation, loading, API error, empty, successful, and blocked-preflight states explicitly.

In `frontend/components/backtest/BacktestResultView.tsx` I rendered the engine response as a full report surface rather than a chart-only view: metrics cards, data-quality status, blocker and warning callouts, equity curve, signal overlay, trade log, and the honest-reporting footer all stay visible together so weak evidence cannot hide behind a pretty result.

In `frontend/components/layout/Sidebar.tsx` I added Research and Backtest to the dashboard navigation so the flow is reachable directly.

I also recorded D020 for the routing decision and added a knowledge-base note about Mantine `Select` behavior in browser automation, because the visible typed text is not enough to prove the shared pair state actually changed.

## Verification

Passed in the root project tree:
- `cd frontend && npm run build`
- `uv run --extra dev python -m pytest tests/test_backtest_engine.py tests/test_backtest_api.py -q`

Live localhost verification on the root app:
- Opened `/research`
- Selected `ETH/EUR × ETC/EUR` on `1h`
- Ran the live lookback sweep and confirmed the page rendered the takeaway, recommendation card, and **Use recommended settings** CTA
- Clicked the CTA and confirmed `/backtest` loaded with the handed-off preset values in the URL and prefilled controls
- Ran the live backtest and confirmed the page rendered the completed result state, including metrics, data-quality status, equity/signal charts, and `72 trade log rows · 144 signal events`
- Confirmed the successful run exposed the recommendation-prefill banner and the `No warnings raised` diagnostic surface
- Forced the deterministic blocking-preflight case with `days_back=7` and `lookback_window=500`, reran the backtest, and confirmed the UI showed `Blocked preflight`, `Charts hidden by design`, and `0 trade log rows · 0 signal events` instead of silent failure

## Diagnostics

To inspect this task later:
- Run `cd frontend && npm run build`
- Start `uv run python run_api.py` and `cd frontend && npm run dev`
- Open `/research`, select a real cached pair, run the sweep, and inspect the rendered recommendation card plus the `/backtest?...` URL produced by the CTA
- On `/backtest`, inspect the prefilling behavior by reloading the page and confirming the controls hydrate from search params
- Run one successful backtest and one blocked run to inspect the `data_quality`, `warnings`, chart visibility, trade-log state, and honest-reporting footer surfaces
- If browser automation against the pair selectors looks wrong, verify the hidden Mantine `Select` inputs changed; typed visible text alone is not proof of committed state

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `frontend/lib/api.ts` — added typed research/backtest client contracts and the URL search-param handoff helper
- `frontend/components/research/LookbackSweepPanel.tsx` — built the live lookback sweep UI, recommendation messaging, and deep-link CTA
- `frontend/components/backtest/BacktestResultView.tsx` — rendered the full honest-reporting backtest result surface including blockers, warnings, charts, trade log, and footer
- `frontend/app/(dashboard)/research/page.tsx` — added the user-facing Research page around the live module and global pair context
- `frontend/app/(dashboard)/backtest/page.tsx` — added the user-facing Backtest page with URL hydration, reruns, and explicit runtime states
- `frontend/components/layout/Sidebar.tsx` — exposed Research and Backtest in dashboard navigation
- `.gsd/DECISIONS.md` — recorded D020 for the URL-based research-to-backtest handoff choice
- `.gsd/KNOWLEDGE.md` — documented the Mantine `Select` browser-automation commit gotcha
