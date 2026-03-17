"""Research endpoints for connected research-to-backtest workflows."""

from __future__ import annotations

import logging

import numpy as np
from fastapi import APIRouter, Depends, HTTPException

from api.routers.analysis import _get_cache_mgr, _load_pair_data
from api.schemas import (
    BacktestRequest,
    LookbackSweepRequest,
    LookbackSweepResponse,
    LookbackWindowResultPayload,
    ResearchTakeawayPayload,
    StrategyParametersPayload,
)
from src.statistical_arbitrage.analysis.research import (
    LookbackResult,
    lookback_window_takeaway,
    sweep_lookback_windows,
)
from src.statistical_arbitrage.data.cache_manager import DataCacheManager
from statistical_arbitrage.backtesting.engine import default_strategy_parameters

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/research", tags=["research"])


def _pick_recommended_window(results: list[LookbackResult]) -> LookbackResult:
    """Match the research module's selection heuristic for a recommended preset."""
    good = [result for result in results if result.autocorrelation > 0.9 and result.crossings_2 > 0]
    if good:
        return max(good, key=lambda result: result.crossings_2)
    return max(results, key=lambda result: result.crossings_2)


@router.post("/lookback-window", response_model=LookbackSweepResponse)
def run_lookback_window_sweep(
    request: LookbackSweepRequest,
    cache_mgr: DataCacheManager = Depends(_get_cache_mgr),
) -> LookbackSweepResponse:
    """Run the first real research module and emit a compatible backtest preset."""
    if request.windows is not None and any(window < 2 for window in request.windows):
        raise HTTPException(
            status_code=422,
            detail="All lookback windows must be at least 2 bars.",
        )

    close1, close2, _ = _load_pair_data(
        request.asset1,
        request.asset2,
        request.timeframe,
        request.days_back,
        cache_mgr,
    )

    try:
        prices1 = close1.to_numpy()
        prices2 = close2.to_numpy()
        hedge_ratio = float(np.polyfit(prices2, prices1, 1)[0])
        spread = prices1 - (hedge_ratio * prices2)
        raw_results = sweep_lookback_windows(spread, windows=request.windows)
    except Exception as exc:
        logger.exception(
            "Lookback sweep failed for %s / %s",
            request.asset1,
            request.asset2,
        )
        raise HTTPException(status_code=500, detail=f"Lookback sweep failed: {exc}") from exc

    if not raw_results:
        raise HTTPException(
            status_code=422,
            detail="Not enough overlapping data to compute any lookback window results.",
        )

    takeaway = lookback_window_takeaway(raw_results)
    recommended = _pick_recommended_window(raw_results)
    strategy_defaults = default_strategy_parameters().model_dump()
    strategy_defaults["lookback_window"] = recommended.window
    strategy_payload = StrategyParametersPayload(**strategy_defaults)
    recommended_request = BacktestRequest(
        asset1=request.asset1,
        asset2=request.asset2,
        timeframe=request.timeframe,
        days_back=request.days_back,
        strategy=strategy_payload,
    )

    results = [LookbackWindowResultPayload(**result.__dict__) for result in raw_results]

    return LookbackSweepResponse(
        asset1=request.asset1,
        asset2=request.asset2,
        timeframe=request.timeframe,
        days_back=request.days_back,
        observations=len(close1),
        hedge_ratio=hedge_ratio,
        results=results,
        takeaway=ResearchTakeawayPayload(
            text=takeaway.text,
            severity=takeaway.severity,
        ),
        recommended_result=LookbackWindowResultPayload(**recommended.__dict__),
        recommended_backtest_params=recommended_request,
    )
