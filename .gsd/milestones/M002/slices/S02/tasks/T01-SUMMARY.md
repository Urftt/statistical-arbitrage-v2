---
id: T01
parent: S02
milestone: M002
provides:
  - 7 FastAPI POST endpoints for research modules (rolling-stability, oos-validation, timeframe-comparison, spread-method, zscore-threshold, tx-cost, coint-method)
  - Typed Pydantic request/response schemas for all 7 modules following the shared envelope pattern
  - Contract tests for all 8 research endpoints (7 new + lookback regression guard)
key_files:
  - api/schemas.py
  - api/routers/research.py
  - tests/test_research_api.py
key_decisions:
  - Z-score pre-computed via Polars rolling_mean/rolling_std in a shared _compute_zscore helper for threshold and tx-cost endpoints
  - SpreadMethodResult.spread numpy array excluded from API payload — only scalar diagnostics serialized
  - Timeframe comparison endpoint uses closure-based get_merged_fn that reads parquet files directly and returns None on missing cache
patterns_established:
  - All research endpoints follow the same envelope: module identifier, asset pair metadata, typed results list, takeaway, optional recommended_backtest_params
  - Diagnostic modules return recommended_backtest_params=None; handoff modules (zscore-threshold, tx-cost) return valid BacktestRequest
  - numpy_to_python() used on all result payloads to ensure JSON-safe serialization
observability_surfaces:
  - Each endpoint logs failures via logger.exception() before returning HTTP 500 with detail message
  - GET /openapi.json exposes all 8 research endpoint schemas
  - Each response includes module identifier for request tracing
duration: 15m
verification_result: passed
completed_at: 2026-03-18
blocker_discovered: false
---

# T01: Add 7 research API endpoints, Pydantic schemas, and contract tests

**Added 7 research FastAPI endpoints with typed Pydantic schemas and 8 contract tests covering all research modules**

## What Happened

Extended `api/schemas.py` with 7 request/response/result-payload model sets following the `LookbackSweepResponse` envelope pattern. Each response includes `module`, `asset1`, `asset2`, `timeframe`, `days_back`, `observations`, typed `results` list, `takeaway` (text + severity), and `recommended_backtest_params`.

Extended `api/routers/research.py` with 7 POST handlers:
- **Rolling stability**: Serializes Polars DataFrame via `.to_dicts()`, passes timestamps from `_load_pair_data()`
- **OOS validation**: Forwards split_ratios parameter to analysis function
- **Timeframe comparison**: Builds closure that reads parquet files per-timeframe and returns None on missing cache
- **Spread method**: Omits numpy `spread` array from API payload, only includes scalar diagnostics
- **Z-score threshold**: Pre-computes z-score via shared `_compute_zscore()` helper, picks max-trades combo for `recommended_backtest_params`
- **Transaction cost**: Pre-computes z-score, always returns `BacktestRequest` with Bitvavo 0.25% fee
- **Cointegration method**: Compares Engle-Granger (both directions) and Johansen tests

Created `tests/test_research_api.py` with 8 contract tests (1 per endpoint) verifying 200 status, envelope structure, result shapes, and backtest handoff validity.

## Verification

- `uv run pytest tests/test_research_api.py -v` — 8/8 passed (all endpoints return correct envelope)
- `uv run pytest tests/ -q` — 118 passed, 0 failed (no regressions)
- `uv run python -c "from api.main import app"` — all 8 research routes register cleanly

### Slice-level checks (this task):
- ✅ `uv run pytest tests/test_research_api.py -q` — 8 passed
- ✅ `uv run pytest tests/ -q` — 118 passed, no regressions
- ⏳ `cd frontend && npm run build` — frontend work is T02
- ⏳ `cd frontend && REUSE_SERVERS=1 npm run test:e2e` — frontend work is T02
- ⏳ Live localhost research hub — frontend work is T02

## Diagnostics

- Each endpoint individually testable via `curl -X POST http://localhost:8000/api/research/{slug} -H 'Content-Type: application/json' -d '{"asset1":"ETH/EUR","asset2":"ETC/EUR","timeframe":"1h","days_back":365}'`
- Structured errors: 404 (missing cache), 422 (insufficient data/validation), 500 (analysis exception with traceback logged)
- OpenAPI schema at `/openapi.json` includes all 8 research endpoint definitions

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `api/schemas.py` — Added 7 request/response/result-payload model sets (RollingStability, OOSValidation, Timeframe, SpreadMethod, ZScoreThreshold, TxCost, CointMethod)
- `api/routers/research.py` — Added 7 POST endpoint handlers + shared `_compute_zscore()` helper
- `tests/test_research_api.py` — New file: 8 contract tests for all research endpoints
- `.gsd/milestones/M002/slices/S02/tasks/T01-PLAN.md` — Added Observability Impact section (pre-flight fix)
