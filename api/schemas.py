"""Pydantic v2 request/response models for the Statistical Arbitrage API."""

import math
from typing import Any, Literal

import numpy as np
from pydantic import BaseModel, Field

from statistical_arbitrage.backtesting.engine import default_strategy_parameters
from statistical_arbitrage.backtesting.models import (
    DataQualityReport as EngineDataQualityReport,
    EngineWarning as EngineWarningModel,
    EquityPoint as EquityPointModel,
    HonestReportingFooter as HonestReportingFooterModel,
    MetricSummary as MetricSummaryModel,
    SignalEvent as SignalEventModel,
    StrategyParameters as StrategyParametersModel,
    TradeLedgerRow as TradeLedgerRowModel,
)


# ---------------------------------------------------------------------------
# Numpy → Python type converter
# ---------------------------------------------------------------------------


def numpy_to_python(obj: Any) -> Any:
    """Recursively convert numpy types to native Python types for JSON serialization.

    Handles: np.floating → float (inf/nan → None), np.integer → int,
    np.bool_ → bool, np.str_ → str, np.ndarray → list, nested dicts/lists.
    """
    if isinstance(obj, dict):
        return {numpy_to_python(k): numpy_to_python(v) for k, v in obj.items()}
    if isinstance(obj, (list, tuple)):
        return [numpy_to_python(item) for item in obj]
    if isinstance(obj, np.ndarray):
        return [numpy_to_python(item) for item in obj.tolist()]
    if isinstance(obj, (np.floating, float)):
        val = float(obj)
        if math.isinf(val) or math.isnan(val):
            return None
        return val
    if isinstance(obj, np.integer):
        return int(obj)
    if isinstance(obj, np.bool_):
        return bool(obj)
    if isinstance(obj, np.str_):
        return str(obj)
    return obj


# ---------------------------------------------------------------------------
# Existing general API models
# ---------------------------------------------------------------------------


class HealthResponse(BaseModel):
    """Health check response."""

    status: str = Field(description="API status", examples=["ok"])
    pairs_cached: int = Field(description="Number of cached pair/timeframe combos")


class PairInfo(BaseModel):
    """Info about a single cached pair/timeframe dataset."""

    symbol: str = Field(description="Trading pair symbol (e.g. ETH/EUR)")
    base: str = Field(description="Base currency (e.g. ETH)")
    quote: str = Field(description="Quote currency (e.g. EUR)")
    timeframe: str = Field(description="Candle timeframe (e.g. 1h)")
    candles: int = Field(description="Number of cached candles")
    start: str = Field(description="Earliest candle datetime (ISO 8601)")
    end: str = Field(description="Latest candle datetime (ISO 8601)")
    file_size_mb: float = Field(description="Cache file size in MB")


class PairsListResponse(BaseModel):
    """Response listing all cached pairs."""

    pairs: list[PairInfo]


class OHLCVResponse(BaseModel):
    """OHLCV timeseries data as parallel arrays."""

    symbol: str = Field(description="Trading pair symbol (e.g. ETH/EUR)")
    timeframe: str = Field(description="Candle timeframe (e.g. 1h)")
    count: int = Field(description="Number of candles returned")
    timestamps: list[int] = Field(description="Unix timestamps in milliseconds")
    open: list[float] = Field(description="Open prices")
    high: list[float] = Field(description="High prices")
    low: list[float] = Field(description="Low prices")
    close: list[float] = Field(description="Close prices")
    volume: list[float] = Field(description="Volumes")


# ---------------------------------------------------------------------------
# Analysis request models
# ---------------------------------------------------------------------------


class AnalysisRequest(BaseModel):
    """Base request for pair analysis endpoints."""

    asset1: str = Field(description="First asset symbol (e.g. ETH/EUR)")
    asset2: str = Field(description="Second asset symbol (e.g. ETC/EUR)")
    timeframe: str = Field(default="1h", description="Candle timeframe (e.g. 1h, 4h)")
    days_back: int = Field(default=90, ge=1, le=3650, description="Days of history to analyze")


class SpreadRequest(AnalysisRequest):
    """Request for spread calculation."""

    method: Literal["ols", "ratio"] = Field(default="ols", description="Spread calculation method")


class ZScoreRequest(AnalysisRequest):
    """Request for z-score calculation."""

    lookback_window: int = Field(default=60, ge=2, description="Rolling window size for z-score")


class StationarityRequest(AnalysisRequest):
    """Request for ADF stationarity test."""

    series_name: str = Field(
        default="spread",
        description="Which series to test: 'asset1', 'asset2', or 'spread'",
    )


