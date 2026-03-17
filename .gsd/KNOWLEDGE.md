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

## create-next-app interactive prompts block in CI/agent contexts

`npx create-next-app@latest` v16+ prompts for "React Compiler" even with all flags. Pipe `echo "N"` to accept defaults: `echo "N" | npx create-next-app@latest frontend --typescript --eslint --app --no-tailwind --no-src-dir --import-alias "@/*" --use-npm`. Without this, the process hangs waiting for stdin.

## Plotly `as const` template vs mutable Layout type

`PLOTLY_DARK_TEMPLATE` uses `as const` for type safety, but `Plotly.Layout.colorway` expects `string[]` (mutable). The readonly tuple from `as const` is not assignable. Fix: spread into a new array `[...tpl.colorway]`. Same pattern applies to any readonly array from a const object passed to Plotly types.

## plotly.js SSR: `'use client'` is NOT enough

plotly.js accesses `window`/`document` at import time. In Next.js, `'use client'` components are still server-rendered for initial HTML. You MUST use `next/dynamic` with `{ ssr: false }` in addition to the `'use client'` directive. Build (`npm run build`) is the definitive test — it does full SSR and will crash with "window is not defined" if the dynamic import is missing.

## Plotly.js TypeScript: Layout.title and LayoutAxis.title must be objects

In `@types/plotly.js`, `Layout.title` is `Partial<{text: string; font: ...}>`, not `string`. Similarly, `LayoutAxis.title` expects `Partial<DataTitle>` (object with `text` field), not a bare string. And `LayoutAxis` has no `titlefont` property — use `title: { text, font }` instead. This differs from the Python Plotly API where string assignment is fine.

## PlotlyChart wrapper only merges xaxis/yaxis — xaxis2/yaxis2 need manual dark theme

The `PlotlyChart` wrapper in `frontend/components/charts/PlotlyChart.tsx` deep-merges `PLOTLY_DARK_TEMPLATE` styles into `xaxis` and `yaxis` only. For Plotly multi-axis layouts (subplots via `xaxis2`/`yaxis2`), you must manually copy the dark theme axis styles (`gridcolor`, `zerolinecolor`, `tickfont`, `title.font`) to `xaxis2`/`yaxis2`. Without this, second subplot axes render with Plotly defaults (white background appearance).

## TypeScript TS2783: spread order matters for duplicate properties

When spreading a style object that contains `title` and then explicitly setting `title`, TypeScript raises TS2783 "specified more than once". Fix: put the spread **before** explicit overrides, not after. `{ ...DARK_AXIS_STYLE, title: { text: 'Time' } }` not `{ title: { text: 'Time' }, ...DARK_AXIS_STYLE }`.
