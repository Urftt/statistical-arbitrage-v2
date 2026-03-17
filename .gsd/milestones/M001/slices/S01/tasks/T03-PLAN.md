---
estimated_steps: 4
estimated_files: 1
---

# T03: Comprehensive API endpoint tests

**Slice:** S01 — FastAPI Backend + Data API
**Milestone:** M001

## Description

Write a pytest test suite that exercises every API endpoint with real data from the parquet cache. This proves the boundary contracts that downstream slices (S03-S05) depend on. Tests use httpx `TestClient` which runs the FastAPI app in-process — no real server needed.

Key things to verify beyond "it returns 200": numpy types don't leak into JSON responses, the response schema matches what frontend code will expect, and error cases return proper HTTP status codes with descriptive messages.

## Steps

1. **Create `tests/test_api.py`** with TestClient fixture:
   ```python
   import pytest
   from fastapi.testclient import TestClient
   from api.main import app
   
   @pytest.fixture
   def client():
       return TestClient(app)
   ```

2. **Health and pairs endpoint tests:**
   - `test_health` — GET /api/health returns 200, has `status` = "ok" and `pairs_cached` > 0
   - `test_pairs_list` — GET /api/pairs returns 200, non-empty list, each item has required fields (symbol, base, quote, timeframe, candles, start, end)
   - `test_pairs_ohlcv` — GET /api/pairs/ETH-EUR/ohlcv?timeframe=1h returns 200, has `timestamps`, `close` arrays of same length, length > 0
   - `test_pairs_ohlcv_not_found` — GET /api/pairs/FAKE-COIN/ohlcv returns 404
   - `test_pairs_ohlcv_with_days_back` — verify `days_back` param limits returned data

3. **Analysis endpoint tests:**
   - `test_cointegration` — POST /api/analysis/cointegration with ETH/EUR + ETC/EUR returns 200, response has all expected fields: cointegration_score, p_value, is_cointegrated (bool), hedge_ratio, spread (list), zscore (list), half_life, correlation, spread_stationarity, spread_properties, timestamps
   - `test_cointegration_invalid_pair` — POST with non-existent pair returns 404
   - `test_spread` — POST /api/analysis/spread returns spread array matching timestamps length
   - `test_spread_methods` — test both "ols" and "ratio" methods return valid arrays
   - `test_zscore` — POST /api/analysis/zscore returns zscore array, verify lookback_window param works
   - `test_stationarity` — POST /api/analysis/stationarity returns ADF result with is_stationary, p_value, adf_statistic

4. **Type safety and serialization tests:**
   - `test_no_numpy_types_in_cointegration` — parse cointegration response, recursively walk all values, assert none are numpy types (np.float64, np.bool_, np.int64, np.ndarray). Use `isinstance` checks.
   - `test_half_life_serialization` — verify half_life is either a float or None (not inf or NaN string)
   - `test_cointegration_response_is_valid_json` — verify `json.loads(response.text)` works (catches any serialization issues)

## Must-Haves

- [ ] All tests use `TestClient` (in-process, no real server needed)
- [ ] Tests cover all 7 endpoints: health, pairs list, OHLCV, cointegration, spread, zscore, stationarity
- [ ] At least 2 error-path tests (invalid pair → 404, missing body → 422)
- [ ] At least 1 numpy serialization check (recursive type verification on cointegration response)
- [ ] Tests use real parquet cache data (not mocked) — this is a contract test
- [ ] `pytest tests/test_api.py -v` passes all tests

## Verification

- `pytest tests/test_api.py -v` — all tests pass (expected: ≥12 tests)
- `pytest tests/test_api.py -v --tb=short` — no failures, no warnings about numpy serialization
- `pytest tests/test_api.py -v -k "not_found or invalid"` — error path tests pass

## Inputs

- `api/main.py` from T01 — the FastAPI `app` object to test
- `api/schemas.py` from T01+T02 — response models (for understanding expected shapes)
- `api/routers/pairs.py` from T01 — pairs endpoints to test
- `api/routers/analysis.py` from T02 — analysis endpoints to test
- `data/cache/*.parquet` — real cache data (tests read through the API which reads these)

## Observability Impact

- **New signals:** `pytest tests/test_api.py -v` becomes the canonical contract verification command — if any test fails, the API boundary is broken for downstream slices (S03-S05).
- **How to inspect:** Run `pytest tests/test_api.py -v --tb=short` to see endpoint contract health. Use `-k "error"` to isolate error-path tests. Use `-k "numpy or serializ"` to isolate type safety tests.
- **Failure visibility:** Test names encode endpoint + behavior (e.g. `test_cointegration_types_are_native`, `test_error_missing_pair_404`). Failures point directly to which contract is broken. The recursive numpy check (`test_no_numpy_types_in_response`) catches any regression in numpy→Python conversion across the entire response tree.

## Expected Output

- `tests/test_api.py` — comprehensive test file with ≥12 test cases covering all endpoints, error paths, and numpy serialization
