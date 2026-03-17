---
estimated_steps: 6
estimated_files: 3
---

# T02: Analysis endpoints with numpy serialization

**Slice:** S01 — FastAPI Backend + Data API
**Milestone:** M001

## Description

Add the 4 analysis endpoints that wrap PairAnalysis: cointegration, spread, z-score, and stationarity. This is the highest-risk task in the slice because PairAnalysis returns dicts and arrays with numpy types (`np.float64`, `np.bool_`, `np.int64`, `np.ndarray`) that are not JSON-serializable. The core challenge is a recursive `numpy_to_python()` converter that handles all numpy types including `np.inf` (→ `None`).

These endpoints are the primary API surface that S03/S04/S05 will consume for Academy steps, Scanner, and Deep Dive.

## Steps

1. **Create `numpy_to_python()` helper** in `api/schemas.py` (or a new `api/utils.py`):
   - Recursive function that walks dicts/lists and converts:
     - `np.floating` → `float` (but `np.inf` / `np.nan` → `None`)
     - `np.integer` → `int`
     - `np.bool_` → `bool`
     - `np.ndarray` → `list` (recursive for nested arrays)
     - `np.str_` → `str`
   - Must handle nested dicts (like `critical_values` inside cointegration results)
   - Test edge case: `calculate_half_life()` returns `float('inf')` when no mean reversion exists

2. **Add analysis Pydantic models to `api/schemas.py`:**
   - Request models (shared pattern):
     - `AnalysisRequest`: `asset1: str`, `asset2: str`, `timeframe: str = "1h"`, `days_back: int = 90`
     - `SpreadRequest(AnalysisRequest)`: add `method: Literal["ols", "ratio"] = "ols"`
     - `ZScoreRequest(AnalysisRequest)`: add `lookback_window: int = 60`
     - `StationarityRequest(AnalysisRequest)`: add `series_name: str = "spread"` (which series to test — "asset1", "asset2", or "spread")
   - Response models:
     - `CriticalValues`: `one_pct: float`, `five_pct: float`, `ten_pct: float`
     - `StationarityResult`: `name: str`, `adf_statistic: float`, `p_value: float`, `critical_values: CriticalValues`, `is_stationary: bool`, `interpretation: str`
     - `SpreadProperties`: `mean: float`, `std: float`, `min: float`, `max: float`, `median: float`, `skewness: float`, `kurtosis: float`, `autocorr_lag1: float`
     - `CointegrationResponse`: `cointegration_score: float`, `p_value: float`, `critical_values: CriticalValues`, `is_cointegrated: bool`, `hedge_ratio: float`, `intercept: float`, `spread: list[float]`, `zscore: list[float]`, `half_life: float | None`, `half_life_note: str | None`, `correlation: float`, `spread_stationarity: StationarityResult`, `spread_properties: SpreadProperties`, `interpretation: str`, `timestamps: list[int]`
     - `SpreadResponse`: `spread: list[float]`, `method: str`, `timestamps: list[int]`
     - `ZScoreResponse`: `zscore: list[float]`, `lookback_window: int`, `timestamps: list[int]`
     - `StationarityResponse`: basically `StationarityResult`

3. **Create `api/routers/analysis.py`** with a shared helper:
   - `_load_pair_data(asset1, asset2, timeframe, days_back)` → reads parquet files for both assets directly (same approach as pairs.py in T01 — `pl.read_parquet()` on cache path, NOT `get_candles()`). Returns the two close-price `pl.Series` and the timestamps array. Raises `HTTPException(404)` if cache missing.
   - Note: timestamps come from the first asset's DataFrame — both assets should share the same timestamps after alignment. If lengths differ, align by inner-joining on timestamp column before extracting close prices.

4. **Implement `POST /api/analysis/cointegration`:**
   - Load pair data via helper. Construct `PairAnalysis(asset1_prices, asset2_prices)`.
   - Call `test_cointegration()`, `calculate_spread()`, `calculate_zscore()`, `calculate_half_life()`, `get_correlation()`, `analyze_spread_properties()`.
   - Run all results through `numpy_to_python()`.
   - If half_life is `None` (was inf), set `half_life_note: "No mean reversion detected (half-life is infinite)"`.
   - Return `CointegrationResponse` with all fields + timestamps.

