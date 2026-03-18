---
estimated_steps: 6
estimated_files: 3
---

# T01: Add 7 research API endpoints, Pydantic schemas, and contract tests

**Slice:** S02 — Complete the 8-module Research Hub on the shared contract
**Milestone:** M002

## Description

Add the remaining 7 research modules as FastAPI endpoints, following the exact pattern established by the lookback-window endpoint in S01. Each module wraps an existing pure-Python analysis function from `analysis/research.py` (DO NOT modify that file), exposes it through a typed Pydantic request/response envelope, and returns a structured takeaway. Two modules (z-score threshold, transaction cost) also return `recommended_backtest_params` for the backtest handoff; the other five are diagnostic-only and return `null` for that field.

**Relevant skills:** `test` (for writing API contract tests)

## Steps

1. **Add 7 Pydantic request/response model pairs to `api/schemas.py`**

   Follow the `LookbackSweepResponse` pattern. Every response model must include these fields:
   - `module: Literal["xxx"]` — stable identifier
   - `asset1: str`, `asset2: str`, `timeframe: str`, `days_back: int`, `observations: int`
   - `results: list[XxxResultPayload]` — typed result items
   - `takeaway: ResearchTakeawayPayload`
   - `recommended_backtest_params: BacktestRequest | None = None`

   The 7 modules and their result payload shapes:

   **a) Rolling Stability** (`RollingStabilityRequest/Response`)
   - Request: extends `asset1, asset2, timeframe, days_back` + `window: int = 90`
   - Result payload `RollingStabilityResultPayload`: `timestamp: int`, `p_value: float | None`, `is_cointegrated: bool`, `hedge_ratio: float | None`, `test_statistic: float | None`
   - Note: `rolling_cointegration()` returns a Polars DataFrame. Serialize rows via `.to_dicts()`. The takeaway function `rolling_cointegration_takeaway()` also takes a DataFrame.
   - `recommended_backtest_params: None` (diagnostic)

   **b) Out-of-Sample Validation** (`OOSValidationRequest/Response`)
   - Request: `asset1, asset2, timeframe, days_back` + `split_ratios: list[float] | None = None`
   - Result payload `OOSResultPayload`: `formation_p_value: float`, `formation_cointegrated: bool`, `formation_hedge_ratio: float`, `trading_p_value: float`, `trading_cointegrated: bool`, `trading_hedge_ratio: float`, `formation_adf_stat: float`, `trading_adf_stat: float`, `formation_n: int`, `trading_n: int`, `split_ratio: float`
   - `recommended_backtest_params: None` (diagnostic)

   **c) Timeframe Comparison** (`TimeframeRequest/Response`)
   - Request: `asset1, asset2, days_back` + `timeframes: list[str] | None = None`
   - Note: NO `timeframe` field in the request — this module compares across timeframes
   - Result payload `TimeframeResultPayload`: `timeframe: str`, `p_value: float | None`, `is_cointegrated: bool`, `hedge_ratio: float | None`, `half_life: float | None`, `n_datapoints: int`, `adf_statistic: float | None`
   - `recommended_backtest_params: None` (diagnostic)

   **d) Spread Method Comparison** (`SpreadMethodRequest/Response`)
   - Request: `asset1, asset2, timeframe, days_back`
   - Result payload `SpreadMethodResultPayload`: `method: str`, `adf_statistic: float`, `adf_p_value: float`, `is_stationary: bool`, `spread_std: float`, `spread_skewness: float`, `spread_kurtosis: float`
   - **IMPORTANT**: The `SpreadMethodResult` dataclass in `research.py` has a `spread: np.ndarray` field. Do NOT include this in the API payload — it would be huge. Only include the scalar diagnostics.
   - `recommended_backtest_params: None` (diagnostic)

   **e) Z-score Threshold Sweep** (`ZScoreThresholdRequest/Response`)
   - Request: `asset1, asset2, timeframe, days_back` + `entry_range: list[float] | None = None`, `exit_range: list[float] | None = None`, `lookback_window: int = 60`
   - Result payload `ThresholdResultPayload`: `entry: float`, `exit: float`, `total_trades: int`, `avg_duration: float | None`, `max_duration: int | None`
   - `recommended_backtest_params`: Pick the threshold combo with the most trades (where `total_trades > 0`), set `entry_threshold` and `exit_threshold` on a valid `BacktestRequest`. If no trades, return `None`.

   **f) Transaction Cost Analysis** (`TxCostRequest/Response`)
   - Request: `asset1, asset2, timeframe, days_back` + `fee_levels: list[float] | None = None`, `entry_threshold: float = 2.0`, `exit_threshold: float = 0.5`, `lookback_window: int = 60`
   - Result payload `TxCostResultPayload`: `fee_pct: float`, `round_trip_pct: float`, `total_trades: int`, `profitable_trades: int`, `avg_spread_pct: float`, `min_profitable_spread_pct: float`, `net_profitable_pct: float`
   - `recommended_backtest_params`: Build a `BacktestRequest` using Bitvavo's actual fee (0.0025 = 0.25%) and the request's entry/exit thresholds. Always return it (even when trades=0, so the user can still click through).

   **g) Cointegration Method Comparison** (`CointMethodRequest/Response`)
   - Request: `asset1, asset2, timeframe, days_back`
   - Result payload `CointMethodResultPayload`: `method: str`, `is_cointegrated: bool`, `detail: str`, `statistic: float`, `critical_value: float | None`
   - `recommended_backtest_params: None` (diagnostic)

