"""
Pair Scanner page — scan Bitvavo pairs for cointegration relationships.

Rebuilt with DMC components. Reads initial pair from global store.
"""

import dash_mantine_components as dmc
import plotly.graph_objects as go
import polars as pl
from dash import Input, Output, State, dcc, html, no_update
from dash_iconify import DashIconify

from statistical_arbitrage.analysis.cointegration import PairAnalysis
from statistical_arbitrage.data.cache_manager import get_cache_manager


def _icon(name: str, size: int = 16) -> DashIconify:
    return DashIconify(icon=name, width=size, height=size)


def layout():
    """Pair Scanner page layout."""
    # Pre-fetch pair options
    try:
        cache = get_cache_manager()
        pairs_df = cache.get_available_pairs()
        symbols = sorted(pairs_df["symbol"].to_list())
        pair_options = [{"label": s, "value": s} for s in symbols]
    except Exception:
        pair_options = []

    return html.Div([
        # Header
        dmc.Group([
            dmc.Title("Pair Scanner", order=2),
            dmc.Badge("Cointegration Discovery", variant="light", color="blue"),
        ], gap="md", mb="xs"),
        dmc.Text(
            "Scan pairs for cointegration. Select coins, run the scan, find statistically significant relationships.",
            c="dimmed", size="sm", mb="lg",
        ),

        # Controls
        dmc.Paper([
            dmc.SimpleGrid(
                cols={"base": 1, "sm": 2, "lg": 4},
                spacing="md",
                children=[
                    dmc.MultiSelect(
                        id="scanner-coins",
                        label="Coins to scan",
                        placeholder="Select coins...",
                        data=pair_options,
                        searchable=True,
                        clearable=True,
                    ),
                    dmc.Select(
                        id="scanner-timeframe",
                        label="Timeframe",
                        data=[
                            {"label": "15 min", "value": "15m"},
                            {"label": "1 hour", "value": "1h"},
                            {"label": "4 hours", "value": "4h"},
                            {"label": "1 day", "value": "1d"},
                        ],
                        value="1h",
                        leftSection=_icon("tabler:clock"),
                    ),
                    dmc.NumberInput(
                        id="scanner-days",
                        label="History (days)",
                        value=90,
                        min=7,
                        max=365,
                        leftSection=_icon("tabler:calendar"),
                    ),
                    dmc.Stack([
                        dmc.Text(" ", size="sm"),  # spacer for label alignment
                        dmc.Button(
                            "Run Scan",
                            id="scanner-run",
                            leftSection=_icon("tabler:player-play"),
                            fullWidth=True,
                        ),
                    ], gap=4),
                ],
            ),
            dmc.Group([
                dmc.Button(
                    "Select top 20 by volume",
                    id="scanner-select-top",
                    variant="subtle",
                    size="xs",
                    leftSection=_icon("tabler:star", 14),
                ),
            ], mt="sm"),
        ], shadow="xs", p="lg", radius="md", withBorder=True, mb="lg"),

        # Status
        html.Div(id="scanner-status", className="mb-3"),

        # Results
        dcc.Loading(
            html.Div(id="scanner-results"),
            type="dot",
            color="#339AF0",
        ),
    ])


