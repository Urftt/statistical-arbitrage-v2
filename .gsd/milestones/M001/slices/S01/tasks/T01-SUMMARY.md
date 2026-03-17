---
id: T01
parent: S01
milestone: M001
provides:
  - FastAPI app factory with CORS middleware and lifespan events
  - GET /api/health endpoint returning status + cached pair count
  - GET /api/pairs endpoint listing all cached pair datasets with metadata
  - GET /api/pairs/{symbol}/ohlcv endpoint returning OHLCV timeseries from parquet cache
  - Pydantic v2 response models (HealthResponse, PairInfo, PairsListResponse, OHLCVResponse)
  - 14 API endpoint tests (health, pairs list, OHLCV, error cases)
key_files:
  - api/main.py
  - api/schemas.py
  - api/routers/health.py
  - api/routers/pairs.py
  - run_api.py
  - tests/test_api.py
  - pyproject.toml
key_decisions:
  - Used lifespan context manager instead of deprecated on_event("startup") for FastAPI startup logging
  - Added pythonpath=["."] to pytest config so api/ package is discoverable in tests
  - OHLCV endpoint reads parquet directly via pl.read_parquet() — never touches DataCacheManager.get_candles() to avoid API calls
patterns_established:
  - API router pattern: router per domain (health, pairs), included in app factory via create_app()
  - Symbol format conversion: URL uses ETH-EUR, internal uses ETH/EUR — conversion in router layer
  - Dependency injection: get_cache_mgr() → get_cache_manager() singleton for all endpoints
  - Cache path construction: cache_mgr.cache_dir / f"{symbol_dash}_{timeframe}.parquet"
observability_surfaces:
  - GET /api/health returns {"status": "ok", "pairs_cached": N} for liveness + data availability
  - OpenAPI docs at /docs for interactive endpoint exploration
  - Structured error JSON {"detail": "..."} with 404/422 status codes
  - Uvicorn access logs (method, path, status, duration) on stderr
duration: 20m
verification_result: passed
completed_at: 2026-03-17
blocker_discovered: false
---

# T01: FastAPI app factory with health and pairs data endpoints

**Created FastAPI backend with health, pairs listing, and OHLCV endpoints serving real data from parquet cache — 14 tests passing, CORS enabled, OpenAPI docs live at /docs**

## What Happened

Built the FastAPI REST API foundation in `api/` at the project root. Created the app factory with CORS middleware (allowing localhost:3000), dependency injection for DataCacheManager, and three endpoints:

1. `GET /api/health` — returns `{"status": "ok", "pairs_cached": 44}` by counting cached datasets via `list_cached()`
2. `GET /api/pairs` — returns full metadata for all 44 cached pair/timeframe combos (symbol, base, quote, timeframe, candle count, date range, file size)
3. `GET /api/pairs/{symbol}/ohlcv` — reads parquet cache files directly with `pl.read_parquet()`, filters by `days_back`, returns parallel arrays (timestamps, open, high, low, close, volume)

The OHLCV endpoint intentionally bypasses `get_candles()` to avoid triggering Bitvavo API calls. Symbol format conversion (URL `ETH-EUR` ↔ internal `ETH/EUR`) happens in the router layer.

Added `fastapi`, `uvicorn[standard]`, and `httpx` to pyproject.toml dependencies. Created `run_api.py` launcher script. Fixed pytest import path issue by adding `pythonpath=["."]` to pytest config. Switched from deprecated `on_event("startup")` to lifespan context manager.

## Verification

All must-haves verified:

- ✅ `uv sync --all-extras` installs fastapi + uvicorn (9 new packages)
- ✅ `uv run python -c "from api.main import app; print(app.title)"` → "Statistical Arbitrage API"
- ✅ `uv run python run_api.py` starts server on port 8000
- ✅ `curl localhost:8000/api/health` → `{"status": "ok", "pairs_cached": 44}`
- ✅ `curl localhost:8000/api/pairs` → JSON array with 44 pair objects (symbol, base, quote, timeframe, candles, start, end, file_size_mb)
- ✅ `curl 'localhost:8000/api/pairs/ETH-EUR/ohlcv?timeframe=1h'` → 2156 candles with OHLCV arrays
- ✅ `curl 'localhost:8000/api/pairs/FAKE-COIN/ohlcv?timeframe=1h'` → 404 with detail message
- ✅ CORS header `access-control-allow-origin: http://localhost:3000` present in responses
- ✅ OpenAPI docs render at `localhost:8000/docs`
- ✅ `pytest tests/test_api.py -v` → 14 passed, 0 warnings
- ✅ `pytest tests/ -v` → 62 passed (48 existing + 14 new), no regressions

Slice-level verification (partial — T01 is task 1 of 3):
- ✅ `pytest tests/test_api.py -v` — health, pairs, OHLCV, error tests pass
- ✅ `pytest tests/test_api.py -v -k "error"` — 3 error case tests pass
- ✅ Manual: server starts, health returns OK, pairs returns data
- ⏳ Analysis endpoints (cointegration, spread, zscore, stationarity) — T02 scope
- ⏳ Full test coverage including analysis endpoints — T03 scope

## Diagnostics

- **Liveness check:** `curl localhost:8000/api/health` → status + pair count
- **Data availability:** `curl localhost:8000/api/pairs` → all cached datasets with metadata
- **Endpoint docs:** `localhost:8000/docs` → interactive OpenAPI UI
- **Error shape:** All errors return `{"detail": "..."}` with 404 or 422 status
- **Server logs:** Uvicorn access logs on stderr show method, path, status, duration per request

## Deviations

- **Lifespan pattern:** Switched from `on_event("startup")` (deprecated in FastAPI ≥0.115) to `@asynccontextmanager` lifespan handler. Same behavior, no deprecation warnings.
- **Pytest pythonpath:** Added `[tool.pytest.ini_options] pythonpath=["."]` to pyproject.toml — the `api/` package at project root wasn't on pytest's import path by default.

## Known Issues

None.

## Files Created/Modified

- `api/__init__.py` — empty package init
- `api/routers/__init__.py` — empty routers package init
- `api/schemas.py` — Pydantic v2 response models (HealthResponse, PairInfo, PairsListResponse, OHLCVResponse)
- `api/routers/health.py` — GET /api/health endpoint with DataCacheManager dependency injection
- `api/routers/pairs.py` — GET /api/pairs (list cached) + GET /api/pairs/{symbol}/ohlcv (read parquet directly)
- `api/main.py` — FastAPI app factory with CORS middleware, lifespan handler, router registration
- `run_api.py` — uvicorn launch script (host 0.0.0.0, port 8000, reload enabled)
- `tests/test_api.py` — 14 API endpoint tests (health, pairs list, OHLCV data, error cases)
- `pyproject.toml` — added fastapi, uvicorn[standard], httpx deps + pytest pythonpath config
- `.gsd/milestones/M001/slices/S01/tasks/T01-PLAN.md` — added Observability Impact section
- `.gsd/KNOWLEDGE.md` — created with 4 knowledge entries from this task
