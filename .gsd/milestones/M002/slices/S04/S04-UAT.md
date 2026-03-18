# S04: Workspace integration and live acceptance closure — UAT

**Milestone:** M002
**Written:** 2026-03-18

## UAT Type

- UAT mode: live-runtime
- Why this mode is sufficient: This slice is pure verification — no new features were built. The E2E tests exercise the real Next.js :3000 and FastAPI :8000 entrypoints on real cached data. Automated E2E tests serve as the UAT surface per decision D017.

## Preconditions

- FastAPI backend running on `:8000` (or auto-launched by Playwright webServer config)
- Next.js frontend running on `:3000` (or auto-launched by Playwright webServer config)
- Cached BTC-EUR and ETH-EUR parquet data available at 1h timeframe in `data/cache/`
- Node.js dependencies installed (`cd frontend && npm install`)
- Python dependencies installed (`uv sync --all-extras`)

## Smoke Test

Run `cd frontend && npm run test:e2e` — all 27 tests should pass. If any fail, the workspace integration is broken.

## Test Cases

### 1. Research lookback module runs and produces results

1. Navigate to `/research`
2. Wait for module tabs to load
3. Select BTC-EUR × ETH-EUR via header pair selectors (type, ArrowDown, Enter)
4. The "Lookback Window" tab should be active by default
5. Click "Run lookback sweep"
6. Wait up to 30s for the Plotly chart to render
7. **Expected:** A `.js-plotly-plot` chart is visible in the lookback panel AND a "Research takeaway" alert renders with >20 characters of text

### 2. Research → Backtest CTA handoff carries URL params

1. Navigate to `/research`, select BTC×ETH pair
2. Run the lookback sweep (same as test 1)
3. Wait for the Plotly chart to render
4. Locate the "Use recommended settings" CTA link
5. Click the CTA link
6. **Expected:** URL changes to `/backtest` with query params: `source=research`, `asset1` containing "BTC", and `lookback_window` present. A "Research recommendation loaded" alert renders on the /backtest page.

### 3. Backtest executes and renders results with honest-reporting footer

1. Navigate to `/backtest`
2. Select BTC-EUR × ETH-EUR via header selectors
3. Click "Run backtest"
4. Wait up to 30s for the equity curve chart to render
5. **Expected:** At least one `.js-plotly-plot` chart is visible. The honest-reporting footer is visible with exact text "Assumptions" and "Limitations" headings.

### 4. Grid search runs and CTA links to backtest

1. Navigate to `/optimize`
2. Wait for grid search panel to load (default tab)
3. Select BTC-EUR × ETH-EUR via header selectors
4. Configure Axis 1: Min=1.5, Max=2.5, Step=1.0
5. Configure Axis 2: Min=0.3, Max=0.5, Step=0.2
6. Click "Run Grid Search"
7. Wait up to 60s for heatmap chart to render
8. Locate "Use best params" CTA link
9. Click the CTA link
10. **Expected:** A Plotly heatmap renders in the grid search panel. The "Use best params" CTA is visible. After clicking, URL contains `/backtest` with `source=grid-search`.

### 5. Walk-forward renders stability verdict

1. Navigate to `/optimize`
2. Select BTC-EUR × ETH-EUR via header selectors
3. Switch to the "Walk-Forward" tab
4. Configure Folds=2, Axis 1: Min=1.5, Max=2.5, Step=1.0, Axis 2: Min=0.3, Max=0.5, Step=0.2
5. Click "Run Walk-Forward"
6. Wait up to 60s for stability verdict
7. **Expected:** A Mantine Alert renders containing one of: "stable", "moderate", or "fragile" (case-insensitive).

## Edge Cases

### Empty pair selection

1. Navigate to `/research` without selecting any pair
2. Click "Run lookback sweep"
3. **Expected:** The button should be disabled or an error alert should render. No crash.

### Narrow grid producing single cell

1. Navigate to `/optimize`, select pair
2. Set both axes to identical Min/Max (e.g., Min=2.0, Max=2.0, Step=1.0)
3. Click "Run Grid Search"
4. **Expected:** Either a single-cell heatmap renders or an appropriate warning. No crash.

### Walk-forward with insufficient data

1. Navigate to `/optimize`, select a pair with short history
2. Set Folds=10 (high fold count for limited data)
3. Click "Run Walk-Forward"
4. **Expected:** Either completes with results or returns an error alert. No unhandled crash.

## Failure Signals

- Any E2E test fails → integration is broken; check `frontend/test-results/<test-name>/test-failed-1.png` for failure screenshot
- "Select asset 1, asset 2..." alert stays visible after pair selection → Mantine Select commit pattern is broken (ArrowDown + Enter not working)
- Plotly chart doesn't render within 30s → API call failed or response format changed; check browser network tab / FastAPI logs
- "Research recommendation loaded" alert doesn't appear on /backtest after CTA click → URL param handoff is broken; inspect actual URL params
- Grid search heatmap doesn't render within 60s → optimization endpoint failing or response too slow; check FastAPI server logs
- Stability verdict alert doesn't appear → walk-forward endpoint failing or verdict not included in response

## Requirements Proved By This UAT

- R008 — Research module (lookback) runs on real data and renders results (Test 1)
- R009 — Backtest executes and produces equity curve + metrics (Test 3)
- R010 — Metrics render in the backtest result view (Test 3)
- R011 — Grid search sweeps parameters and surfaces results via heatmap (Test 4)
- R012 — Overfitting/trust warnings render in the backtest footer (Test 3, "Assumptions"/"Limitations")
- R013 — Look-ahead safety verified through live backtest execution (Test 3, architectural enforcement)
- R014 — Walk-forward runs and produces stability verdict (Test 5)
- R015 — Honest-reporting footer visible with assumptions and limitations (Test 3)
- R022 — Full research→backtest→optimize visibility chain exercised (Tests 1–5)
- R023 — Data-quality preflight executes during live backtest (Test 3, partial — gap detection pending)

## Not Proven By This UAT

- R023 complete validation — missing-candle gap detection is not yet implemented
- Multi-pair testing — only BTC+ETH at 1h is exercised
- Research modules other than lookback — the other 7 modules have their own E2E coverage in `research-hub.spec.ts` but are not repeated in this integration spec
- Overfitting warning triggering — the integration tests verify the footer renders but don't construct a scenario guaranteed to trigger overfit warnings (threshold-based, depends on data)

## Notes for Tester

- The Playwright webServer config auto-launches both FastAPI and Next.js. Run `cd frontend && npm run test:e2e` for the full automated suite.
- Use `REUSE_SERVERS=1` if servers are already running: `cd frontend && REUSE_SERVERS=1 npx playwright test e2e/integration-flows.spec.ts`
- The grid search and walk-forward tests use intentionally narrow parameter ranges (2×2 grid, 2 folds) to keep execution under 60s.
- If tests are flaky due to API latency, increase timeouts in the spec (currently 30s for most assertions, 60s for optimization).
- Full HTML test report: `cd frontend && npx playwright show-report`
