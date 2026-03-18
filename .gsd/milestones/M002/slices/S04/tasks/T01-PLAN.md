---
estimated_steps: 7
estimated_files: 3
---

# T01: Write E2E integration flow tests and fix discovered bugs

**Slice:** S04 — Workspace integration and live acceptance closure
**Milestone:** M002

## Description

S01–S03 built the full Research & Backtest workspace: 8 research modules, backtesting engine, grid search, walk-forward validation, and all frontend pages. But the existing 22 E2E tests only verify that pages load and tabs switch — none runs a real research module, triggers a backtest, or follows a CTA handoff from research/optimize to the backtest page.

This task creates `frontend/e2e/integration-flows.spec.ts` with 4–5 tests exercising the critical connected paths on real cached BTC+ETH data at 1h timeframe. If any tests reveal integration bugs (broken handoffs, missing selectors, timeout issues), fix them in the same task.

**Relevant installed skill:** `test` — load it for E2E test writing patterns.

## Steps

1. **Run baseline gates** to confirm the starting point is green:
   - `uv run pytest tests/ -q` (expect 164 passed)
   - `cd frontend && npm run build` (expect clean)
   - `cd frontend && npm run test:e2e` (expect 22 passed)

2. **Study the pair selection pattern.** The header has two Mantine `Select` inputs for Asset 1 and Asset 2. In E2E, committing a selection requires: click the input → type the value → press `ArrowDown` → press `Enter`. Verify this works by examining `frontend/contexts/PairContext.tsx` and the header select markup. The research/optimize/backtest pages all read from `usePairContext` and show a "Select asset 1, asset 2..." alert until both are committed.

3. **Create `frontend/e2e/integration-flows.spec.ts`** with these test cases:

   **Test 1: Research lookback module runs and produces results.**
   - Navigate to `/research`
   - Select BTC-EUR as Asset 1 and ETH-EUR as Asset 2 via header selects (Mantine commit pattern)
   - The default tab is "Lookback Window" — find the Run button and click it
   - Wait for `.js-plotly-plot` visible (chart rendered) AND a takeaway alert (Mantine Alert with takeaway text) with `{ timeout: 30_000 }`
   - Assert: the takeaway alert text is non-empty, confirming real analysis ran

   **Test 2: Research → Backtest CTA handoff.**
   - From Test 1's result state (or set up fresh): navigate to `/research`, select pair, run lookback sweep, wait for results
   - Find the backtest CTA link (the LookbackSweepPanel has a link built via `buildBacktestSearchParams` that navigates to `/backtest`)
   - Click the CTA link
   - Assert: URL contains `/backtest` with search params including `asset1`, `lookback_window`, and `source=research`
   - Assert: a "Research recommendation loaded" alert or similar preset indicator renders on the backtest page

   **Test 3: Backtest executes and renders results.**
   - Navigate to `/backtest`
   - Select BTC-EUR and ETH-EUR via header selects
   - Click "Run Backtest" button
   - Wait for result view to render with `{ timeout: 30_000 }`: equity curve chart (`.js-plotly-plot`), metrics cards, trade log
   - Assert: honest-reporting footer text is visible (look for text containing "assumptions" or "limitations")

   **Test 4: Grid search → Backtest CTA handoff.**
   - Navigate to `/optimize`
   - Select BTC-EUR and ETH-EUR via header selects
   - On the Grid Search tab (default), configure minimal axis ranges to keep it fast (narrow ranges for 2 axes)
   - Click "Run Grid Search"
   - Wait for heatmap (`.js-plotly-plot`) with `{ timeout: 60_000 }` (grid search runs multiple backtests)
   - Assert: "Use best params" CTA link is visible
   - Click the CTA link
   - Assert: URL contains `/backtest` with `source=grid-search` in search params

   **Test 5: Walk-forward renders stability verdict.**
   - Navigate to `/optimize`
   - Select BTC-EUR and ETH-EUR via header selects
   - Switch to "Walk-Forward" tab
   - Configure minimal settings (2 folds, narrow parameter ranges) for speed
   - Click "Run Walk-Forward"
   - Wait for results with `{ timeout: 60_000 }` (walk-forward runs grid search per fold)
   - Assert: stability verdict banner is visible (text matching /stable|moderate|fragile/i)

