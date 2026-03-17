---
id: S05
parent: M001
milestone: M001
provides:
  - Scanner page with batch cointegration scans, sorted/highlighted results, p-value histogram, and graceful failed-row handling
  - Deep Dive page with real single-pair analysis, 8 stat cards, and 4 dark-themed Plotly charts
requires:
  - slice: S01
    provides: Cointegration and OHLCV API endpoints backed by cached Bitvavo parquet data
  - slice: S02
    provides: App shell routing, PairContext, and the SSR-safe PlotlyChart wrapper
affects:
  - S06
key_files:
  - frontend/app/(dashboard)/scanner/page.tsx
  - frontend/app/(dashboard)/deep-dive/page.tsx
  - frontend/lib/api.ts
  - .gsd/REQUIREMENTS.md
  - .gsd/DECISIONS.md
key_decisions:
  - Scanner runs pair scans in chunks of 5 concurrent requests so the local FastAPI backend stays responsive while progress remains visible.
  - Deep Dive recomputes configurable z-scores client-side from spread because the backend cointegration endpoint always returns a fixed 60-period z-score.
patterns_established:
  - Batch scan pattern: generate pair combinations -> execute Promise.allSettled in chunks -> update progress state -> sort/highlight rows -> summarize with alert and histogram
  - Deep Dive analysis pattern: fetch cointegration + both OHLCV series in parallel, align closes to analysis timestamps, then derive chart-ready series in useMemo
observability_surfaces:
  - Scanner progress bar, scan summary alert, and ⚠️ rows for failed analyses
  - Deep Dive validation/error alerts, loading skeletons, success alert, and pair-specific console error context on fetch failure
  - Requirement traceability updated for R004 and R006
  - Decision log entries D013 and D014
drill_down_paths:
  - .gsd/milestones/M001/slices/S05/tasks/T01-SUMMARY.md
  - .gsd/milestones/M001/slices/S05/tasks/T02-SUMMARY.md
duration: 1h 35m
verification_result: passed
completed_at: 2026-03-17
---

# S05: Pair Scanner + Deep Dive Pages

**Shipped the two remaining research-facing dashboard pages: a real batch Scanner with progress/failure handling and a real Deep Dive analysis view with stat cards plus four Plotly diagnostics.**

## What Happened

S05 replaced both S02 placeholder pages with live React integrations against the FastAPI backend.

On `/scanner`, the slice delivered the platform’s pair-discovery workflow: a multi-coin selector, scan execution across all N*(N-1)/2 combinations, visible progress while requests are in flight, a sorted table of results, green highlighting for cointegrated rows, and a p-value histogram with the 0.05 threshold marked. The implementation settled on chunked concurrency of 5 requests at a time, which preserved responsiveness without hammering the local API. Failed pair analyses are not fatal; they surface as `⚠️` rows with null metrics and still contribute to the final scan summary alert.

On `/deep-dive`, the slice delivered the full single-pair analysis page. The page reads `asset1`, `asset2`, and `timeframe` from the global header context, fetches the cointegration result plus both OHLCV series in parallel, aligns closes to the exact overlapping timestamps used by the analysis response, and renders:
- 8 stat cards
- price comparison with dual y-axes
- spread + z-score stacked subplots
- scatter + regression
- spread/z-score distribution histograms

The biggest integration wrinkle was the backend contract: `postCointegration()` always returns a z-score computed with a fixed 60-period window. To keep the Deep Dive z-score control honest without widening the backend API surface in this slice, the page now recomputes z-scores client-side from the returned spread. `fetchOHLCV()` was also extended with optional `daysBack` so the raw price series stay aligned with the selected history window.

The slice also tightened project metadata:
- recorded D013/D014 in `.gsd/DECISIONS.md`
- updated requirement traceability for R004 and R006
- marked S05 complete in the milestone roadmap
- advanced project/state docs to point at S06

## Verification

Slice-level verification was run live and passed:

- `cd frontend && npm run build` → passed
- Live runtime with both servers running:
  - API: `uv run python run_api.py`
  - Frontend: `cd frontend && npm run dev`
- Scanner success path:
  - navigated to `/scanner`
  - selected the top-volume set (19 available coins)
  - ran the scan and observed progress feedback
  - confirmed the results table rendered `171` rows, matching `19 * 18 / 2`
  - confirmed cointegrated rows sorted to the top and summary alert reported `30` cointegrated / `141` not cointegrated
