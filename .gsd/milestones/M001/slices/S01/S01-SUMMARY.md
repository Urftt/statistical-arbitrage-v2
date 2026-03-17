---
id: S01
parent: M001
milestone: M001
provides:
  - FastAPI REST API with 7 endpoints serving real analysis data from parquet cache
  - GET /api/health — status + cached pair count (44 datasets)
  - GET /api/pairs — full metadata for all cached pair/timeframe combos
  - GET /api/pairs/{symbol}/ohlcv — OHLCV timeseries from parquet (never triggers Bitvavo API)
  - POST /api/analysis/cointegration — full PairAnalysis (Engle-Granger, hedge ratio, spread, z-score, half-life, correlation)
  - POST /api/analysis/spread — spread array with configurable method (ols/ratio)
  - POST /api/analysis/zscore — z-score array with configurable lookback window
  - POST /api/analysis/stationarity — ADF test results
  - Pydantic v2 request/response models for all endpoints (auto-generates OpenAPI docs at /docs)
  - CORS middleware allowing localhost:3000 for frontend development
  - numpy_to_python() recursive converter — centralised numpy→JSON serialization safety
  - 51-test pytest suite with recursive numpy type walker
requires: []
affects:
  - S03
  - S04
  - S05
key_files:
  - api/main.py
  - api/schemas.py
  - api/routers/health.py
  - api/routers/pairs.py
  - api/routers/analysis.py
  - run_api.py
  - tests/test_api.py
  - pyproject.toml
key_decisions:
  - Used lifespan context manager instead of deprecated on_event("startup") for FastAPI startup
  - OHLCV endpoint reads parquet directly — never touches get_candles() to avoid accidental Bitvavo API calls
  - numpy_to_python() recursive converter centralised in schemas.py as single conversion point
  - Z-score/spread arrays typed as list[float | None] to accommodate rolling window NaN warmup period
  - Symbol format conversion (URL ETH-EUR ↔ internal ETH/EUR) handled in router layer
  - Added pythonpath=["."] to pytest config so api/ package at project root is importable in tests
patterns_established:
  - API router pattern — one router per domain (health, pairs, analysis), included via create_app()
  - Dependency injection — get_cache_mgr() → get_cache_manager() singleton for all endpoints
  - Cache path construction — cache_mgr.cache_dir / f"{symbol_dash}_{timeframe}.parquet"
  - _load_pair_data() shared helper — reads parquet for both assets, inner-joins on timestamp, returns aligned close prices + timestamps
  - numpy_to_python() in schemas.py as the single conversion point for all analysis responses
  - Structured error responses — {"detail": "..."} with 404/422/500 status codes
observability_surfaces:
  - GET /api/health returns {"status": "ok", "pairs_cached": N} for liveness + data availability
  - OpenAPI docs at /docs for interactive endpoint exploration
  - Structured error JSON {"detail": "..."} with appropriate HTTP status codes
  - Uvicorn access logs (method, path, status, duration) on stderr
  - pytest tests/test_api.py -v — canonical contract verification (51 tests)
  - pytest tests/test_api.py -v -k "error" — error-path subset (9 tests)
drill_down_paths:
  - .gsd/milestones/M001/slices/S01/tasks/T01-SUMMARY.md
  - .gsd/milestones/M001/slices/S01/tasks/T02-SUMMARY.md
  - .gsd/milestones/M001/slices/S01/tasks/T03-SUMMARY.md
duration: 50m
verification_result: passed
completed_at: 2026-03-17
---

# S01: FastAPI Backend + Data API

**7-endpoint FastAPI REST API wrapping existing PairAnalysis and DataCacheManager — serves real cointegration results, OHLCV timeseries, and pair metadata from parquet cache with 51 tests proving all contracts and numpy serialization safety**

## What Happened

Built a complete FastAPI REST API in `api/` at the project root that wraps the existing Python analysis layer for frontend consumption.

