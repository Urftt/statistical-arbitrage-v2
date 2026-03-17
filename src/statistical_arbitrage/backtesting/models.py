"""Typed domain models for the backtest engine."""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


class BacktestModel(BaseModel):
    """Shared strict base model for backtesting payloads."""

    model_config = ConfigDict(extra="forbid")


class StrategyParameters(BacktestModel):
    """Serializable strategy and accounting parameters."""

    lookback_window: int = Field(gt=1)
    entry_threshold: float = Field(gt=0)
    exit_threshold: float = Field(ge=0)
    stop_loss: float = Field(gt=0)
    initial_capital: float = Field(gt=0)
    position_size: float = Field(gt=0, le=1)
    transaction_fee: float = Field(ge=0)
    min_trade_count_warning: int = Field(default=3, ge=0)


class EngineWarning(BacktestModel):
    """Structured warning or blocker surfaced to the caller."""

    code: str
    severity: Literal["warning", "blocking"]
    message: str
    details: dict[str, Any] = Field(default_factory=dict)


class DataQualityReport(BacktestModel):
    """Preflight validation output exposed with every run."""

    status: Literal["passed", "blocked"]
    observations_total: int = Field(ge=0)
    observations_usable: int = Field(ge=0)
    warmup_bars: int = Field(ge=0)
    blockers: list[EngineWarning] = Field(default_factory=list)
    warnings: list[EngineWarning] = Field(default_factory=list)


class HonestReportingFooter(BacktestModel):
    """Assumptions and limitations the UI must show honestly."""

    execution_model: str
    fee_model: str
    data_basis: str
    assumptions: list[str] = Field(default_factory=list)
    limitations: list[str] = Field(default_factory=list)


class SignalEvent(BacktestModel):
    """One signal observed at a bar close and executed on the next bar."""

    signal_index: int = Field(ge=0)
    execution_index: int = Field(ge=0)
    signal_timestamp: str
    execution_timestamp: str
    signal_type: Literal[
        "long_entry",
        "short_entry",
        "long_exit",
        "short_exit",
        "stop_loss",
    ]
    direction: Literal["long_spread", "short_spread"]
    zscore_at_signal: float
    hedge_ratio_at_signal: float


class TradeLedgerRow(BacktestModel):
    """Round-trip trade row with fee-aware accounting details."""

    trade_id: int = Field(ge=1)
    direction: Literal["long_spread", "short_spread"]
    entry_signal_index: int = Field(ge=0)
    entry_execution_index: int = Field(ge=0)
    exit_signal_index: int = Field(ge=0)
    exit_execution_index: int = Field(ge=0)
    entry_timestamp: str
    exit_timestamp: str
    entry_reason: Literal["long_entry", "short_entry"]
    exit_reason: Literal["long_exit", "short_exit", "stop_loss"]
    bars_held: int = Field(ge=1)
    entry_zscore: float
    exit_zscore: float
    hedge_ratio: float
    quantity_asset1: float
    quantity_asset2: float
    entry_price_asset1: float = Field(gt=0)
    entry_price_asset2: float = Field(gt=0)
    exit_price_asset1: float = Field(gt=0)
    exit_price_asset2: float = Field(gt=0)
    allocated_capital: float = Field(gt=0)
    gross_pnl: float
    total_fees: float = Field(ge=0)
    net_pnl: float
    return_pct: float
    equity_after_trade: float = Field(gt=0)


class EquityPoint(BacktestModel):
    """Equity curve point for one timestamp."""

    index: int = Field(ge=0)
    timestamp: str
    equity: float = Field(gt=0)
    cash: float = Field(gt=0)
    unrealized_pnl: float
    position: Literal["flat", "long_spread", "short_spread"]


class MetricSummary(BacktestModel):
    """Backtest performance summary."""

    total_trades: int = Field(ge=0)
    winning_trades: int = Field(ge=0)
    losing_trades: int = Field(ge=0)
    win_rate: float = Field(ge=0, le=1)
    total_net_pnl: float
    total_return_pct: float
    average_trade_return_pct: float
    average_holding_period_bars: float
    max_drawdown_pct: float = Field(ge=0)
    profit_factor: float | None = None
    sharpe_ratio: float | None = None
    sortino_ratio: float | None = None
    final_equity: float = Field(gt=0)


class BacktestResult(BacktestModel):
    """Top-level engine output for API and UI layers."""

    status: Literal["ok", "blocked"]
    params: StrategyParameters
    preflight: DataQualityReport
    warnings: list[EngineWarning] = Field(default_factory=list)
    footer: HonestReportingFooter
    spread_mean: float | None = None
    spread_std: float | None = None
    signals: list[SignalEvent] = Field(default_factory=list)
    trades: list[TradeLedgerRow] = Field(default_factory=list)
    equity_curve: list[EquityPoint] = Field(default_factory=list)
    metrics: MetricSummary
