---
id: T01
parent: S05
milestone: M001
provides:
  - Fully functional Scanner page with batch cointegration scanning, sorted results table, and p-value histogram
key_files:
  - frontend/app/(dashboard)/scanner/page.tsx
key_decisions:
  - Batch API calls in chunks of 5 concurrent requests to avoid overwhelming backend
patterns_established:
  - Batch API scan pattern: generate pair combos → fire batched Promise.allSettled → track progress in state → sort and display results
observability_surfaces:
  - Progress bar with "Scanning X/Y pairs…" text during batch execution
  - Status alert with cointegrated/not-cointegrated/failed counts after scan
  - ⚠️ rows in table for failed pair analyses
  - Browser console logs for API errors via apiFetch()
duration: 15m
verification_result: passed
completed_at: 2026-03-17
blocker_discovered: false
---

# T01: Build Scanner page with batch cointegration scan, results table, and p-value chart

**Replaced Scanner placeholder with full batch cointegration scanner page — MultiSelect coin picker, chunked concurrent API calls with progress bar, sorted results table with green-highlighted cointegrated rows, p-value histogram with threshold line, and status summary alert**

## What Happened

Replaced the placeholder `scanner/page.tsx` with a ~340-line `'use client'` component. The page has:

1. **Controls section**: MultiSelect populated from PairContext coins, timeframe Select, days-back NumberInput, "Run Scan" button, and "Select top 20 by volume" shortcut that filters TOP_COINS against available coins.
2. **Batch scan logic**: Generates N*(N-1)/2 pair combinations, fires `postCointegration()` in batches of 5 via `Promise.allSettled()`, tracks completed/total count for the progress bar. Each result is mapped to a typed `ScanRow` or an error row with ⚠️.
3. **Results table**: Mantine Table with 10 columns (Pair, Coint?, p-value, Test Stat, Hedge Ratio, Half-life, Correlation, Skew, Kurt, Points). Sorted cointegrated-first then by p-value ascending. Cointegrated rows get green background highlight. P-values < 0.05 are bold.
4. **P-value histogram**: PlotlyChart with histogram trace, `nbinsx: 20` (cast as Data per KNOWLEDGE.md), red dashed vertical line at x=0.05 via `shapes` in layout, and annotation label.
5. **Status alert**: Green if any cointegrated, blue if none; shows scanned/cointegrated/failed counts.
6. **Empty state**: Shows icon and helpful text when no scan has been run.
7. **Validation**: Yellow alert if < 2 coins selected.

## Verification

- `npm run build` — exit 0, no TypeScript errors, SSR safe
- Runtime test with 5 coins (ETH, ETC, BTC, ADA, XRP):
  - Progress bar appeared and advanced during scan
  - Results table showed 10 pairs (C(5,2) = 10) ✓
  - 5 cointegrated rows sorted to top with green highlight ✓
  - 5 non-cointegrated rows sorted by p-value below ✓
  - P-value histogram rendered with red dashed threshold line at 0.05 ✓
  - Status alert: "Scanned 10 pairs. Found 5 cointegrated, 5 not cointegrated." ✓
- Validation test: clicking "Run Scan" with no coins shows yellow alert "Select at least 2 coins to scan." ✓
- Navigation test: Scanner ↔ Deep Dive ↔ Academy — no broken states ✓
- Browser assertions: 10/10 PASS, no console errors

### Slice-level verification (partial — T02 not yet done):
- ✅ `npm run build` exits 0
- ✅ Scanner: MultiSelect with coins, Run Scan, progress, results table, p-value histogram
- ⬜ Deep Dive: Not yet implemented (T02)
- ✅ Navigation between pages works

## Diagnostics

- **Progress state**: During scanning, the UI shows "Scanning X/Y pairs…" with animated striped progress bar. Inspect React state via DevTools for `completedCount`/`totalCount`.
- **Failed pairs**: Show ⚠️ in the Coint? column with "—" values. The original API error is logged to `console.error` with the URL and status code.
- **Status alert**: Post-scan summary shows cointegrated/not-cointegrated/failed counts.
- **Browser console**: Filter for "Scanner:" or "API error" to see batch scan errors.

## Deviations

None — implemented as planned.

## Known Issues

None discovered.

## Files Created/Modified

- `frontend/app/(dashboard)/scanner/page.tsx` — Full Scanner page (~340 lines): MultiSelect, batch scan, progress bar, results table, p-value histogram, status alert
- `.gsd/milestones/M001/slices/S05/S05-PLAN.md` — Added Observability / Diagnostics section and failure-path verification step
- `.gsd/milestones/M001/slices/S05/tasks/T01-PLAN.md` — Added Observability Impact section