5. **Implement remaining 3 endpoints:**
   - `POST /api/analysis/spread` — load pair data, `PairAnalysis.calculate_spread(method=request.method)`, return spread array + timestamps.
   - `POST /api/analysis/zscore` — load pair data, calculate spread first, then `PairAnalysis.calculate_zscore(window=request.lookback_window)`, return zscore array + timestamps.
   - `POST /api/analysis/stationarity` — load pair data, determine which series to test (asset1, asset2, or spread), call `PairAnalysis.test_stationarity(series, name)`, return ADF results.

6. **Register analysis router in `api/main.py`:** Add `app.include_router(analysis_router)`.

## Must-Haves

- [ ] `POST /api/analysis/cointegration` with `{"asset1":"ETH/EUR","asset2":"ETC/EUR","timeframe":"1h"}` returns full cointegration results
- [ ] Response includes: cointegration_score, p_value, is_cointegrated, hedge_ratio, spread (array), zscore (array), half_life, correlation, spread_stationarity, spread_properties, timestamps
- [ ] All numeric values in response are native Python types (float/int/bool/None), not numpy types
- [ ] `np.inf` half-life serializes as `null` with a `half_life_note` explanation
- [ ] `POST /api/analysis/spread` returns spread array with configurable method
- [ ] `POST /api/analysis/zscore` returns z-score array with configurable lookback window
- [ ] `POST /api/analysis/stationarity` returns ADF test results
- [ ] Invalid/missing pair in any endpoint returns 404 with descriptive message
- [ ] Timestamps are included in all array responses (for frontend chart alignment)

## Verification

- Start server: `uv run python run_api.py &`
- `curl -X POST localhost:8000/api/analysis/cointegration -H 'Content-Type: application/json' -d '{"asset1":"ETH/EUR","asset2":"ETC/EUR","timeframe":"1h"}'` → returns JSON with all expected fields, no serialization errors
- `curl -X POST localhost:8000/api/analysis/spread -H 'Content-Type: application/json' -d '{"asset1":"ETH/EUR","asset2":"ETC/EUR","timeframe":"1h","method":"ols"}'` → returns spread array
- `curl -X POST localhost:8000/api/analysis/zscore -H 'Content-Type: application/json' -d '{"asset1":"ETH/EUR","asset2":"ETC/EUR","timeframe":"1h","lookback_window":60}'` → returns zscore array
- `curl -X POST localhost:8000/api/analysis/stationarity -H 'Content-Type: application/json' -d '{"asset1":"ETH/EUR","asset2":"ETC/EUR","timeframe":"1h"}'` → returns ADF results
- Verify no numpy types: `python -c "import json, requests; r = requests.post('http://localhost:8000/api/analysis/cointegration', json={'asset1':'ETH/EUR','asset2':'ETC/EUR','timeframe':'1h'}); json.loads(r.text)"` — succeeds without TypeError

## Observability Impact

- Signals added: analysis endpoints log warnings when half_life is infinite; 404 errors logged for missing cache
- How a future agent inspects this: `curl` any analysis endpoint with a known pair → full results; check `/docs` for schema
- Failure state exposed: structured `{detail: "Cache not found for {symbol} at {timeframe}"}` on 404; `{detail: "Analysis failed: {error}"}` on 500

## Inputs

- `api/main.py` from T01 — FastAPI app to register the analysis router on
- `api/schemas.py` from T01 — extend with analysis request/response models
- `api/routers/pairs.py` from T01 — reference for the parquet reading pattern and symbol conversion
- `src/statistical_arbitrage/analysis/cointegration.py` — `PairAnalysis` class. Constructor: `PairAnalysis(asset1_prices: pl.Series, asset2_prices: pl.Series)`. Methods: `test_cointegration()` → dict, `calculate_spread(method)` → np.ndarray, `calculate_zscore(window)` → np.ndarray, `calculate_half_life()` → float, `get_correlation()` → float, `analyze_spread_properties()` → dict, `test_stationarity(series, name)` → dict. All take numpy internally (constructor converts pl.Series → numpy).

## Expected Output

- `api/schemas.py` — extended with analysis Pydantic models + `numpy_to_python()` helper
- `api/routers/analysis.py` — 4 POST analysis endpoints with numpy conversion
- `api/main.py` — updated to include analysis router
