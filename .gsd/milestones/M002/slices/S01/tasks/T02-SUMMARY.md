---
id: T02
parent: S01
milestone: M002
provides:
  - Stable FastAPI research/backtest contracts with a real lookback-window sweep, a directly postable recommended backtest preset, and structured backtest diagnostics surfaced as JSON
key_files:
  - api/schemas.py
  - api/routers/research.py
  - api/routers/backtest.py
  - api/main.py
  - src/statistical_arbitrage/data/cache_manager.py
  - tests/test_backtest_api.py
key_decisions:
  - D019: expose the research handoff as a fully valid nested BacktestRequest and keep blockers/warnings/footer in structured API payloads instead of server exceptions
patterns_established:
  - Research modules can emit `recommended_backtest_params` as a fully valid backtest request object, so the handoff contract is reuse-first rather than adapter-based
  - API boundary models stay strict by wrapping engine payloads explicitly at the router boundary, which preserves frontend-friendly field names without weakening engine contracts
  - Worktree API/runtime code should resolve the shared repo-root parquet cache when the worktree-local `data/cache` directory is empty
observability_surfaces:
  - tests/test_backtest_api.py
  - tests/test_api.py
  - FastAPI OpenAPI schema for `/api/research/lookback-window` and `/api/backtest`
  - `/api/backtest` response fields: `data_quality`, `warnings`, `footer`, `signal_overlay`, `trade_log`, `equity_curve`, `metrics`
  - direct TestClient probes of recommended and blocked backtest payloads
duration: 1h40m
verification_result: passed
completed_at: 2026-03-17 21:55 CET
blocker_discovered: false
---

# T02: Expose the first research + backtest API contract and recommendation handoff

**Added a real lookback research endpoint, a structured backtest execution API, and a directly postable recommendation handoff between them.**

## What Happened

I extended `api/schemas.py` into a shared research/backtest contract. The new models cover the lookback sweep request/response, a nested `BacktestRequest` with strategy parameters, strict backtest response payloads (`data_quality`, `warnings`, `footer`, `signal_overlay`, `trade_log`, `equity_curve`, `metrics`, `spread_summary`), and the `recommended_backtest_params` handoff object that can be posted directly into the backtest endpoint.

I added `api/routers/research.py` with the first real research module endpoint: `POST /api/research/lookback-window`. It reads cached parquet-backed pair data through the existing API cache-loading path, builds the spread from a full-sample OLS hedge ratio, runs `sweep_lookback_windows(...)`, generates the existing research takeaway, and selects a recommended lookback using the same heuristic the research module already implies. That recommendation is returned as a full `BacktestRequest`, not as an ad hoc partial blob.

I added `api/routers/backtest.py` with `POST /api/backtest`. It reads cached parquet directly through the same read-only loader path, converts the request’s nested strategy object into the T01 engine parameters, runs `run_backtest(...)`, and reshapes the engine output into the frontend-facing API response. Blocking preflight runs now return HTTP 200 with `status="blocked"`, explicit blocker codes under `data_quality.blockers`, and empty `trade_log` / `equity_curve` arrays instead of surfacing as 500s.

I registered both routers in `api/main.py`, so the routes now appear in FastAPI and in the generated OpenAPI schema.

I replaced the placeholder `tests/test_backtest_api.py` with real contract coverage. The new tests prove request serialization, OpenAPI route/schema exposure, successful research response shape, recommendation-to-request validation, direct recommendation-to-backtest compatibility, successful backtest response shape, and a deterministic blocked-preflight case using an oversized lookback window.

During implementation I hit one unplanned runtime issue: this worktree’s `data/cache` directory was empty even though the real parquet cache existed at the repo root. Because the task explicitly required real cached data, I updated `src/statistical_arbitrage/data/cache_manager.py` to fall back to the shared repo-root cache when the worktree-local cache has no parquet files. That change also restored the existing API tests in this worktree.

## Verification

Passed:
- `uv run pytest tests/test_backtest_api.py -q` → `7 passed`
- `uv run pytest tests/test_backtest_engine.py tests/test_backtest_api.py -q` → `11 passed`
- `uv run pytest tests/test_api.py -q` → `51 passed`
- Direct OpenAPI introspection via `app.openapi()` confirmed routes `/api/research/lookback-window` and `/api/backtest` plus shared envelope fields (`data_quality`, `warnings`, `footer`, `signal_overlay`, `trade_log`, `equity_curve`, `metrics`, `recommended_backtest_params`)
- Direct TestClient probes confirmed:
  - research endpoint returns `recommended_result.window == recommended_backtest_params.strategy.lookback_window`
  - recommended payload posts directly to `/api/backtest`
  - blocked run returns `status="blocked"`, blocker code `insufficient_observations`, and no executed trades/equity points

Slice-level verification status after T02:
- `uv run pytest tests/test_backtest_engine.py tests/test_backtest_api.py -q` passed
- `cd frontend && npm run build` failed with `sh: next: command not found` because frontend dependencies are not installed in this worktree
- Live localhost `/research` → `/backtest` browser flow remains pending for T03, which owns the React wiring

## Diagnostics

To inspect this task later:
- Run `uv run pytest tests/test_backtest_api.py -q`
- Run `uv run pytest tests/test_backtest_engine.py tests/test_backtest_api.py -q`
- Run `uv run pytest tests/test_api.py -q` to confirm the cache fallback still preserves the older API surfaces
- Inspect `app.openapi()` for `/api/research/lookback-window` and `/api/backtest`
- Hit `/api/research/lookback-window` and inspect `recommended_backtest_params`
- Hit `/api/backtest` and inspect `data_quality.blockers`, `warnings`, `footer`, and the `trade_log` / `equity_curve` payloads

## Deviations

- I modified `src/statistical_arbitrage/data/cache_manager.py` even though it was not listed in the task plan. This was necessary because the worktree-local `data/cache` directory was empty, which would have made the “real cached data, not mock/demo data” requirement impossible to satisfy in this environment.

## Known Issues

- `cd frontend && npm run build` still fails in this worktree with `sh: next: command not found`; frontend dependencies need to be installed before the slice-level frontend verification can pass.
- The end-to-end browser/UAT flow in the slice plan remains pending until T03 wires the new endpoints into the React Research and Backtest pages.

## Files Created/Modified

- `api/schemas.py` — added the shared research/backtest contract models, nested backtest request, response envelopes, and lookback sweep payloads
- `api/routers/research.py` — added the real parquet-backed lookback research endpoint and recommendation handoff
- `api/routers/backtest.py` — added the backtest execution endpoint and strict engine-to-API payload mapping
- `api/main.py` — registered the new research and backtest routers in FastAPI
- `src/statistical_arbitrage/data/cache_manager.py` — added the repo-root cache fallback so worktree API runs can use real cached parquet data
- `tests/test_backtest_api.py` — replaced the placeholder with real API contract, compatibility, blocked-path, and OpenAPI coverage
- `.gsd/KNOWLEDGE.md` — added the worktree cache fallback gotcha for future agents
- `.gsd/DECISIONS.md` — recorded D019 for the shared research/backtest API boundary choice
