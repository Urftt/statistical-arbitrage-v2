"""Pydantic v2 response models for the Statistical Arbitrage API."""

from pydantic import BaseModel, Field


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