4. **Create a helper function** in the spec file for the repeated pair-selection pattern:
   ```typescript
   async function selectPair(page: Page) {
     // Select Asset 1: BTC-EUR
     const asset1Input = page.locator('input[aria-label="Asset 1"]').or(page.locator('input[placeholder*="Asset 1"]'));
     await asset1Input.click();
     await asset1Input.fill('BTC');
     await page.keyboard.press('ArrowDown');
     await page.keyboard.press('Enter');
     
     // Select Asset 2: ETH-EUR  
     const asset2Input = page.locator('input[aria-label="Asset 2"]').or(page.locator('input[placeholder*="Asset 2"]'));
     await asset2Input.click();
     await asset2Input.fill('ETH');
     await page.keyboard.press('ArrowDown');
     await page.keyboard.press('Enter');
     
     // Wait for pair context to propagate
     await page.waitForTimeout(500);
   }
   ```
   Adjust selectors based on actual DOM inspection during step 2.

5. **Run the new E2E tests:** `cd frontend && npm run test:e2e`

6. **If tests fail due to integration bugs**, diagnose and fix them. Common issues:
   - Mantine Select not committing → adjust the ArrowDown/Enter pattern or use `.click()` on the dropdown option
   - Backtest/grid-search timeout → increase specific assertion timeouts to 45_000 or 60_000
   - CTA link not found → check the DOM testid or text content in the relevant panel component
   - Missing search params → inspect `buildBacktestSearchParams()` and the panel's CTA construction
   
7. **Run the full E2E suite** one final time to confirm no regressions: `cd frontend && npm run test:e2e`

## Must-Haves

- [ ] `frontend/e2e/integration-flows.spec.ts` exists with ≥4 test cases
- [ ] Test 1 proves a research module runs on real cached data and renders results
- [ ] Test 2 or 3 proves a backtest executes and renders equity curve + metrics + footer
- [ ] At least one test proves a CTA handoff from research or optimize to /backtest with URL params
- [ ] At least one test proves walk-forward or grid-search runs and renders results
- [ ] All 22 existing E2E tests still pass (no regressions)

## Verification

- `cd frontend && npm run test:e2e` — all tests pass (22 existing + ≥4 new)
- The new spec exercises real API calls against cached BTC+ETH data (not mocked)
- No test uses `test.skip` or `.only`

## Inputs

- `frontend/e2e/smoke.spec.ts` — pattern reference for page navigation and chart wait strategies
- `frontend/e2e/research-hub.spec.ts` — pattern reference for `data-research-tab`/`data-research-module` selectors
- `frontend/e2e/optimize.spec.ts` — pattern reference for `data-optimize-tab`/`data-optimize-panel` selectors
- `frontend/playwright.config.ts` — timeout config (90s global), web server setup
- `frontend/components/research/LookbackSweepPanel.tsx` — the CTA link construction using `buildBacktestSearchParams`
- `frontend/components/optimize/GridSearchPanel.tsx` — "Use best params" CTA link
- `frontend/components/optimize/WalkForwardPanel.tsx` — stability verdict rendering
- `frontend/app/(dashboard)/backtest/page.tsx` — URL search param hydration, preset alert
- `frontend/lib/api.ts` — `buildBacktestSearchParams` helper, `TIMEFRAME_OPTIONS`
- `frontend/contexts/PairContext.tsx` — header select mechanism
- KNOWLEDGE.md: Mantine Select commit pattern (ArrowDown + Enter), Plotly chart selector (`.js-plotly-plot`)

## Expected Output

- `frontend/e2e/integration-flows.spec.ts` — new E2E spec with 4–5 integration flow tests
- Possible bug-fix changes in frontend components or API if integration issues discovered
- All E2E tests (22 existing + new) passing in `cd frontend && npm run test:e2e`
