"""Tests for the Statistical Arbitrage API endpoints.

Uses httpx TestClient with the FastAPI app — no live server needed.
"""

import pytest
from fastapi.testclient import TestClient

from api.main import app

client = TestClient(app)


# ---------------------------------------------------------------------------
# Health endpoint
# ---------------------------------------------------------------------------


class TestHealth:
    def test_health_returns_ok(self):
        resp = client.get("/api/health")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "ok"
        assert isinstance(data["pairs_cached"], int)
        assert data["pairs_cached"] > 0

    def test_health_cors_header(self):
        resp = client.get(
            "/api/health", headers={"Origin": "http://localhost:3000"}
        )
        assert resp.status_code == 200
        assert resp.headers["access-control-allow-origin"] == "http://localhost:3000"


# ---------------------------------------------------------------------------
# Pairs list endpoint
# ---------------------------------------------------------------------------


class TestPairsList:
    def test_pairs_list_returns_data(self):
        resp = client.get("/api/pairs")
        assert resp.status_code == 200
        data = resp.json()
        assert "pairs" in data
        assert len(data["pairs"]) > 0

    def test_pairs_have_required_fields(self):
        resp = client.get("/api/pairs")
        pair = resp.json()["pairs"][0]
        for field in ("symbol", "base", "quote", "timeframe", "candles", "start", "end", "file_size_mb"):
            assert field in pair, f"Missing field: {field}"

    def test_pairs_symbol_format(self):
        resp = client.get("/api/pairs")
        for pair in resp.json()["pairs"]:
            assert "/" in pair["symbol"], f"Symbol should use slash format: {pair['symbol']}"

    def test_pairs_start_end_are_iso_strings(self):
        resp = client.get("/api/pairs")
        pair = resp.json()["pairs"][0]
        # ISO format check — should contain 'T' separator
        assert "T" in pair["start"]
        assert "T" in pair["end"]


# ---------------------------------------------------------------------------
# OHLCV endpoint
# ---------------------------------------------------------------------------


class TestOHLCV:
    def test_ohlcv_returns_data(self):
        resp = client.get("/api/pairs/ETH-EUR/ohlcv?timeframe=1h")
        assert resp.status_code == 200
        data = resp.json()
        assert data["symbol"] == "ETH/EUR"
        assert data["timeframe"] == "1h"
        assert data["count"] > 0

    def test_ohlcv_has_all_columns(self):
        resp = client.get("/api/pairs/ETH-EUR/ohlcv?timeframe=1h")
        data = resp.json()
        for col in ("timestamps", "open", "high", "low", "close", "volume"):
            assert col in data, f"Missing column: {col}"
            assert len(data[col]) == data["count"]

    def test_ohlcv_values_are_native_types(self):
        resp = client.get("/api/pairs/ETH-EUR/ohlcv?timeframe=1h&days_back=7")
        data = resp.json()
        assert isinstance(data["timestamps"][0], int)
        assert isinstance(data["open"][0], float)
        assert isinstance(data["volume"][0], float)

    def test_ohlcv_days_back_filter(self):
        resp_short = client.get("/api/pairs/ETH-EUR/ohlcv?timeframe=1h&days_back=7")
        resp_long = client.get("/api/pairs/ETH-EUR/ohlcv?timeframe=1h&days_back=90")
        assert resp_short.json()["count"] < resp_long.json()["count"]

    def test_ohlcv_4h_timeframe(self):
        resp = client.get("/api/pairs/ETH-EUR/ohlcv?timeframe=4h")
        assert resp.status_code == 200
        assert resp.json()["timeframe"] == "4h"


# ---------------------------------------------------------------------------
# Error cases
# ---------------------------------------------------------------------------


class TestErrors:
    def test_error_invalid_symbol_404(self):
        resp = client.get("/api/pairs/FAKE-COIN/ohlcv?timeframe=1h")
        assert resp.status_code == 404
        assert "detail" in resp.json()

    def test_error_invalid_timeframe_404(self):
        resp = client.get("/api/pairs/ETH-EUR/ohlcv?timeframe=99z")
        assert resp.status_code == 404
        assert "detail" in resp.json()

    def test_error_response_is_json(self):
        resp = client.get("/api/pairs/NONEXISTENT/ohlcv?timeframe=1h")
        assert resp.status_code == 404
        data = resp.json()
        assert isinstance(data["detail"], str)