2. **Add 7 endpoint handlers in `api/routers/research.py`**

   Each endpoint follows the lookback-window handler pattern:
   ```python
   @router.post("/route-name", response_model=XxxResponse)
   def run_xxx(request: XxxRequest, cache_mgr: DataCacheManager = Depends(_get_cache_mgr)) -> XxxResponse:
       close1, close2, timestamps = _load_pair_data(...)
       prices1 = close1.to_numpy()
       prices2 = close2.to_numpy()
       raw_results = analysis_function(prices1, prices2, ...)
       takeaway = takeaway_function(raw_results)
       # ... build and return response
   ```

   Import the new schemas and the analysis functions. The imports from `research.py` use the `src.statistical_arbitrage.analysis.research` path (matching the existing lookback import).

   **Special cases:**

   - **Rolling Stability**: Pass `timestamps` (the 3rd return from `_load_pair_data()`). The result is a Polars DataFrame — serialize via `.to_dicts()` and convert each dict to a `RollingStabilityResultPayload`. The takeaway function takes the DataFrame directly.

   - **Timeframe Comparison**: Build a `get_merged_fn` closure inside the endpoint:
     ```python
     def get_merged_fn(a1: str, a2: str, tf: str):
         try:
             cache_dir = cache_mgr.cache_dir
             path1 = cache_dir / f"{a1.replace('/', '-')}_{tf}.parquet"
             path2 = cache_dir / f"{a2.replace('/', '-')}_{tf}.parquet"
             if not path1.exists() or not path2.exists():
                 return None
             df1 = pl.read_parquet(path1)
             df2 = pl.read_parquet(path2)
             # Apply days_back filter
             cutoff_ms = int((datetime.now() - timedelta(days=request.days_back)).timestamp() * 1000)
             df1 = df1.filter(pl.col("timestamp") >= cutoff_ms)
             df2 = df2.filter(pl.col("timestamp") >= cutoff_ms)
             merged = df1.select([pl.col("timestamp"), pl.col("close").alias("c1")]) \
                        .join(df2.select([pl.col("timestamp"), pl.col("close").alias("c2")]),
                              on="timestamp", how="inner")
             return merged if len(merged) >= 30 else None
         except Exception:
             return None
     ```
     This endpoint does NOT take a `timeframe` request field — it compares across timeframes. For `observations`, use the sum of `n_datapoints` across results.

   - **Z-score Threshold** and **Transaction Cost**: Pre-compute z-score before calling the analysis function:
     ```python
     hedge_ratio = float(np.polyfit(prices2, prices1, 1)[0])
     spread = prices1 - hedge_ratio * prices2
     spread_series = pl.Series(spread)
     rolling_mean = spread_series.rolling_mean(window_size=lookback_window)
     rolling_std = spread_series.rolling_std(window_size=lookback_window)
     zscore = ((spread_series - rolling_mean) / rolling_std).to_numpy()
     ```
     For `observations`, use the count of non-NaN z-score values: `int(np.sum(~np.isnan(zscore)))`.

   - **Z-score Threshold recommendation**: Pick the entry/exit combo with max `total_trades` (trades > 0). Build `BacktestRequest` with those thresholds. Return `None` if no trades.

   - **Transaction Cost recommendation**: Always return a `BacktestRequest` with `transaction_fee=0.0025` (Bitvavo) and the request's entry/exit thresholds.

   Use `numpy_to_python()` (already imported in schemas.py and available in the router) to clean numpy types in result payloads where needed.

