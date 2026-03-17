# S01: FastAPI Backend + Data API — Research

**Date:** 2026-03-17
**Depth:** Targeted

## Summary

This slice wraps the existing Python analysis code as a FastAPI REST API. The work is straightforward: the analysis layer (`PairAnalysis`, `DataCacheManager`, research functions) is already fully decoupled from Dash — zero UI imports. FastAPI needs to be added as a dependency, and a thin API layer created with ~7 endpoints that call existing code and serialize results to JSON.

The main challenge is numpy/Polars type serialization — `PairAnalysis` returns dicts containing `np.float64`, `np.bool_`, and `np.ndarray` values that aren't JSON-serializable by default. FastAPI's Pydantic response models will handle this cleanly, but every return path needs to convert numpy types to native Python. The data payload for OHLCV is modest (~2000 rows × 7 columns = ~100KB JSON), so no streaming or pagination needed.

FastAPI + uvicorn need to be added to `pyproject.toml`. No other new dependencies required.

## Recommendation

Create a new `api/` directory at `src/statistical_arbitrage/api/` with a modular router structure. Use Pydantic response models to enforce type serialization and provide automatic OpenAPI docs. Keep the API layer as thin as possible — no analysis logic, just plumbing from HTTP to existing Python functions.

Build the health and pairs endpoints first (proving the API structure works), then the analysis endpoints (proving numpy serialization works). Test with pytest + httpx `TestClient`.

## Implementation Landscape

### Key Files

**Existing (read-only — do NOT modify):**
- `src/statistical_arbitrage/analysis/cointegration.py` — `PairAnalysis` class. Takes `pl.Series` inputs, internally converts to numpy. Methods return dicts with `np.float64`/`np.bool_`/`np.ndarray` values. Key methods: `test_cointegration()`, `calculate_spread(method)`, `calculate_zscore(window)`, `analyze_spread_properties()`, `calculate_half_life()`, `get_correlation()`, `test_stationarity(series)`.
- `src/statistical_arbitrage/data/cache_manager.py` — `DataCacheManager` class with `get_cache_manager()` singleton. Key methods: `list_cached()` → `list[dict]` (symbol, timeframe, candles, start, end, file_size_mb); `get_candles(symbol, timeframe, days_back)` → `pl.DataFrame` with columns `[datetime, timestamp, open, high, low, close, volume]`; `has_cache(symbol, timeframe)` → bool.
- `config/settings.py` — `Settings` with nested `StrategySettings` (lookback_window, entry_threshold, exit_threshold, stop_loss, etc.). Singleton via `settings`.

**New files to create:**
- `src/statistical_arbitrage/api/__init__.py` — empty
- `src/statistical_arbitrage/api/main.py` — FastAPI app factory with CORS middleware, router registration, startup logging
- `src/statistical_arbitrage/api/routers/__init__.py` — empty
- `src/statistical_arbitrage/api/routers/pairs.py` — `GET /api/pairs` (list cached), `GET /api/pairs/{symbol}/ohlcv` (OHLCV data with query params for timeframe/days_back)
- `src/statistical_arbitrage/api/routers/analysis.py` — `POST /api/analysis/cointegration`, `POST /api/analysis/spread`, `POST /api/analysis/zscore`, `POST /api/analysis/stationarity`
- `src/statistical_arbitrage/api/routers/health.py` — `GET /api/health`
- `src/statistical_arbitrage/api/schemas.py` — Pydantic response/request models for all endpoints
- `run_api.py` — uvicorn launch script (parallel to existing `run_dashboard.py`)
- `tests/test_api.py` — API endpoint tests using httpx `TestClient`

### Data Shapes (critical for schema design)

**Parquet columns:** `[datetime (datetime[ns]), timestamp (i64), open (f64), high (f64), low (f64), close (f64), volume (f64)]`

**`list_cached()` returns:**
```python
[{"symbol": "ETH/EUR", "timeframe": "1h", "candles": 2176, 
  "start": datetime(2025, 12, 16, 17, 0), "end": datetime(2026, 3, 17, 10, 0), 
  "file_size_mb": 0.06}, ...]
```

**`test_cointegration()` returns:**
```python
{"cointegration_score": float, "p_value": float, 
 "critical_values": {"1%": float, "5%": float, "10%": float},
 "is_cointegrated": bool, "hedge_ratio": float, "intercept": float,
 "spread_stationarity": {"name": str, "adf_statistic": float, "p_value": float,
   "critical_values": {"1%": float, "5%": float, "10%": float},
   "is_stationary": bool, "interpretation": str},
 "interpretation": str}
```

**`analyze_spread_properties()` returns:**
```python
{"mean": float, "std": float, "min": float, "max": float, "median": float,
 "skewness": float, "kurtosis": float, "autocorr_lag1": float}
```

**`calculate_spread()` / `calculate_zscore()` return:** `np.ndarray` (1D, same length as input prices)

**`calculate_half_life()` returns:** `float` (can be `inf`)

**`test_stationarity()` returns:**
```python
{"name": str, "adf_statistic": float, "p_value": float,
 "critical_values": {"1%": float, "5%": float, "10%": float},
 "is_stationary": bool, "interpretation": str}
```

### Numpy serialization strategy

