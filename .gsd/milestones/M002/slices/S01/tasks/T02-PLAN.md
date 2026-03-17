---
estimated_steps: 6
estimated_files: 5
---

# T02: Expose the first research + backtest API contract and recommendation handoff

**Slice:** S01 — Backtest core + first connected research handoff
**Milestone:** M002

## Description

Wrap the new engine in a stable FastAPI boundary and prove the first research-to-backtest contract. This task introduces one real research endpoint — the lookback-window sweep — because it maps directly to the rolling z-score window used by the strategy and can emit a complete recommended backtest preset immediately.

The shared envelope defined here becomes the contract S02 and S03 will extend, so the schema must carry trust metadata now instead of bolting it on later.

**Relevant skill:** `test`

## Steps

1. Extend `api/schemas.py` with explicit request/response models for the lookback sweep, `recommended_backtest_params`, backtest requests, equity/trade/metric payloads, data-quality report, warnings, and honest-reporting footer fields.
2. Add `api/routers/research.py` with a real lookback-window sweep endpoint that uses the existing research analysis code on cached parquet-backed data and returns both module results and a full recommended backtest preset.
3. Add `api/routers/backtest.py` with a backtest execution endpoint that reads cached parquet directly (not `get_candles()`), runs the new engine, and returns equity curve, signal overlay, trade log, metrics, preflight status, and footer metadata.
4. Register the new routers in `api/main.py` so both endpoints appear in FastAPI and are reachable from the existing app.
5. Add `tests/test_backtest_api.py` covering: schema serialization, successful research response shape, recommendation-to-backtest request compatibility, successful backtest response shape, and a blocking preflight case that must not execute trades.
6. Run the targeted API tests and adjust schema field names until the contract is stable and frontend-ready.

## Must-Haves

- [ ] The first research endpoint runs on real cached data, not mock/demo data
- [ ] Research response includes `recommended_backtest_params` shaped like a valid backtest request
- [ ] Backtest response includes trade log, equity curve, metrics, data-quality status, warnings, and honest-reporting footer
- [ ] Blocking preflight conditions are returned as structured API output instead of hidden server exceptions
- [ ] `tests/test_backtest_api.py` proves the contract is compatible across research and backtest endpoints

## Verification

- `uv run pytest tests/test_backtest_api.py -q`
- Confirm the generated OpenAPI docs expose both new routes and show the shared research/backtest envelope fields

## Observability Impact

- Signals added/changed: API payloads now expose preflight blockers/warnings, recommendation payloads, and honest-reporting fields as inspectable JSON
- How a future agent inspects this: run `uv run pytest tests/test_backtest_api.py -q`, inspect FastAPI `/docs`, or hit the new endpoints and read the structured response body
- Failure state exposed: invalid or blocked runs return explicit blocking reasons and stage-aware errors instead of an empty 500 response

## Inputs

- `src/statistical_arbitrage/analysis/research.py` — existing lookback-window sweep logic to wrap
- `src/statistical_arbitrage/backtesting/engine.py` — T01 engine output consumed here
- `api/routers/analysis.py` — existing router conventions and cache-reading patterns
- `api/schemas.py` — existing Pydantic schema style to extend
- `tests/test_api.py` — current FastAPI test patterns to mirror
- Knowledge base note: read parquet directly for API access; do not call `get_candles()` and accidentally fetch from Bitvavo

## Expected Output

- `api/schemas.py` — shared research/backtest contract models with recommendation + trust metadata
- `api/routers/research.py` — first real research module endpoint for the React Research page
- `api/routers/backtest.py` — backtest execution endpoint returning full result payloads
- `api/main.py` — FastAPI composition updated with the new routers
- `tests/test_backtest_api.py` — API contract tests for success and blocking paths