**T01** established the foundation: FastAPI app factory with CORS middleware (allowing localhost:3000), lifespan event handler (replacing deprecated on_event), and three data endpoints. `GET /api/health` returns status + cached pair count. `GET /api/pairs` returns full metadata for all 44 cached pair/timeframe datasets (symbol, base, quote, timeframe, candle count, date range, file size). `GET /api/pairs/{symbol}/ohlcv` reads parquet files directly via `pl.read_parquet()` — intentionally bypassing `get_candles()` to avoid triggering Bitvavo API calls. Symbol format conversion (URL `ETH-EUR` ↔ internal `ETH/EUR`) is handled in the router layer. 14 tests were added covering all data endpoints and error paths.

**T02** added the analysis endpoints — the primary value layer. Four POST endpoints wrap PairAnalysis: `/api/analysis/cointegration` (full Engle-Granger results), `/api/analysis/spread` (configurable OLS/ratio method), `/api/analysis/zscore` (configurable lookback window), and `/api/analysis/stationarity` (ADF test). The key technical challenge was numpy serialization: `PairAnalysis` returns nested dicts containing `np.float64`, `np.bool_`, `np.ndarray`, and `np.inf` values that fail JSON serialization. A recursive `numpy_to_python()` converter was built in `schemas.py` as the single conversion point — it handles all numpy scalar types, converts inf/NaN to None, and traverses nested structures. Z-score arrays were typed as `list[float | None]` to accommodate the rolling window warmup period (first window-1 values are NaN → None). A shared `_load_pair_data()` helper reads parquet for both assets, inner-joins on timestamp for alignment, and returns close-price Series + timestamps. 32 additional tests were added.

**T03** completed the test suite with 5 focused additions: a 422 validation error test and a `TestSerializationSafety` class with recursive numpy type walkers that traverse entire API responses (cointegration, spread, zscore, stationarity) asserting no numpy types (`np.float64`, `np.bool_`, `np.int64`, `np.ndarray`, etc.) survive serialization. Final count: 51 API tests, 99 total project tests.

## Verification

All slice-level verification checks pass:

- ✅ `pytest tests/test_api.py -v` — **51 passed** in 3.1s (health, pairs list, OHLCV, cointegration, spread, zscore, stationarity, 9 numpy converter unit tests, 4 serialization safety walkers)
- ✅ `pytest tests/test_api.py -v -k "error"` — **9 passed** (invalid symbol 404, invalid timeframe 404, missing pair 404 ×4 endpoints, missing body 422, error response shape)
- ✅ `pytest tests/ -v` — **99 passed** (51 API + 48 existing), zero regressions
- ✅ App factory imports cleanly: `from api.main import create_app` → "Statistical Arbitrage API"
- ✅ OpenAPI docs auto-generated at `/docs` with all request/response schemas
- ✅ CORS headers allow `http://localhost:3000`
- ✅ All numeric fields in analysis responses are native Python types (verified by recursive type walker)
- ✅ `np.inf` half-life serializes as `null`; rolling z-score warmup NaN serializes as `null`

## Requirements Advanced

- R005 — FastAPI now wraps all PairAnalysis methods (cointegration, spread, z-score, stationarity) as REST endpoints with Pydantic models and OpenAPI docs. Research functions (analysis/research.py) deferred to M002.
- R016 — Existing data pipeline preserved. API reads from parquet cache read-only. No modifications to cache_manager.py or bitvavo_client.py. All 44 cached datasets accessible via API.
- R022 — API exposes full analysis details (p-values, critical values, hedge ratios, confidence levels) rather than summarized results. The frontend can present whatever level of detail the user wants.

## Requirements Validated

- R005 — 51 tests verify all 7 API endpoints serve real data from existing analysis code. Recursive numpy type safety tests confirm no leakage. OpenAPI docs auto-generated.
- R016 — GET /api/pairs returns all 44 cached datasets. OHLCV reads parquet directly (never triggers Bitvavo). Pipeline code untouched.

## New Requirements Surfaced

- none

## Requirements Invalidated or Re-scoped

- none

## Deviations

- **Lifespan pattern:** Switched from `on_event("startup")` to `@asynccontextmanager` lifespan handler — the deprecated API would have triggered warnings in FastAPI ≥0.115. Same behavior, cleaner approach.
- **Pytest pythonpath:** Added `pythonpath=["."]` to pyproject.toml — wasn't in the plan but necessary because the `api/` package at project root isn't in the src-layout sys.path by default.

