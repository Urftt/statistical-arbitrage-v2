# S02: Complete the 8-module Research Hub on the shared contract — Research

**Date:** 2026-03-18
**Depth:** Light research — straightforward replication of the S01 pattern across 7 remaining modules

## Summary

S02 is mechanical breadth work. S01 shipped the first research module (lookback-window sweep) with the full contract: FastAPI endpoint → Pydantic request/response → React panel → takeaway banner → `recommended_backtest_params` handoff → backtest deep-link. The remaining 7 modules follow the same pattern: each wraps an existing pure-Python function from `analysis/research.py`, exposes it through a new FastAPI route, defines typed request/response Pydantic models in `api/schemas.py`, adds a matching TypeScript interface in `frontend/lib/api.ts`, and gets a React panel component that renders results, takeaway, and (where applicable) a backtest handoff CTA.

All 8 analysis functions already exist and are tested (48 tests across `test_research_modules.py` and `test_research_s03.py`). The work is: API endpoint + schema per module, TS types + fetch function per module, React panel per module, and a Research Hub page that renders all 8 as a tabbed/accordion module picker instead of just the single LookbackSweepPanel.

The one structural difference is the `compare_timeframes()` function which takes a `get_merged_fn` callable instead of raw numpy arrays. The API endpoint needs to provide a closure that loads multiple timeframe parquet files through `DataCacheManager`. All other modules take `prices1: np.ndarray, prices2: np.ndarray` (plus optional params) following the same `_load_pair_data()` pattern S01 already uses.

## Recommendation

Batch the backend and frontend work into two tasks: (1) all 7 API endpoints + schemas + tests in one pass, (2) all 7 React panels + the Research Hub page refactor in one pass. This avoids context-switching between Python and TypeScript 7 times and lets each task reuse the copy-modify pattern efficiently.

Within each task, follow the S01 lookback-window endpoint/panel as the template. Modules that can produce a meaningful recommended backtest preset (z-score threshold, lookback window [done], transaction cost) should include `recommended_backtest_params`. Modules that are diagnostic only (rolling stability, OOS, timeframe, spread method, coint method) should return a `recommended_backtest_params: null` field to keep the envelope consistent.

## Implementation Landscape

### Key Files

- `src/statistical_arbitrage/analysis/research.py` — All 8 pure-Python research functions and takeaway generators already exist. **Do not modify.** These are the analytical core.
- `api/routers/research.py` — Currently has only the lookback-window endpoint. Add 7 new `@router.post(...)` handlers following the same pattern: load pair data via `_load_pair_data()`, call the analysis function, generate takeaway, wrap in response model.
- `api/schemas.py` — Currently has `LookbackSweepRequest/Response` plus shared contracts. Add 7 new request/response model pairs. All responses should include `module: Literal[...]`, `asset1`, `asset2`, `timeframe`, `days_back`, `observations`, `takeaway: ResearchTakeawayPayload`, and optionally `recommended_backtest_params: BacktestRequest | None`.
- `api/routers/analysis.py` — Owns `_load_pair_data()` and `_get_cache_mgr()` helpers. These are imported by `research.py` and should not change.
- `frontend/lib/api.ts` — Add 7 new request/response interfaces and `postXxx()` fetch functions following `postLookbackSweep()`.
- `frontend/components/research/LookbackSweepPanel.tsx` — The S01 template. Each new module gets a sibling panel component in the same directory.
- `frontend/app/(dashboard)/research/page.tsx` — Currently renders only LookbackSweepPanel. Refactor into a module-picker (tabs or segmented control) that renders the active module's panel. All 8 module panels lazy-imported.

### The 7 remaining modules

| Module | Route | Analysis fn | Has params? | Can recommend backtest? |
|--------|-------|-------------|-------------|------------------------|
| Rolling Stability | `/api/research/rolling-stability` | `rolling_cointegration()` | window (int) | No (diagnostic) |
| Out-of-Sample | `/api/research/oos-validation` | `out_of_sample_validation()` | split_ratios (optional) | No (diagnostic) |
| Timeframe | `/api/research/timeframe` | `compare_timeframes()` | timeframes list | No (diagnostic) |
| Spread Method | `/api/research/spread-method` | `compare_spread_methods()` | none | No (diagnostic) |
| Z-score Threshold | `/api/research/zscore-threshold` | `sweep_zscore_thresholds()` | entry_range, exit_range | Yes — best entry/exit → backtest |
| Transaction Cost | `/api/research/tx-cost` | `transaction_cost_analysis()` | fee_levels, entry/exit thresholds | Yes — Bitvavo fee level → backtest |
| Coint. Method | `/api/research/coint-method` | `compare_cointegration_methods()` | none | No (diagnostic) |

### Timeframe module data loading

`compare_timeframes()` takes a `get_merged_fn(asset1, asset2, timeframe) -> pl.DataFrame | None`. The endpoint must provide a closure that:
1. Checks if `{asset}-{timeframe}.parquet` exists in cache for both assets
2. Loads and inner-joins on timestamp, producing a DataFrame with `c1`, `c2` columns
3. Returns `None` on missing cache files instead of raising

