# S01: FastAPI Backend + Data API

**Goal:** Wrap the existing Python analysis code (PairAnalysis, DataCacheManager) as a FastAPI REST API that downstream frontend slices can call for pair data, OHLCV timeseries, and cointegration analysis results.
**Demo:** `curl localhost:8000/api/pairs` returns the cached pair list; `curl -X POST localhost:8000/api/analysis/cointegration` with ETH/EUR + ETC/EUR returns real cointegration results with hedge ratio, spread, z-score, and half-life.

## Must-Haves

- `GET /api/health` returns `{status: "ok", pairs_cached: <count>}`
- `GET /api/pairs` returns JSON list of cached pairs with symbol, timeframe, candle count, date range
- `GET /api/pairs/{symbol}/ohlcv?timeframe=1h&days_back=90` returns OHLCV data as JSON arrays (timestamps, open, high, low, close, volume)
- `POST /api/analysis/cointegration` takes `{asset1, asset2, timeframe}` and returns full PairAnalysis results (cointegration test, hedge ratio, spread, z-score, half-life, correlation)
- `POST /api/analysis/spread` returns spread array with configurable method (ols/ratio)
- `POST /api/analysis/zscore` returns z-score array with configurable lookback window
- `POST /api/analysis/stationarity` returns ADF test results
- All numpy types (`np.float64`, `np.bool_`, `np.ndarray`, `np.inf`) properly serialized to JSON
- CORS allows requests from `http://localhost:3000`
- API reads only from parquet cache — never triggers Bitvavo API calls
- All endpoints have Pydantic request/response models (auto-generates OpenAPI docs at `/docs`)
- pytest test suite exercises every endpoint with httpx TestClient

## Proof Level

- This slice proves: contract (all 7 API endpoints serve real data from the existing analysis layer)
- Real runtime required: yes (needs parquet cache files on disk)
- Human/UAT required: no (contract-level, automated tests sufficient)

## Verification

- `pytest tests/test_api.py -v` — all endpoint tests pass (health, pairs list, OHLCV, cointegration, spread, zscore, stationarity)
- `pytest tests/test_api.py -v -k "error"` — error cases pass (invalid pair, missing cache, bad params)
- Manual: `uv run python run_api.py` starts server, `curl localhost:8000/api/health` returns `{"status": "ok", "pairs_cached": N}` where N > 0
- Manual: `curl localhost:8000/api/pairs` returns non-empty JSON array
- Manual: `curl -X POST localhost:8000/api/analysis/cointegration -H 'Content-Type: application/json' -d '{"asset1":"ETH/EUR","asset2":"ETC/EUR","timeframe":"1h"}'` returns valid cointegration results with all numeric fields (no `NaN`, no numpy type errors)

## Observability / Diagnostics

- Runtime signals: FastAPI request logging (method, path, status, duration) via uvicorn access logs
- Inspection surfaces: `GET /api/health` returns status + pair count; OpenAPI docs at `/docs`
- Failure visibility: API returns structured error JSON `{detail: "..."}` with appropriate HTTP status codes (404 for missing pairs, 422 for validation errors, 500 for analysis failures)
- Redaction constraints: none (no secrets in M001 — all data is from public cache)

## Integration Closure

- Upstream surfaces consumed: `src/statistical_arbitrage/analysis/cointegration.py` (PairAnalysis class), `src/statistical_arbitrage/data/cache_manager.py` (DataCacheManager + get_cache_manager()), `config/settings.py` (settings singleton), `data/cache/*.parquet` (cached OHLCV data)
- New wiring introduced in this slice: `api/` package at project root with FastAPI app; `run_api.py` launch script; `fastapi` + `uvicorn` + `httpx` added to `pyproject.toml`
- What remains before the milestone is truly usable end-to-end: S02 (frontend shell), S03/S04 (Academy pages that call these endpoints), S05 (Scanner/Deep Dive pages), S06 (polish)

## Tasks