## Known Limitations

- **Research module endpoints not included:** The 8 research functions in `analysis/research.py` are not exposed as API endpoints. These are M002 scope — this slice covers only PairAnalysis (cointegration analysis).
- **No API caching layer:** Analysis endpoints recompute results on every request. For the Academy/Deep Dive use case this is fine (sub-second response times), but if Scanner calls cointegration for 20+ pairs, latency may accumulate. Server-side caching could be added in S05 if needed.
- **No rate limiting or request validation beyond Pydantic:** Sufficient for localhost development but would need hardening for any external exposure.

## Follow-ups

- S03/S04 should test that their API calls handle the `null` values in z-score arrays (warmup period) — chart components need to skip nulls.
- S05 Scanner may need a batch cointegration endpoint for efficiency — the current design requires one POST per pair, which could be slow for 20+ pairs. Evaluate during S05 planning.

## Files Created/Modified

- `api/__init__.py` — empty package init for the API module
- `api/main.py` — FastAPI app factory with CORS middleware, lifespan handler, router registration
- `api/schemas.py` — Pydantic v2 models for all endpoints + numpy_to_python() recursive converter
- `api/routers/__init__.py` — empty routers package init
- `api/routers/health.py` — GET /api/health endpoint with DataCacheManager dependency injection
- `api/routers/pairs.py` — GET /api/pairs (list cached) + GET /api/pairs/{symbol}/ohlcv (read parquet)
- `api/routers/analysis.py` — 4 POST analysis endpoints (cointegration, spread, zscore, stationarity) with shared _load_pair_data helper
- `run_api.py` — uvicorn launch script (host 0.0.0.0, port 8000, reload enabled)
- `tests/test_api.py` — 51 API endpoint tests covering all 7 endpoints, error paths, numpy conversion, and serialization safety
- `pyproject.toml` — added fastapi, uvicorn[standard], httpx dependencies + pytest pythonpath config

## Forward Intelligence

### What the next slice should know
- The API returns raw analysis data, not Plotly figure specs. The frontend (S02/S03) must build charts from the data arrays (timestamps, spread, zscore, etc.) — this gives the frontend full control over chart layout and interactivity.
- Symbol format in API URLs uses hyphens (`ETH-EUR`), not slashes. The router converts internally. The frontend pair selector should store/send the hyphenated format.
- Analysis POST endpoints expect `{"asset1": "ETH/EUR", "asset2": "ETC/EUR", "timeframe": "1h"}` in the request body — note asset symbols use slash format in the JSON body, only the URL path uses hyphens.
- Z-score arrays contain `null` values for the first `window-1` positions (rolling warmup). Chart components must handle this — either skip nulls or start the line after the warmup period.

### What's fragile
- **Cache path construction** (`cache_dir / f"{symbol_dash}_{timeframe}.parquet"`) — this convention mirrors how DataCacheManager stores files. If the cache filename pattern ever changes, both the cache manager and `api/routers/pairs.py` need updating.
- **numpy_to_python() coverage** — the recursive converter handles all currently observed numpy types, but if PairAnalysis starts returning new types (e.g., numpy datetime64), the converter would need extension. The TestSerializationSafety tests would catch this.

### Authoritative diagnostics
- `pytest tests/test_api.py -v` — the 51-test suite is the canonical contract check. If this passes, all API contracts hold.
- `pytest tests/test_api.py -v -k "SerializationSafety"` — specifically checks that no numpy types leak through any analysis endpoint.
- `GET /api/health` — quick liveness + data availability check (returns pair count).
- `GET /docs` — interactive OpenAPI docs showing all schemas and example payloads.

### What assumptions changed
- **Test count:** The plan estimated ≥12 tests. The actual suite has 51 — each endpoint has multiple test cases for structure, types, edge cases, and error paths. This was natural growth from thorough implementation, not scope creep.
- **Pair count:** The plan didn't specify a count. The cache contains 44 pair/timeframe datasets (~20 pairs × 2 timeframes), which is more than the "~20 EUR pairs" mentioned in project docs — the count includes both 1h and 4h timeframes per pair.