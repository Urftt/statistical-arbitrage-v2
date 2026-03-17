---
id: T03
parent: S01
milestone: M001
provides:
  - 51-test pytest suite proving all 7 API endpoint contracts (health, pairs, OHLCV, cointegration, spread, zscore, stationarity)
  - Recursive numpy type walk verifying no numpy types leak into any analysis response
  - 9 error-path tests covering 404 (invalid pair/timeframe) and 422 (missing body)
key_files:
  - tests/test_api.py
key_decisions:
  - Used module-level TestClient instead of fixture — avoids repeated app construction across 51 tests
patterns_established:
  - Recursive _assert_no_numpy() class method walks entire JSON response tree checking isinstance against all numpy scalar/array types
observability_surfaces:
  - pytest tests/test_api.py -v — canonical contract verification (51 tests)
  - pytest tests/test_api.py -v -k "error" — error-path subset (9 tests)
  - pytest tests/test_api.py -v -k "numpy or serializ" — type safety subset
duration: 10m
verification_result: passed
completed_at: 2026-03-17
blocker_discovered: false
---

# T03: Comprehensive API endpoint tests

**51-test pytest suite exercising all 7 API endpoints with real parquet data, error paths, and recursive numpy serialization safety checks**

## What Happened

The test file already existed from T01/T02 with 46 passing tests covering all 7 endpoints, error paths, and numpy_to_python unit tests. Added 5 tests to complete the plan requirements:

1. `test_error_missing_body_422` — POST to analysis endpoint without body returns 422 (plan required ≥2 error-path tests including 422)
2. `TestSerializationSafety` class with 4 tests — recursive walk of cointegration, spread, zscore, and stationarity responses asserting no numpy types (`np.float64`, `np.bool_`, `np.int64`, `np.ndarray`, etc.) survive serialization

The recursive walker checks all numpy scalar types (float16/32/64, int8/16/32/64, uint8/16/32/64, bool_, str_) and ndarray, traversing nested dicts and lists with path reporting on failure.

## Verification

- `pytest tests/test_api.py -v` — **51 passed** in 2.84s
- `pytest tests/test_api.py -v -k "not_found or invalid"` — 2 passed
- `pytest tests/test_api.py -v -k "error"` — 9 passed (all error-path tests)
- No warnings about numpy serialization

### Slice-level verification (S01):
- ✅ `pytest tests/test_api.py -v` — all endpoint tests pass (health, pairs list, OHLCV, cointegration, spread, zscore, stationarity)
- ✅ `pytest tests/test_api.py -v -k "error"` — error cases pass (invalid pair, missing cache, missing body)
- ⬜ Manual server verification — not run (not required for this task, T01 summary confirmed)

## Diagnostics

- Run `pytest tests/test_api.py -v --tb=short` to check all API contracts
- Run with `-k "SerializationSafety"` to isolate the recursive numpy type walk tests
- Test class names map to endpoint groups: TestHealth, TestPairsList, TestOHLCV, TestCointegration, TestSpread, TestZScore, TestStationarity, TestAnalysisErrors, TestSerializationSafety

## Deviations

None — T01/T02 had already created most tests; T03 added the specific missing pieces (422 error test, recursive numpy type walker).

## Known Issues

None

## Files Created/Modified

- `tests/test_api.py` — added TestSerializationSafety class (4 recursive numpy type walk tests) and test_error_missing_body_422
- `.gsd/milestones/M001/slices/S01/tasks/T03-PLAN.md` — added Observability Impact section (pre-flight fix)
