# M002: Research & Backtest

**Vision:** Turn the platform's existing analytical core into a trustworthy research-and-validation workspace where the user can explore parameters on real cached data, move directly into an honest backtest, and judge robustness before trading.

## Success Criteria

- A user can open the Research Hub, run a real research module, accept a recommended parameter set, and land in the Backtester with a completed result showing equity curve, trade log, metrics, warnings, and an honest-reporting footer.
- All 8 research modules run from the React frontend against FastAPI endpoints, return structured results from cached parquet data, and render takeaway banners without falling back to the old Dash surface.
- A user can run bounded grid search and walk-forward validation on a real pair and see both robust regions and fragile/overfit regions communicated clearly in the UI.
- Backtest outputs are trustworthy: data quality problems surface before execution, suspiciously strong results trigger inline warnings, and the architecture prevents look-ahead bias by construction.

## Key Risks / Unknowns

- Look-ahead-safe backtesting correctness — if the signal engine, trade accounting, or metrics are wrong, every downstream research conclusion becomes misleading.
- Grid search + walk-forward cost/clarity — bounded optimization must stay fast enough for localhost use and still communicate what is train vs test without becoming a black box.
- Breadth + integration drift across 8 research modules — the wrappers are mechanically straightforward, but many similar API/UI surfaces can diverge and break the one-click handoff into backtesting.

## Proof Strategy

- Look-ahead-safe backtesting correctness → retire in S01 by shipping a real backtester path on localhost, verified by deterministic fixtures for signals/trades/metrics plus a live research→backtest handoff on cached data.
- Breadth + integration drift across 8 research modules → retire in S02 by shipping the full Research Hub on the shared result envelope and proving every module can render real results and hand off parameters into the S01 backtester.
- Grid search + walk-forward cost/clarity → retire in S03 by shipping bounded optimization and rolling-window validation against real cached data with explicit train/test windows, robustness annotations, and inline overfitting warnings.
- Final assembled trust experience → retire in S04 by exercising the complete localhost flow through the real Next.js and FastAPI entrypoints and capturing final integrated evidence.

## Verification Classes

- Contract verification: `uv run pytest tests -q`, targeted pytest coverage for strategy/backtesting/data-quality/API contracts, and `cd frontend && npm run build` for the authoritative frontend type/SSR gate.
- Integration verification: real localhost stack on `:3000` + `:8000`, with the React Research Hub calling FastAPI research/backtest endpoints, reading cached parquet data, and handing recommended parameters into the live Backtester.
- Operational verification: none beyond local dev lifecycle; the required proof is successful local startup and stable execution of the connected flow.
- UAT / human verification: inspect the real charts, banners, trade log, honest-reporting footer, optimization heatmap, walk-forward display, and overfitting warnings on real pair data.

## Milestone Definition of Done

This milestone is complete only when all are true:

- All planned slices are complete and the Research Hub plus Backtester ship as real product surfaces, not isolated backend utilities.
- The extracted strategy engine, backtesting engine, research endpoints, and React pages are wired together through stable shared contracts.
- The real entrypoints exist and are exercised on localhost: the user can go from Research Hub recommendation to Backtester result without manual data copying.
- Success criteria are re-checked against live runtime behavior, not only unit tests or fixture snapshots.
- Final integrated acceptance passes for research execution, one-click backtest handoff, grid search, walk-forward validation, and overfitting/data-quality visibility.

## Requirement Coverage

- Covers: R008, R009, R010, R011, R012, R013, R014, R015, R022, R023
- Partially covers: none
- Leaves for later: none
- Orphan risks: none

Coverage map:
- **S01** owns R009, R010, R013, R023 and establishes the first concrete R015/R022 trust surface.
- **S02** owns the completion of R008 and extends R015/R022 across all 8 research modules.
- **S03** owns R011, R012, R014 and extends R015/R022 into optimization and robustness reporting.
- **S04** closes the integrated acceptance proof across R008-R015, R022, and R023 on the real localhost entrypoints.

## Slices

- [ ] **S01: Backtest core + first connected research handoff** `risk:high` `depends:[]`
  > After this: A user can run one real research module, accept its recommended parameters, and see a completed localhost backtest with equity curve, trade log, metrics, data-quality status, warnings, and honest-reporting metadata.
- [ ] **S02: Complete the 8-module Research Hub on the shared contract** `risk:medium` `depends:[S01]`
  > After this: All 8 research modules run from the React Research Hub against FastAPI, render structured results with takeaway banners, and can hand their selected or recommended parameters to the backtester.
- [ ] **S03: Optimization, walk-forward, and overfitting visibility** `risk:medium` `depends:[S01]`
  > After this: A user can run bounded grid search and walk-forward validation on a real pair, inspect heatmap and rolling-window results, and see inline warnings when the best-looking results are fragile or suspicious.
- [ ] **S04: Workspace integration and live acceptance closure** `risk:low` `depends:[S02,S03]`
  > After this: The full Research & Backtest workspace is exercised live on localhost end-to-end — Research Hub → one-click Backtester → optimization/walk-forward drill-down — with final UAT evidence and no broken handoffs.

## Boundary Map

### S01 → S02

Produces:
- Shared research/backtest result envelope covering pair, timeframe, parameter snapshot, sample size, date range, fee assumption, warnings, and confidence qualifier.
- Stable research-to-backtest handoff contract for pre-filling the Backtester from a research recommendation.
- A proven Backtester page contract: equity curve series, trade log rows, metrics summary, data-quality report, signal overlay payload, and honest-reporting footer.

Consumes:
- nothing (first slice)

### S01 → S03

Produces:
- Reusable look-ahead-safe strategy/backtesting engine with deterministic trade ledger and metrics outputs.
- Verified parameter/input surface for lookback, thresholds, stop-loss, capital, position sizing, and fees.
- Data-quality preflight result shape that distinguishes blocking issues from warnings.

Consumes:
- nothing (first slice)

### S01 → S04

Produces:
- Stable Backtester routing/state model for deep-linking or pre-filling a run from upstream research and optimization surfaces.
- Shared trust-reporting primitives: warnings, assumptions, and metadata footer sections that downstream pages can reuse.

Consumes:
- nothing (first slice)

### S02 → S04

Produces:
- Eight stable research endpoint/UI contracts with module identifiers, request shapes, result payloads, takeaway banner content, and optional recommendation parameters.
- Research Hub loading, empty, and error states that expose backend failures clearly enough for future debugging.

Consumes:
- S01 shared result envelope and backtest handoff contract.

### S03 → S04

Produces:
- Grid-search result schema covering parameter axes, metric matrix/heatmap cells, recommendation summary, and robustness annotations.
- Walk-forward result schema covering train/test windows, per-fold metrics, aggregate summary, and stability verdict.
- Shared overfitting-warning payloads used by both optimization and ordinary backtest results.

Consumes:
- S01 strategy/backtest engine and trust-reporting primitives.
- Optional reuse of S02 research ranges and recommendation affordances where helpful.
