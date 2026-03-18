"""FastAPI application factory for the Statistical Arbitrage API."""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.routers import analysis, backtest, health, optimization, pairs, research

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(application: FastAPI):
    """Application lifespan — startup and shutdown events."""
    logger.info("🚀 Statistical Arbitrage API running")
    yield


def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""
    application = FastAPI(
        title="Statistical Arbitrage API",
        version="1.0.0",
        description="REST API for statistical arbitrage research — pair data, OHLCV timeseries, and cointegration analysis.",
        root_path="",
        lifespan=lifespan,
    )

    # CORS — allow the React frontend at localhost:3000
    application.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:3000"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Register routers
    application.include_router(health.router)
    application.include_router(pairs.router)
    application.include_router(analysis.router)
    application.include_router(research.router)
    application.include_router(backtest.router)
    application.include_router(optimization.router)

    return application


app = create_app()
