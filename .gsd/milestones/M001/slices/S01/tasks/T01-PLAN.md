---
estimated_steps: 8
estimated_files: 8
---

# T01: FastAPI app factory with health and pairs data endpoints

**Slice:** S01 — FastAPI Backend + Data API
**Milestone:** M001

## Description

Create the FastAPI backend app with CORS middleware, dependency injection for DataCacheManager, and the first 3 endpoints: health check, pairs listing, and OHLCV data. This proves the framework is installed, the data path from parquet cache through Polars to JSON works, and the API structure is ready for analysis endpoints in T02.

The API lives in `api/` at the project root (decision D013). It imports directly from the existing `src/statistical_arbitrage/` package — no code duplication.

Key challenges: Polars DataFrame → JSON serialization (use `.to_dicts()` or column extraction), symbol format conversion (URL `ETH-EUR` ↔ internal `ETH/EUR`), and reading parquet directly without triggering Bitvavo API calls (use `pl.read_parquet()` on cache files, NOT `get_candles()` which auto-fetches).

## Steps

1. **Add dependencies to `pyproject.toml`:** Add `fastapi>=0.115.0`, `uvicorn[standard]>=0.30.0`, and `httpx>=0.27.0` (for tests) to the main dependencies list.

2. **Create `api/__init__.py`:** Empty file.

3. **Create `api/routers/__init__.py`:** Empty file.

4. **Create `api/schemas.py`** with Pydantic v2 models:
   - `HealthResponse`: `status: str`, `pairs_cached: int`
   - `PairInfo`: `symbol: str`, `base: str`, `quote: str`, `timeframe: str`, `candles: int`, `start: str` (ISO datetime), `end: str` (ISO datetime), `file_size_mb: float`
   - `PairsListResponse`: `pairs: list[PairInfo]`
   - `OHLCVResponse`: `symbol: str`, `timeframe: str`, `count: int`, `timestamps: list[int]`, `open: list[float]`, `high: list[float]`, `low: list[float]`, `close: list[float]`, `volume: list[float]`

5. **Create `api/routers/health.py`:**
   - `GET /api/health` returns `HealthResponse`
   - Use dependency injection to get DataCacheManager: `def get_cache_mgr() -> DataCacheManager: return get_cache_manager()`
   - Count pairs from `cache_manager.list_cached()`

6. **Create `api/routers/pairs.py`:**
   - `GET /api/pairs` — calls `cache_manager.list_cached()`, transforms to `PairInfo` list. Convert datetime objects to ISO strings. Parse `base`/`quote` from symbol (split on `/`).
   - `GET /api/pairs/{symbol}/ohlcv` — query params: `timeframe: str = "1h"`, `days_back: int = 90`. Convert URL symbol (`ETH-EUR` → `ETH/EUR`). **Read parquet directly**: construct cache path `data/cache/{symbol_dash}_{timeframe}.parquet`, read with `pl.read_parquet()`, filter by `days_back`. Do NOT call `get_candles()` (it triggers API fetches). Return `OHLCVResponse` with column arrays.
   - Return 404 if symbol or timeframe not found in cache.

7. **Create `api/main.py`:**
   - FastAPI app with `title="Statistical Arbitrage API"`, `version="1.0.0"`, `root_path=""`.
   - Add `CORSMiddleware` allowing origin `http://localhost:3000`, all methods, all headers.
   - Include health and pairs routers.
   - Add startup log: `"🚀 Statistical Arbitrage API running"`.

8. **Create `run_api.py`** at project root:
   - `uvicorn.run("api.main:app", host="0.0.0.0", port=8000, reload=True)`

## Must-Haves

- [ ] `uv sync --all-extras` installs fastapi + uvicorn without errors
- [ ] `uv run python run_api.py` starts server on port 8000
- [ ] `GET /api/health` returns `{"status": "ok", "pairs_cached": N}` where N > 0
- [ ] `GET /api/pairs` returns JSON list of cached pairs with symbol, base, quote, timeframe, candles, start, end
- [ ] `GET /api/pairs/ETH-EUR/ohlcv?timeframe=1h` returns OHLCV data with timestamps, open, high, low, close, volume arrays
- [ ] OHLCV endpoint reads parquet directly (never calls Bitvavo API)
- [ ] Missing pair/timeframe returns 404 with `{"detail": "..."}`
- [ ] CORS headers present in responses (test with `curl -H "Origin: http://localhost:3000"`)
- [ ] OpenAPI docs render at `localhost:8000/docs`

## Verification

- `uv sync --all-extras` completes successfully
- `uv run python -c "from api.main import app; print(app.title)"` prints "Statistical Arbitrage API"
- Start server in background, then:
  - `curl localhost:8000/api/health` → 200 with pairs_cached > 0
  - `curl localhost:8000/api/pairs` → JSON array with pair objects
  - `curl 'localhost:8000/api/pairs/ETH-EUR/ohlcv?timeframe=1h'` → JSON with OHLCV arrays
  - `curl 'localhost:8000/api/pairs/FAKE-COIN/ohlcv?timeframe=1h'` → 404
  - `curl -I -H "Origin: http://localhost:3000" localhost:8000/api/health` → has `access-control-allow-origin` header

## Inputs

- `src/statistical_arbitrage/data/cache_manager.py` — `DataCacheManager` class with `list_cached()` method returning `list[dict]` with keys: symbol, timeframe, candles, start (datetime), end (datetime), file_size_mb. `get_cache_manager()` returns singleton. Cache files at `data/cache/{SYMBOL-DASH}_{timeframe}.parquet`.
- `config/settings.py` — `settings` singleton with `data.cache_dir` path.
- `data/cache/*.parquet` — Parquet files with columns: `datetime (datetime[ns])`, `timestamp (i64)`, `open (f64)`, `high (f64)`, `low (f64)`, `close (f64)`, `volume (f64)`.

## Expected Output

- `pyproject.toml` — updated with fastapi, uvicorn, httpx deps
- `api/__init__.py` — empty package init
- `api/routers/__init__.py` — empty package init
- `api/schemas.py` — Pydantic models for health, pairs, OHLCV
- `api/routers/health.py` — health endpoint
- `api/routers/pairs.py` — pairs list + OHLCV endpoints
- `api/main.py` — FastAPI app with CORS + router registration
- `run_api.py` — uvicorn launch script

## Observability Impact

- **New runtime signals:** Uvicorn access logs (method, path, status, duration) for every request. FastAPI startup log `"🚀 Statistical Arbitrage API running"` confirms boot.
- **Inspection surfaces:** `GET /api/health` returns `{"status": "ok", "pairs_cached": N}` — quick liveness + data availability check. OpenAPI docs at `/docs` for interactive endpoint exploration.
- **Error visibility:** All errors return structured JSON `{"detail": "..."}` with HTTP 404 (missing cache) or 422 (validation). Uncaught exceptions produce 500 with traceback in server logs.
- **How to inspect:** `curl localhost:8000/api/health` to verify API is up and cache is accessible. Check uvicorn stderr for request logs and errors.