3. **Write API contract tests in `tests/test_research_api.py`**

   Create a new test file. Use `TestClient(app)` from `api.main`. Test each of the 7 endpoints:
   - POST with `ETH/EUR` + `ETC/EUR` + `1h` + `days_back=365` (real cached data)
   - Assert 200 status
   - Assert response has `module`, `asset1`, `asset2`, `takeaway.text`, `takeaway.severity`
   - Assert `results` is a non-empty list
   - For z-score threshold and tx-cost: assert `recommended_backtest_params` is not None and has valid `asset1`, `strategy.entry_threshold`
   - For diagnostic modules: assert `recommended_backtest_params` is None
   - Also test the existing lookback-window endpoint in the same file to prove no regression

4. **Run all tests to verify no regressions**

   ```bash
   uv run pytest tests/ -q
   ```

## Must-Haves

- [ ] 7 Pydantic request/response model pairs in `api/schemas.py` following the shared envelope pattern
- [ ] 7 `@router.post(...)` handlers in `api/routers/research.py` that load real cached data, call analysis functions, and return typed responses
- [ ] `rolling_cointegration()` DataFrame serialized via `.to_dicts()`, not passed raw
- [ ] `compare_timeframes()` closure returns `None` on missing cache files instead of raising
- [ ] `SpreadMethodResult.spread` numpy array omitted from API payload
- [ ] Z-score pre-computed for threshold and tx-cost endpoints using Polars rolling_mean/rolling_std
- [ ] Z-score threshold and tx-cost return valid `recommended_backtest_params: BacktestRequest`
- [ ] Diagnostic modules return `recommended_backtest_params: None`
- [ ] Contract tests for all 7 new endpoints in `tests/test_research_api.py`
- [ ] `uv run pytest tests/ -q` passes with no regressions

## Verification

- `uv run pytest tests/test_research_api.py -v` — all 7+ new endpoint tests pass
- `uv run pytest tests/ -q` — full suite passes (no regressions against S01 tests)
- Manual: `uv run python -c "from api.main import app; print('API imports OK')"` — sanity check that all new routes register

## Inputs

- `api/schemas.py` — existing Pydantic models including `LookbackSweepResponse` (the pattern to follow), `BacktestRequest`, `ResearchTakeawayPayload`, `StrategyParametersPayload`, `numpy_to_python()`
- `api/routers/research.py` — existing lookback-window endpoint (the pattern to follow)
- `api/routers/analysis.py` — `_load_pair_data()` and `_get_cache_mgr()` helpers (import these, do not modify)
- `src/statistical_arbitrage/analysis/research.py` — all 8 analysis functions and takeaway generators. **DO NOT MODIFY this file.** Import from it.
- `tests/test_backtest_api.py` — existing API test patterns using `TestClient(app)`
- Real cached parquet data at `data/cache/` — ETH-EUR_1h.parquet, ETC-EUR_1h.parquet exist

## Expected Output

- `api/schemas.py` — extended with 7 new request/response/result-payload model sets
- `api/routers/research.py` — extended with 7 new endpoint handlers
- `tests/test_research_api.py` — new file with contract tests for all 7 (or all 8 including lookback) endpoints