def register_callbacks(app):
    """Register all callbacks for the Pair Scanner page."""

    @app.callback(
        Output("scanner-coins", "value"),
        Input("scanner-select-top", "n_clicks"),
        State("scanner-coins", "data"),
        prevent_initial_call=True,
    )
    def select_top_coins(_, options):
        """Select top coins by common crypto market cap."""
        if not options:
            return no_update

        top_symbols = [
            "BTC/EUR", "ETH/EUR", "XRP/EUR", "SOL/EUR", "ADA/EUR",
            "DOGE/EUR", "DOT/EUR", "LINK/EUR", "AVAX/EUR", "MATIC/EUR",
            "UNI/EUR", "ATOM/EUR", "LTC/EUR", "ETC/EUR", "ALGO/EUR",
            "XLM/EUR", "FIL/EUR", "NEAR/EUR", "APT/EUR", "ARB/EUR",
        ]
        available_values = set()
        for o in (options or []):
            if isinstance(o, dict):
                available_values.add(o.get("value", ""))
            elif isinstance(o, str):
                available_values.add(o)
        return [s for s in top_symbols if s in available_values]

    @app.callback(
        Output("scanner-results", "children"),
        Output("scanner-status", "children"),
        Input("scanner-run", "n_clicks"),
        State("scanner-coins", "value"),
        State("scanner-timeframe", "value"),
        State("scanner-days", "value"),
        prevent_initial_call=True,
    )
    def run_scan(_, coins, timeframe, days):
        """Run cointegration scan on selected pairs."""
        if not coins or len(coins) < 2:
            return no_update, dmc.Alert(
                "Select at least 2 coins to scan.",
                color="yellow",
                title="Missing selection",
                icon=_icon("tabler:alert-triangle"),
            )

        cache = get_cache_manager()

        # Download data
        data = {}
        for symbol in coins:
            try:
                df = cache.get_candles(symbol, timeframe, days_back=days)
                if not df.is_empty():
                    data[symbol] = df
            except Exception:
                pass

        if len(data) < 2:
            return no_update, dmc.Alert(
                "Need at least 2 coins with data. Check API connection.",
                color="red",
                title="Insufficient data",
                icon=_icon("tabler:alert-circle"),
            )

        # Test all pairs
        results = []
        pair_count = 0
        symbols = sorted(data.keys())

        for i, sym1 in enumerate(symbols):
            for sym2 in symbols[i + 1:]:
                pair_count += 1
                try:
                    df1 = data[sym1].select(["timestamp", "close"]).rename({"close": "close1"})
                    df2 = data[sym2].select(["timestamp", "close"]).rename({"close": "close2"})
                    merged = df1.join(df2, on="timestamp", how="inner")

                    if len(merged) < 30:
                        continue

                    analysis = PairAnalysis(merged["close1"], merged["close2"])
                    coint_result = analysis.test_cointegration()
                    half_life = analysis.calculate_half_life()
                    correlation = analysis.get_correlation()
                    spread_props = analysis.analyze_spread_properties()

                    results.append({
                        "Pair": f"{sym1} / {sym2}",
                        "Asset 1": sym1,
                        "Asset 2": sym2,
                        "Cointegrated": "✅" if coint_result["is_cointegrated"] else "❌",
                        "p-value": round(coint_result["p_value"], 4),
                        "Test Stat": round(coint_result["cointegration_score"], 2),
                        "Hedge Ratio": round(coint_result["hedge_ratio"], 4),
                        "Half-life": round(half_life, 1) if half_life < 10000 else "∞",
                        "Correlation": round(correlation, 3),
                        "Spread Skew": round(spread_props["skewness"], 2),
                        "Spread Kurt": round(spread_props["kurtosis"], 2),
                        "Datapoints": len(merged),
                    })
                except Exception:
                    results.append({
                        "Pair": f"{sym1} / {sym2}",
                        "Cointegrated": "⚠️",
                        "p-value": None, "Test Stat": None, "Hedge Ratio": None,
                        "Half-life": None, "Correlation": None,
                        "Spread Skew": None, "Spread Kurt": None,
                        "Datapoints": 0,
                    })

        if not results:
            return no_update, dmc.Alert("No valid pairs found.", color="yellow")

        cointegrated = [r for r in results if r["Cointegrated"] == "✅"]

        status = dmc.Alert(
            f"Scanned {pair_count} pairs. Found {len(cointegrated)} cointegrated, "
            f"{len(results) - len(cointegrated)} not cointegrated.",
            color="green" if cointegrated else "blue",
            title="Scan complete",
            icon=_icon("tabler:check"),
        )

        table = _build_results_table(results)
        p_values = [r["p-value"] for r in results if r["p-value"] is not None]
        p_chart = _build_pvalue_chart(p_values)

        return html.Div([
            table,
            dcc.Graph(figure=p_chart, className="mt-3"),
        ]), status


def _build_results_table(results: list[dict]):
    """Build results table with DMC."""
    sorted_results = sorted(
        results,
        key=lambda r: (0 if r["Cointegrated"] == "✅" else 1, r["p-value"] or 999),
    )

    head = dmc.TableThead(dmc.TableTr([
        dmc.TableTh("Pair"),
        dmc.TableTh("Coint?"),
        dmc.TableTh("p-value"),
        dmc.TableTh("Test Stat"),
        dmc.TableTh("Hedge Ratio"),
        dmc.TableTh("Half-life"),
        dmc.TableTh("Correlation"),
        dmc.TableTh("Skew"),
        dmc.TableTh("Kurt"),
        dmc.TableTh("Points"),
    ]))

    rows = []
    for r in sorted_results:
        style = {"backgroundColor": "rgba(81, 207, 102, 0.06)"} if r["Cointegrated"] == "✅" else {}
        rows.append(dmc.TableTr([
            dmc.TableTd(dmc.Text(r["Pair"], fw=600, size="sm")),
            dmc.TableTd(r["Cointegrated"]),
            dmc.TableTd(
                dmc.Text(
                    f"{r['p-value']:.4f}" if r["p-value"] is not None else "—",
                    fw=700 if r["p-value"] is not None and r["p-value"] < 0.05 else 400,
                    size="sm",
                )
            ),
            dmc.TableTd(f"{r['Test Stat']:.2f}" if r["Test Stat"] is not None else "—"),
            dmc.TableTd(f"{r['Hedge Ratio']:.4f}" if r["Hedge Ratio"] is not None else "—"),
            dmc.TableTd(str(r["Half-life"]) if r["Half-life"] is not None else "—"),
            dmc.TableTd(f"{r['Correlation']:.3f}" if r["Correlation"] is not None else "—"),
            dmc.TableTd(f"{r['Spread Skew']:.2f}" if r["Spread Skew"] is not None else "—"),
            dmc.TableTd(f"{r['Spread Kurt']:.2f}" if r["Spread Kurt"] is not None else "—"),
            dmc.TableTd(str(r["Datapoints"])),
        ], style=style))

    return dmc.Table(
        [head, dmc.TableTbody(rows)],
        striped=True,
        highlightOnHover=True,
        withTableBorder=True,
        withColumnBorders=True,
        mt="md",
    )


def _build_pvalue_chart(p_values: list[float]):
    """Build p-value distribution histogram."""
    fig = go.Figure()
    fig.add_trace(go.Histogram(
        x=p_values,
        nbinsx=20,
        marker_color="rgba(51, 154, 240, 0.7)",
        marker_line=dict(color="rgba(51, 154, 240, 1)", width=1),
    ))
    fig.add_vline(x=0.05, line_dash="dash", line_color="#FF6B6B",
                  annotation_text="p = 0.05", annotation_position="top right")
    fig.update_layout(
        title="Distribution of Cointegration p-values",
        xaxis_title="p-value",
        yaxis_title="Count",
        height=300,
    )
    return fig
