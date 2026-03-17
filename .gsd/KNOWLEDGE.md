# Knowledge Base

Recurring patterns, gotchas, and non-obvious rules discovered during execution.

## Pytest pythonpath for `api/` package

The project uses `src/` layout with `uv_build`. Only `src/` is on `sys.path` by default. The `api/` package at the project root is importable from `uv run python` (cwd added) but **not** from pytest without explicit config. Fix: add `[tool.pytest.ini_options] pythonpath = ["."]` to `pyproject.toml`. This was added in T01.

## FastAPI lifespan events

FastAPI `on_event("startup")` is deprecated in recent versions. Use `@asynccontextmanager` lifespan pattern instead: `async def lifespan(app): ... yield ...` passed to `FastAPI(lifespan=lifespan)`.

## Polars datetime serialization

`DataCacheManager.list_cached()` returns Python `datetime` objects (from `df["datetime"].min()`). These need explicit `.isoformat()` conversion before passing to Pydantic models that expect `str` fields. Polars Datetime columns become Python `datetime` when extracted as scalars.

## OHLCV parquet — read directly, never via get_candles()

`get_candles()` auto-fetches from Bitvavo API if cache is stale. For the API layer, always use `pl.read_parquet()` directly on cache files to avoid accidental API calls.

## Rolling z-score produces NaN for warmup period

`PairAnalysis.calculate_zscore(window=N)` uses Polars `rolling_mean`/`rolling_std` which produce NaN for the first `N-1` positions. After `numpy_to_python()` converts NaN→None, Pydantic `list[float]` rejects None values. Use `list[float | None]` for z-score arrays. The frontend should skip null values when charting.

## numpy_to_python must handle both numpy AND native Python floats

The converter checks `isinstance(obj, (np.floating, float))` to catch both `np.float64` and native Python `float('inf')`/`float('nan')`. `calculate_half_life()` returns `np.inf` (np.floating subclass) but after conversion via `.tolist()`, numpy scalars may become native Python floats that still need inf/nan checking.
