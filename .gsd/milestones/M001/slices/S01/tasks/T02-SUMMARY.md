---
id: T02
parent: S01
milestone: M001
provides:
  - 4 POST analysis endpoints (cointegration, spread, zscore, stationarity) wrapping PairAnalysis
  - numpy_to_python() recursive converter for safe JSON serialization of numpy types
  - Pydantic request/response models for all analysis endpoints
key_files:
  - api/routers/analysis.py
  - api/schemas.py
  - api/main.py
key_decisions:
  - Z-score and cointegration response arrays use `list[float | None]` to accommodate NaN warmup period from rolling calculations
patterns_established:
  - numpy_to_python() in schemas.py as the single conversion point — all analysis endpoints call it on raw PairAnalysis output before constructing Pydantic models
  - _load_pair_data() shared helper in analysis router — reads parquet for both assets, inner-joins on timestamp for alignment, returns (close1, close2, timestamps)
  - _build_critical_values() and _build_stationarity_result() as reusable converters from raw dicts to Pydantic models
observability_surfaces:
  - Analysis endpoints log warnings when half_life is infinite
  - 404 errors with structured detail for missing cache files
  - 500 errors with "Analysis failed: {error}" detail for unexpected failures
  - OpenAPI docs at /docs show all analysis schemas
duration: 20min
verification_result: passed
completed_at: 2026-03-17
blocker_discovered: false
---

# T02: Analysis endpoints with numpy serialization

**Added 4 POST analysis endpoints (cointegration, spread, zscore, stationarity) with recursive numpy→Python converter — all 94 tests passing, real PairAnalysis results served from parquet cache**

## What Happened

Created `api/routers/analysis.py` with 4 POST endpoints that wrap PairAnalysis:
- `/api/analysis/cointegration` — full Engle-Granger results with hedge ratio, spread, z-score, half-life, correlation, spread stationarity, spread properties
- `/api/analysis/spread` — spread array with configurable method (ols/ratio)
- `/api/analysis/zscore` — z-score array with configurable lookback window
- `/api/analysis/stationarity` — ADF test on asset1, asset2, or spread

Added `numpy_to_python()` recursive helper to `api/schemas.py` that converts `np.floating`→float (inf/nan→None), `np.integer`→int, `np.bool_`→bool, `np.ndarray`→list, `np.str_`→str. This handles the nested dicts from `test_cointegration()` (which contains `critical_values` and `spread_stationarity` sub-dicts).

Added Pydantic models: `AnalysisRequest`, `SpreadRequest`, `ZScoreRequest`, `StationarityRequest` (requests); `CriticalValues`, `StationarityResult`, `SpreadProperties`, `CointegrationResponse`, `SpreadResponse`, `ZScoreResponse`, `StationarityResponse` (responses).

Shared `_load_pair_data()` helper reads parquet for both assets, inner-joins on timestamp for alignment, filters by `days_back`, and returns close-price Series + timestamps.

## Verification

- `pytest tests/test_api.py -v` — 46 tests pass (14 from T01 + 32 new: 9 numpy converter, 8 cointegration, 3 spread, 3 zscore, 4 stationarity, 5 error cases)
- `pytest` (full suite) — 94 tests pass
- Live server verification with curl:
  - `POST /api/analysis/cointegration` → returns 15-field JSON with all expected fields, no serialization errors
  - `POST /api/analysis/spread` → returns spread array + timestamps
  - `POST /api/analysis/zscore` → returns zscore array with null warmup values + timestamps
  - `POST /api/analysis/stationarity` → returns ADF test results
  - Missing pair → 404 with `{"detail": "Cache not found for FAKE/EUR at 1h"}`
- JSON roundtrip verified: `json.loads(response.text)` succeeds on cointegration response

## Diagnostics

- **Liveness:** `curl -X POST localhost:8000/api/analysis/cointegration -H 'Content-Type: application/json' -d '{"asset1":"ETH/EUR","asset2":"ETC/EUR","timeframe":"1h"}'` → full results
- **Error shape:** `{"detail": "Cache not found for {symbol} at {timeframe}"}` on 404; `{"detail": "Analysis failed: {error}"}` on 500
- **Schema docs:** `/docs` → all analysis endpoints with request/response schemas
- **Z-score warmup:** First `window-1` values are `null` in zscore arrays — expected behavior from rolling calculations

## Deviations

- Z-score and cointegration `zscore` field typed as `list[float | None]` instead of `list[float]` — rolling z-score produces NaN for the first `window-1` positions, which `numpy_to_python` converts to None. Pydantic rejects None in `list[float]`, so the type was widened. This is the correct representation for frontend charting (skip null values during warmup).

## Known Issues

None.

## Files Created/Modified

- `api/routers/analysis.py` — new: 4 POST analysis endpoints with shared _load_pair_data helper
- `api/schemas.py` — extended: numpy_to_python() helper + 11 Pydantic models for analysis
- `api/main.py` — updated: registered analysis router
- `tests/test_api.py` — extended: 32 new tests for analysis endpoints, numpy converter, and error cases