All numpy types must be converted to native Python before JSON serialization. Two approaches:
1. **Custom JSON encoder** on FastAPI app — catches `np.float64`, `np.bool_`, `np.int64`, `np.ndarray` globally
2. **Pydantic response models** with validators — forces conversion at the schema level

**Use approach 1 (custom encoder)** as the primary guard, plus Pydantic models for documentation. A helper function `numpy_to_python(obj)` that recursively converts dicts/lists containing numpy types should be called on analysis results before returning. Handle `np.inf` → `null` or a string sentinel for half-life.

### CORS configuration

The frontend (Next.js on :3000) needs to call the API on :8000. Add `CORSMiddleware` allowing `http://localhost:3000` origin. This is local-only, so permissive CORS is fine.

### Build Order

1. **Health endpoint + app factory** — proves FastAPI is installed and running. `GET /api/health` returns `{"status": "ok"}`. Verify: `curl localhost:8000/api/health`.
2. **Pairs endpoints** — proves cache manager integration works. `GET /api/pairs` returns pair list from `list_cached()`. `GET /api/pairs/{symbol}/ohlcv` returns OHLCV JSON from `get_candles()`. Verify: `curl localhost:8000/api/pairs` returns the 20+ cached pairs.
3. **Analysis endpoints** — proves numpy serialization works. `POST /api/analysis/cointegration` takes `{asset1: "ETH/EUR", asset2: "ETC/EUR", timeframe: "1h"}`, runs `PairAnalysis`, returns full results. Verify: `curl -X POST localhost:8000/api/analysis/cointegration -H "Content-Type: application/json" -d '{"asset1": "ETH/EUR", "asset2": "ETC/EUR", "timeframe": "1h"}'` returns valid JSON with cointegration results.
4. **Tests** — pytest with `TestClient` for all endpoints.

### Verification Approach

1. `uv sync --all-extras` — FastAPI + uvicorn install
2. `python run_api.py` (background) — server starts on :8000
3. `curl localhost:8000/api/health` → `{"status": "ok"}`
4. `curl localhost:8000/api/pairs` → JSON array of ~20 cached pairs
5. `curl localhost:8000/api/pairs/ETH-EUR/ohlcv?timeframe=1h` → JSON with ~2000 rows
6. `curl -X POST localhost:8000/api/analysis/cointegration -d '{"asset1":"ETH/EUR","asset2":"ETC/EUR","timeframe":"1h"}' -H 'Content-Type: application/json'` → full cointegration results
7. `pytest tests/test_api.py` — all endpoints pass

## Constraints

- **Polars DataFrames must be serialized to lists-of-dicts or column-oriented JSON** — Polars has no `.to_json()` that matches what the frontend needs. Use `df.to_dicts()` for row-oriented or manual column extraction.
- **`PairAnalysis` takes `pl.Series` inputs** — the API must read parquet → Polars DataFrame → extract close column as `pl.Series` → pass to `PairAnalysis`.
- **numpy types are NOT JSON-serializable** — `np.float64`, `np.bool_`, `np.int64`, `np.ndarray` all need conversion. `np.inf` needs special handling (JSON has no infinity literal).
- **Cache paths use `/` in symbols** (e.g., `"ETH/EUR"`) **but filenames use `-`** (e.g., `ETH-EUR_1h.parquet`). The API URL path should use `-` (e.g., `/api/pairs/ETH-EUR/ohlcv`) and convert internally.
- **No API keys needed** — all data is from the public parquet cache. No Bitvavo credentials required for M001.
- **`get_candles()` may trigger API fetches** if cache is stale. For the API layer, only read from cache — never trigger Bitvavo API calls. Use `has_cache()` to check, read parquet directly with `pl.read_parquet()` for guaranteed offline operation.

## Common Pitfalls

- **`np.inf` in half-life** — when there's no mean reversion, `calculate_half_life()` returns `float('inf')`. JSON serialization will fail. Convert to `None` with a note field explaining why.
- **Symbol format mismatch** — `DataCacheManager` uses `ETH/EUR` internally but filenames are `ETH-EUR`. The API URL uses `ETH-EUR` (slashes aren't valid in URL paths). Need consistent conversion at the router level.
- **Polars datetime serialization** — `list_cached()` returns Python `datetime` objects for start/end. These need ISO format conversion in the response model.
- **Stale `get_cache_manager()` singleton** — the singleton initializes paths from `settings`. In tests, this might conflict with test fixtures. Use dependency injection (`Depends`) for the cache manager so tests can override it.

## Don't Hand-Roll

| Problem | Existing Solution | Why Use It |
|---------|------------------|------------|
| API framework | FastAPI | D002 decision, Pydantic integration, auto OpenAPI docs |
| ASGI server | uvicorn | Standard FastAPI companion, already used by most FastAPI projects |
| Test client | httpx + `TestClient` | Built into FastAPI testing pattern, no real server needed |
| CORS | `fastapi.middleware.cors.CORSMiddleware` | Built-in, one-liner config |
| Response validation | Pydantic v2 models | Already a dependency, auto-serialization + docs |

## Skills Discovered

| Technology | Skill | Status |
|------------|-------|--------|
| FastAPI | wshobson/agents@fastapi-templates | available (6.8K installs) |
| FastAPI | mindrally/skills@fastapi-python | available (2.3K installs) |