- Scanner failure path:
  - reduced selection to `BTC, ETH`
  - stopped the API server
  - reran the scan
  - confirmed the page did not crash and rendered a single `⚠️` row plus `1 failed` in the summary alert
- Deep Dive success path:
  - navigated to `/deep-dive`
  - selected `BTC / ETH` in the global header and clicked `Analyze`
  - confirmed `Analysis complete`, 8 stat cards, and all 4 chart sections rendered
  - explicit browser assertions passed for visible sections and for `no_console_errors_since` / `no_failed_requests_since` after the analyze action
- Cross-page navigation:
  - navigated Deep Dive → Academy → Scanner
  - confirmed routes stayed live with no blank states or broken layout

## Requirements Advanced

- R004 — The React frontend now has real Scanner and Deep Dive pages backed by FastAPI data, leaving S06 as the remaining milestone-wide integration/polish proof.
- R006 — Deep Dive now demonstrably consumes the global header pair/timeframe state, and Scanner reuses the shared cached coin universe from PairContext even though its scan controls remain page-local by design.

## Requirements Validated

- None in this slice. S05 materially advanced R004 and R006, but neither crossed from active to validated based on this slice’s evidence alone.

## New Requirements Surfaced

- None.

## Requirements Invalidated or Re-scoped

- None.

## Deviations

Two integration-level deviations were necessary:
- Deep Dive recomputes z-score client-side instead of trusting `CointegrationResponse.zscore`, because the backend response is fixed at a 60-period window.
- `frontend/lib/api.ts` `fetchOHLCV()` gained an optional `daysBack` parameter so price/scatter views stay aligned with the selected history length.

## Known Limitations

- R006 remains active because Scanner intentionally keeps its own multi-pair/timeframe controls; the global header is not the scanner’s primary control surface.
- In the hard API-down scanner test, the most trustworthy diagnostics were the in-page `⚠️` rows and summary alert. Browser-level console/network capture was less reliable than the UI surface during that failure mode.

## Follow-ups

- S06 should decide whether Scanner’s page-local controls are the intended exception to the “global selector propagates everywhere” rule or whether that requirement needs tighter wording.
- S06 should include one final cross-page polish/integration pass that validates glossary navigation and any remaining dead-state edges after these two new pages are in place.

## Files Created/Modified

- `frontend/app/(dashboard)/scanner/page.tsx` — replaced the placeholder with the batch scanner, progress UI, sorted result table, histogram, and failure-row handling.
- `frontend/app/(dashboard)/deep-dive/page.tsx` — replaced the placeholder with the real analysis page, stat cards, chart builders, and inline diagnostics.
- `frontend/lib/api.ts` — added optional `daysBack` support to keep OHLCV fetches aligned with the selected analysis window.
- `.gsd/REQUIREMENTS.md` — recorded partial proof/traceability for R004 and R006.
- `.gsd/DECISIONS.md` — appended D013 and D014.
- `.gsd/milestones/M001/M001-ROADMAP.md` — marked S05 complete.
- `.gsd/PROJECT.md` — updated current-state summary to include Scanner + Deep Dive.
- `.gsd/STATE.md` — advanced active slice tracking to S06.
- `.gsd/milestones/M001/slices/S05/S05-UAT.md` — added slice-specific live-runtime UAT.

## Forward Intelligence

### What the next slice should know
- The scanner failure path is already useful: API outages degrade to `⚠️` rows plus a summary alert instead of crashing the page. Build polish around that existing behavior rather than replacing it.
- Deep Dive’s z-score window is truthful only because it recomputes from `spread` on the client; do not assume `postCointegration()` alone is enough for configurable z-score views elsewhere.

### What's fragile
- Hard-down API diagnostics in browser tooling were less dependable than the page’s own failure UI — treat the scanner table/alert state as the primary signal when validating outage behavior.
- Multi-axis Plotly layouts still depend on manual dark-theme application to `xaxis2`/`yaxis2`; future subplot work can regress visually if that pattern is forgotten.

### Authoritative diagnostics
- `/scanner` summary alert + table rows — this is the fastest trustworthy read on batch health, cointegrated count, and failed analyses.
- `/deep-dive` `Analysis complete` alert + chart section headers — this is the clearest end-to-end proof that header selection, API fetches, and chart rendering all succeeded.

### What assumptions changed
- Assumption: `postCointegration()` would respect a page-level z-score window control.
- Reality: the backend endpoint hardcodes a 60-period z-score, so configurable views must recompute client-side or call a dedicated z-score endpoint.