# ---------------------------------------------------------------------------
# Analysis response models
# ---------------------------------------------------------------------------


class CriticalValues(BaseModel):
    """ADF test critical values at standard significance levels."""

    one_pct: float = Field(description="Critical value at 1% significance")
    five_pct: float = Field(description="Critical value at 5% significance")
    ten_pct: float = Field(description="Critical value at 10% significance")


class StationarityResult(BaseModel):
    """ADF stationarity test result."""

    name: str = Field(description="Name of the series tested")
    adf_statistic: float = Field(description="ADF test statistic")
    p_value: float = Field(description="P-value of the ADF test")
    critical_values: CriticalValues
    is_stationary: bool = Field(description="Whether the series is stationary (p < 0.05)")
    interpretation: str = Field(description="Human-readable interpretation")


class SpreadProperties(BaseModel):
    """Statistical properties of the spread series."""

    mean: float
    std: float
    min: float
    max: float
    median: float
    skewness: float
    kurtosis: float
    autocorr_lag1: float


class CointegrationResponse(BaseModel):
    """Full cointegration analysis results."""

    cointegration_score: float = Field(description="Engle-Granger test statistic")
    p_value: float = Field(description="Cointegration test p-value")
    critical_values: CriticalValues
    is_cointegrated: bool = Field(description="Whether pair is cointegrated (p < 0.05)")
    hedge_ratio: float = Field(description="OLS hedge ratio")
    intercept: float = Field(description="OLS intercept")
    spread: list[float] = Field(description="Spread time series")
    zscore: list[float | None] = Field(description="Z-score time series (null for warmup period)")
    half_life: float | None = Field(description="Mean-reversion half-life in periods (null if infinite)")
    half_life_note: str | None = Field(default=None, description="Note when half-life is null")
    correlation: float = Field(description="Pearson correlation between assets")
    spread_stationarity: StationarityResult
    spread_properties: SpreadProperties
    interpretation: str = Field(description="Human-readable cointegration interpretation")
    timestamps: list[int] = Field(description="Unix timestamps in milliseconds")


class SpreadResponse(BaseModel):
    """Spread calculation results."""

    spread: list[float] = Field(description="Spread time series")
    method: str = Field(description="Spread calculation method used")
    timestamps: list[int] = Field(description="Unix timestamps in milliseconds")


class ZScoreResponse(BaseModel):
    """Z-score calculation results."""

    zscore: list[float | None] = Field(description="Z-score time series (null for warmup period)")
    lookback_window: int = Field(description="Rolling window size used")
    timestamps: list[int] = Field(description="Unix timestamps in milliseconds")


class StationarityResponse(BaseModel):
    """ADF stationarity test response."""

    name: str = Field(description="Name of the series tested")
    adf_statistic: float = Field(description="ADF test statistic")
    p_value: float = Field(description="P-value of the ADF test")
    critical_values: CriticalValues
    is_stationary: bool = Field(description="Whether the series is stationary (p < 0.05)")
    interpretation: str = Field(description="Human-readable interpretation")


# ---------------------------------------------------------------------------
# Research + backtest contract models
# ---------------------------------------------------------------------------


def _default_strategy_payload() -> "StrategyParametersPayload":
    defaults = default_strategy_parameters()
    return StrategyParametersPayload(**defaults.model_dump())


class StrategyParametersPayload(StrategyParametersModel):
    """Backtest strategy and accounting parameters exposed over the API."""


class EngineWarningPayload(EngineWarningModel):
    """Structured warning or blocker surfaced in API responses."""


class DataQualityReportPayload(EngineDataQualityReport):
    """Structured preflight data-quality output returned by the API."""


class HonestReportingFooterPayload(HonestReportingFooterModel):
    """Execution assumptions and limitations the UI must display honestly."""


class SignalOverlayPointPayload(SignalEventModel):
    """Signal overlay event with both signal and execution timestamps."""


class TradeLogEntryPayload(TradeLedgerRowModel):
    """One fee-aware round-trip trade in the backtest trade log."""


class EquityCurvePointPayload(EquityPointModel):
    """One equity curve point for charting and diagnostics."""


class MetricSummaryPayload(MetricSummaryModel):
    """Backtest performance summary returned to the frontend."""