This is a simplified version of `_load_pair_data()` wrapped in a `try/except` that returns `None` on failure. Define it as a local helper in the endpoint function.

### Rolling Stability module data loading

`rolling_cointegration()` needs timestamps as a parameter alongside prices1/prices2. `_load_pair_data()` already returns `(close1, close2, timestamps)` — use all three.

### Z-score and Transaction Cost modules pre-computation

Both `sweep_zscore_thresholds()` and `transaction_cost_analysis()` need a z-score array as input. The endpoint must compute it:
1. Load prices via `_load_pair_data()`
2. Compute hedge ratio: `np.polyfit(prices2, prices1, 1)[0]`
3. Compute spread: `prices1 - hedge_ratio * prices2`
4. Compute z-score via Polars rolling_mean/rolling_std (same as `sweep_lookback_windows` does internally, or use `PairAnalysis.calculate_zscore()`)

### Response envelope pattern

Every response follows the S01 envelope:
```python
class XxxResponse(BaseModel):
    module: Literal["xxx"] = "xxx"
    asset1: str
    asset2: str
    timeframe: str
    days_back: int
    observations: int
    results: list[XxxResultPayload]
    takeaway: ResearchTakeawayPayload
    recommended_backtest_params: BacktestRequest | None = None
```

### Frontend panel pattern

Each panel follows `LookbackSweepPanel.tsx`:
- Props: `{ asset1, asset2, timeframe }`
- State: `loading`, `error`, `result`, optional params (e.g. `window` for rolling stability)
- Render: header card with controls + run button → loading skeleton → empty state → result state (takeaway alert, stat cards, chart, data table, optional recommendation CTA)
- Chart: Plotly via `PlotlyChart` wrapper component

### Research Hub page refactor

Replace the single `LookbackSweepPanel` with a module selector. Use Mantine `Tabs` or `SegmentedControl` to pick the active module. Dynamically import each panel with `next/dynamic` to keep initial bundle small. The 8 module definitions (id, label, description, icon) should be a shared constant.

### Build Order

1. **API endpoints + schemas (backend task)**: Add all 7 Pydantic request/response models in `api/schemas.py`, then add all 7 endpoint handlers in `api/routers/research.py`. Add targeted API tests in `tests/test_research_api.py` (or extend `tests/test_backtest_api.py`) to verify each endpoint returns 200 with correct structure on real cached data. Run `uv run pytest tests/ -q` as the gate.

2. **React panels + hub page (frontend task)**: Add 7 TypeScript interfaces + fetch functions in `frontend/lib/api.ts`. Create 7 panel components in `frontend/components/research/`. Refactor `research/page.tsx` into a multi-module picker. Run `cd frontend && npm run build` as the type/SSR gate. Add an E2E test in `frontend/e2e/` that navigates to `/research`, switches modules, and confirms at least one non-lookback module loads.

### Verification Approach

- `uv run pytest tests/ -q` — all existing + new API tests pass
- `cd frontend && npm run build` — no type errors, no SSR failures
- `cd frontend && REUSE_SERVERS=1 npm run test:e2e` — smoke tests still pass, plus new research hub test
- Live localhost: open `/research`, switch to each module tab, run at least one non-lookback module with a cached pair, confirm takeaway banner renders

## Constraints

- The 8 analysis functions in `research.py` must not be modified — S02 wraps them, it doesn't change them
- All research responses must use the `ResearchTakeawayPayload` for the takeaway (established S01 contract)
- Modules that can recommend backtest params must return a fully valid `BacktestRequest` (per D019), not a partial object
- Plotly charts must go through the `PlotlyChart` SSR-safe wrapper (per D011, KNOWLEDGE.md)
- TypeScript Plotly types have known quirks: use `as Data` casts where needed, `'text+markers'` not `'markers+text'`, spread `DARK_AXIS_STYLE` before overrides (per KNOWLEDGE.md)

## Common Pitfalls

- **`rolling_cointegration()` returns a Polars DataFrame, not a list of dataclasses** — unlike the other 7 functions. The response model needs to convert DataFrame rows to payload objects, and the `rolling_cointegration_takeaway()` also takes a DataFrame (not a list). Handle serialization with `.to_dicts()` or row iteration.
- **`compare_timeframes()` closure must not raise on missing cache** — if `1d` parquet doesn't exist for a pair, the function expects `None` return, not an exception. Wrap the load in try/except.
- **Z-score warmup NaN** — when pre-computing z-score for the threshold and tx-cost endpoints, the first `window-1` values are NaN. The analysis functions already handle NaN (they filter internally), but the count of "observations" should reflect usable bars.
- **`SpreadMethodResult.spread` is a numpy array** — it must NOT be serialized in the API response (it would be huge). Omit the raw spread from the Pydantic payload; only include the scalar diagnostics.