- [ ] **T01: FastAPI app factory with health and pairs data endpoints** `est:1h`
  - Why: Establishes the API framework and proves the data path works — cache manager integration, Polars-to-JSON serialization, CORS middleware. Every subsequent task and downstream slice depends on this foundation.
  - Files: `pyproject.toml`, `api/__init__.py`, `api/main.py`, `api/schemas.py`, `api/routers/__init__.py`, `api/routers/health.py`, `api/routers/pairs.py`, `run_api.py`
  - Do: Add `fastapi`, `uvicorn[standard]`, `httpx` to pyproject.toml. Create FastAPI app with CORS (allow localhost:3000). Create Pydantic models for pair info and OHLCV responses. Implement `GET /api/health` (with pair count from cache), `GET /api/pairs` (list cached via DataCacheManager), `GET /api/pairs/{symbol}/ohlcv` (read parquet directly — NOT via get_candles() which may trigger API calls). Use dependency injection for cache manager. Convert symbol format: URL uses `ETH-EUR`, internal uses `ETH/EUR`. Handle Polars datetime serialization.
  - Verify: `uv sync --all-extras && uv run python run_api.py &` starts on :8000; `curl localhost:8000/api/health` returns status OK; `curl localhost:8000/api/pairs` returns pair list; `curl 'localhost:8000/api/pairs/ETH-EUR/ohlcv?timeframe=1h'` returns OHLCV JSON
  - Done when: health, pairs list, and OHLCV endpoints return real data from parquet cache; OpenAPI docs render at `/docs`

- [ ] **T02: Analysis endpoints with numpy serialization** `est:1h`
  - Why: The analysis endpoints are the primary value — they expose PairAnalysis (cointegration, spread, z-score, stationarity) to the frontend. Numpy serialization is the main technical risk: `np.float64`, `np.bool_`, `np.ndarray`, and `np.inf` all need conversion to JSON-safe Python types.
  - Files: `api/routers/analysis.py`, `api/schemas.py` (extend with analysis models), `api/main.py` (register analysis router)
  - Do: Create a `numpy_to_python(obj)` recursive helper that converts numpy types to native Python (float64→float, bool_→bool, ndarray→list, inf→None). Build Pydantic request/response models for cointegration, spread, zscore, stationarity. Implement 4 POST endpoints that: read parquet for both assets, extract close price as pl.Series, construct PairAnalysis, call appropriate methods, convert results with numpy_to_python, return via Pydantic models. Handle edge cases: np.inf half-life → None with explanation, missing cache → 404, analysis failure → 500 with detail.
  - Verify: `curl -X POST localhost:8000/api/analysis/cointegration -H 'Content-Type: application/json' -d '{"asset1":"ETH/EUR","asset2":"ETC/EUR","timeframe":"1h"}'` returns full results; all numeric fields are native Python types (no numpy repr strings)
  - Done when: all 4 analysis endpoints return valid JSON with real analysis results; `np.inf` half-life serializes as `null`; invalid pairs return 404

- [ ] **T03: Comprehensive API endpoint tests** `est:45m`
  - Why: Tests prove the API contracts that S03/S04/S05 depend on. Without tests, a future change to cointegration.py or cache_manager.py could silently break the API boundary.
  - Files: `tests/test_api.py`
  - Do: Use httpx `TestClient` with the FastAPI app. Test every endpoint: health returns status + pair count; pairs list is non-empty with correct fields; OHLCV returns array data with correct columns; cointegration returns all expected fields (p_value, hedge_ratio, is_cointegrated, spread, zscore, half_life, correlation); spread/zscore return arrays; stationarity returns ADF results. Test error paths: invalid symbol → 404, invalid timeframe → 404 or 422, missing request body → 422. Verify no numpy types leak into responses (spot-check that values are int/float/bool/None, not np.*).
  - Verify: `pytest tests/test_api.py -v` — all tests pass
  - Done when: ≥12 test cases pass covering all 7 endpoints + error paths; no numpy serialization issues in any response

## Files Likely Touched

- `pyproject.toml` — add fastapi, uvicorn, httpx dependencies
- `api/__init__.py` — package init
- `api/main.py` — FastAPI app factory, CORS middleware, router registration
- `api/schemas.py` — Pydantic request/response models for all endpoints
- `api/routers/__init__.py` — routers package init
- `api/routers/health.py` — health endpoint
- `api/routers/pairs.py` — pairs list + OHLCV endpoints
- `api/routers/analysis.py` — cointegration, spread, zscore, stationarity endpoints
- `run_api.py` — uvicorn launch script
- `tests/test_api.py` — API endpoint tests
- Existing (read-only): `src/statistical_arbitrage/analysis/cointegration.py`, `src/statistical_arbitrage/data/cache_manager.py`, `config/settings.py`
