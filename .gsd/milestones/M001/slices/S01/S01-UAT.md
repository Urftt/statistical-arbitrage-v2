# S01: FastAPI Backend + Data API — UAT

**Milestone:** M001
**Written:** 2026-03-17

## UAT Type

- UAT mode: mixed (artifact-driven + live-runtime)
- Why this mode is sufficient: The API must serve real data from parquet cache. Automated tests verify contract correctness, but manual curl checks confirm the server actually starts and returns data humans can inspect.

## Preconditions

- Python 3.12 with UV package manager installed
- `uv sync --all-extras` has been run (installs fastapi, uvicorn, httpx)
- Parquet cache files exist in `data/cache/` (at least one pair at 1h timeframe, e.g. ETH-EUR_1h.parquet)
- Port 8000 is free

## Smoke Test

Run `uv run pytest tests/test_api.py -v` — all 51 tests should pass in under 10 seconds. This is the single command that proves the entire slice works.

## Test Cases

### 1. Health endpoint returns status and pair count

1. Start the server: `uv run python run_api.py &`
2. Wait for "Uvicorn running on" message
3. `curl -s localhost:8000/api/health | python -m json.tool`
4. **Expected:** `{"status": "ok", "pairs_cached": N}` where N > 0 (should be 44 with full cache)
5. Kill the server: `kill %1`

### 2. Pairs list returns all cached datasets with metadata

1. Start the server: `uv run python run_api.py &`
2. `curl -s localhost:8000/api/pairs | python -m json.tool | head -30`
3. **Expected:** JSON array of objects, each containing: `symbol` (format "ETH/EUR"), `base`, `quote`, `timeframe`, `candles` (integer > 0), `start` (ISO datetime string), `end` (ISO datetime string), `file_size_mb` (float)
4. Verify at least one pair at timeframe "1h" and one at "4h"

### 3. OHLCV endpoint returns candle data

1. `curl -s 'localhost:8000/api/pairs/ETH-EUR/ohlcv?timeframe=1h' | python -m json.tool | head -20`
2. **Expected:** JSON with `symbol`, `timeframe`, `candles` count, and arrays: `timestamps`, `open`, `high`, `low`, `close`, `volume`
3. Verify all arrays have the same length
4. Verify `timestamps` contains ISO datetime strings
5. Verify `open`, `high`, `low`, `close` are numeric (no strings, no NaN representations)

### 4. OHLCV with days_back filter

1. `curl -s 'localhost:8000/api/pairs/ETH-EUR/ohlcv?timeframe=1h&days_back=7' | python -m json.tool | grep candles`
2. **Expected:** `candles` count significantly less than the unfiltered count (~168 for 7 days of hourly data)

### 5. Cointegration analysis returns full results

1. `curl -s -X POST localhost:8000/api/analysis/cointegration -H 'Content-Type: application/json' -d '{"asset1":"ETH/EUR","asset2":"ETC/EUR","timeframe":"1h"}' | python -m json.tool`
2. **Expected:** JSON with all fields:
   - `p_value` (float between 0 and 1)
   - `test_statistic` (float, typically negative)
   - `critical_values` (object with `1%`, `5%`, `10%` keys)
   - `is_cointegrated` (boolean)
   - `hedge_ratio` (float)
   - `half_life` (float or null — null means infinite)
   - `correlation` (float between -1 and 1)
   - `spread` (array of floats)
   - `zscore` (array of floats and nulls — first ~60 values may be null from rolling warmup)
   - `timestamps` (array of ISO strings)
   - `spread_stationarity` (object with ADF test results)
   - `spread_properties` (object with mean, std, min, max)
3. Verify no values show as `NaN`, `Infinity`, or numpy type strings like `numpy.float64(0.5)`

### 6. Spread endpoint with method selection

1. `curl -s -X POST localhost:8000/api/analysis/spread -H 'Content-Type: application/json' -d '{"asset1":"ETH/EUR","asset2":"ETC/EUR","timeframe":"1h","method":"ratio"}' | python -m json.tool | head -5`
2. **Expected:** JSON with `spread` array, `timestamps` array, `method` = "ratio"
3. Repeat with `"method":"ols"` — spread values should differ from ratio method