class BacktestRequest(BaseModel):
    """Request to execute a backtest on cached parquet data."""

    asset1: str = Field(description="First asset symbol (e.g. ETH/EUR)")
    asset2: str = Field(description="Second asset symbol (e.g. ETC/EUR)")
    timeframe: str = Field(default="1h", description="Candle timeframe (e.g. 1h, 4h)")
    days_back: int = Field(
        default=365,
        ge=1,
        le=3650,
        description="Maximum days of cached history to include in the run",
    )
    strategy: StrategyParametersPayload = Field(
        default_factory=_default_strategy_payload,
        description="Pure backtest and accounting parameters",
    )


class SpreadSummaryPayload(BaseModel):
    """Spread summary stats used alongside backtest charts."""

    mean: float | None = Field(default=None, description="Mean spread across usable bars")
    std: float | None = Field(default=None, description="Sample standard deviation of the spread")


class BacktestResponse(BaseModel):
    """Stable API contract for executing a look-ahead-safe backtest."""

    status: Literal["ok", "blocked"] = Field(description="Backtest execution status")
    request: BacktestRequest
    data_quality: DataQualityReportPayload = Field(
        description="Structured preflight status, blockers, and warnings",
    )
    warnings: list[EngineWarningPayload] = Field(
        default_factory=list,
        description="Runtime and confidence warnings that the UI should surface inline",
    )
    footer: HonestReportingFooterPayload = Field(
        description="Honest-reporting metadata for assumptions and limitations",
    )
    signal_overlay: list[SignalOverlayPointPayload] = Field(
        default_factory=list,
        description="Signals observed at one bar and executed on the next bar",
    )
    trade_log: list[TradeLogEntryPayload] = Field(
        default_factory=list,
        description="Fee-aware round-trip trade ledger",
    )
    equity_curve: list[EquityCurvePointPayload] = Field(
        default_factory=list,
        description="Full equity curve for charting and diagnostics",
    )
    metrics: MetricSummaryPayload
    spread_summary: SpreadSummaryPayload = Field(
        default_factory=SpreadSummaryPayload,
        description="Backtest spread summary statistics",
    )


class ResearchTakeawayPayload(BaseModel):
    """One-line research takeaway with UI severity styling."""

    text: str = Field(description="Human-readable recommendation or interpretation")
    severity: Literal["green", "yellow", "red"] = Field(
        description="Suggested UI severity color for the takeaway",
    )


class LookbackWindowResultPayload(BaseModel):
    """One candidate z-score lookback window from the sweep."""

    window: int = Field(ge=2, description="Rolling window size in bars")
    crossings_2: int = Field(
        ge=0,
        description="Number of times the z-score crosses the ±2 threshold",
    )
    autocorrelation: float = Field(description="Lag-1 autocorrelation of the z-score")
    skewness: float = Field(description="Z-score skewness")
    kurtosis: float = Field(description="Z-score kurtosis")
    zscore_std: float = Field(description="Standard deviation of the z-score")


class LookbackSweepRequest(BaseModel):
    """Request for the first research-to-backtest handoff module."""

    asset1: str = Field(description="First asset symbol (e.g. ETH/EUR)")
    asset2: str = Field(description="Second asset symbol (e.g. ETC/EUR)")
    timeframe: str = Field(default="1h", description="Candle timeframe (e.g. 1h, 4h)")
    days_back: int = Field(
        default=365,
        ge=1,
        le=3650,
        description="Maximum days of cached history to analyze",
    )
    windows: list[int] | None = Field(
        default=None,
        description="Optional explicit list of candidate rolling lookback windows",
    )


class LookbackSweepResponse(BaseModel):
    """Research module response plus a compatible recommended backtest preset."""

    module: Literal["lookback_window"] = Field(
        default="lookback_window",
        description="Stable research module identifier",
    )
    asset1: str = Field(description="First asset symbol analyzed")
    asset2: str = Field(description="Second asset symbol analyzed")
    timeframe: str = Field(description="Candle timeframe analyzed")
    days_back: int = Field(description="History window applied to the cached data")
    observations: int = Field(description="Number of overlapping observations analyzed")
    hedge_ratio: float = Field(description="Full-sample OLS hedge ratio used to build the spread")
    results: list[LookbackWindowResultPayload] = Field(
        default_factory=list,
        description="All tested lookback windows and their signal-quality diagnostics",
    )
    takeaway: ResearchTakeawayPayload
    recommended_result: LookbackWindowResultPayload = Field(
        description="The best lookback candidate chosen for the backtest preset",
    )
    recommended_backtest_params: BacktestRequest = Field(
        description="A fully valid backtest request that can be posted directly to /api/backtest",
    )