### 7. Z-score endpoint with custom window

1. `curl -s -X POST localhost:8000/api/analysis/zscore -H 'Content-Type: application/json' -d '{"asset1":"ETH/EUR","asset2":"ETC/EUR","timeframe":"1h","window":30}' | python -m json.tool | head -10`
2. **Expected:** JSON with `zscore` array, `timestamps` array, `window` = 30
3. First 29 values in `zscore` should be `null` (rolling warmup for window=30)

### 8. Stationarity endpoint for spread

1. `curl -s -X POST localhost:8000/api/analysis/stationarity -H 'Content-Type: application/json' -d '{"asset1":"ETH/EUR","asset2":"ETC/EUR","timeframe":"1h","target":"spread"}' | python -m json.tool`
2. **Expected:** JSON with `test_statistic`, `p_value`, `critical_values`, `is_stationary`, `n_observations`, `target`

### 9. CORS headers present

1. `curl -s -I -X OPTIONS localhost:8000/api/health -H 'Origin: http://localhost:3000' -H 'Access-Control-Request-Method: GET' 2>&1 | grep -i access-control`
2. **Expected:** `access-control-allow-origin: http://localhost:3000` header present

### 10. OpenAPI docs render

1. Open `http://localhost:8000/docs` in a browser
2. **Expected:** Swagger UI showing all 7 endpoints with request/response schemas, try-it-out functionality

## Edge Cases

### Invalid pair returns 404

1. `curl -s localhost:8000/api/pairs/FAKE-COIN/ohlcv?timeframe=1h`
2. **Expected:** HTTP 404 with `{"detail": "..."}` mentioning the pair not being found

### Invalid timeframe returns 404

1. `curl -s localhost:8000/api/pairs/ETH-EUR/ohlcv?timeframe=15m`
2. **Expected:** HTTP 404 with `{"detail": "..."}` (15m not in cache)

### Missing request body returns 422

1. `curl -s -X POST localhost:8000/api/analysis/cointegration`
2. **Expected:** HTTP 422 with validation error detail

### Analysis with non-existent pair

1. `curl -s -X POST localhost:8000/api/analysis/cointegration -H 'Content-Type: application/json' -d '{"asset1":"FAKE/EUR","asset2":"ETH/EUR","timeframe":"1h"}'`
2. **Expected:** HTTP 404 with `{"detail": "Cache not found for FAKE/EUR at 1h"}`

### Z-score warmup nulls

1. Request z-score with window=60
2. **Expected:** First 59 values in the zscore array are `null`, remaining are numeric floats

## Failure Signals

- Server fails to start on port 8000 → dependency issue (check `uv sync`)
- Health endpoint returns `pairs_cached: 0` → cache directory misconfigured or empty
- Any numpy type strings in JSON responses (e.g. `numpy.float64(0.5)`) → numpy_to_python() converter broken
- `NaN` or `Infinity` strings in JSON → inf/nan not being converted to null
- Analysis endpoints return 500 → PairAnalysis or cache reading failure
- Tests fail with ImportError for `api` → pytest pythonpath config missing

## Requirements Proved By This UAT

- R005 — FastAPI wraps existing PairAnalysis as REST endpoints, verified by all 7 endpoints returning real analysis data
- R016 — Existing parquet cache preserved and accessible via API, verified by pairs list + OHLCV endpoints reading from cache

## Not Proven By This UAT

- Frontend consumption of the API (S02/S03/S04/S05 scope)
- Research module endpoints (analysis/research.py) — deferred to M002
- API performance under load or batch requests — not a requirement for M001
- API latency measurement — noted as milestone risk but not a gate for S01

## Notes for Tester

- The server must be started with `uv run python run_api.py` (not just `python run_api.py`) to ensure the correct virtualenv
- Symbol format matters: URL paths use hyphens (`ETH-EUR`), JSON body uses slashes (`ETH/EUR`)
- The 44 "pairs_cached" count includes both 1h and 4h timeframes for ~22 pairs — it's datasets, not unique pairs
- Z-score null values at the start of arrays are expected behavior (rolling window warmup), not a bug
- Half-life may be `null` for some pair combos — this means the spread doesn't mean-revert (infinite half-life)
