"""
Pair Deep Dive page — full analysis of a single pair.

Rebuilt with DMC components. Reads pair from global store.
"""

import dash_mantine_components as dmc
import numpy as np
import plotly.graph_objects as go
from plotly.subplots import make_subplots
from dash import Input, Output, State, dcc, html, no_update
from dash_iconify import DashIconify

from statistical_arbitrage.analysis.cointegration import PairAnalysis
from statistical_arbitrage.data.cache_manager import get_cache_manager


def _icon(name: str, size: int = 16) -> DashIconify:
    return DashIconify(icon=name, width=size, height=size)


def layout():
    """Pair Deep Dive page layout."""
    return html.Div([
        # Header
        dmc.Group([
            dmc.Title("Pair Deep Dive", order=2),
            dmc.Badge("Single Pair Analysis", variant="light", color="violet"),
        ], gap="md", mb="xs"),
        dmc.Text(
            "Complete analysis of a single pair — cointegration, spread, z-scores, distribution, half-life, and signals.",
            c="dimmed", size="sm", mb="lg",
        ),

        # Controls — pair comes from global store, just need extra params
        dmc.Paper([
            dmc.Group([
                dmc.NumberInput(
                    id="dd-days",
                    label="History (days)",
                    value=90,
                    min=7,
                    max=365,
                    w=140,
                    leftSection=_icon("tabler:calendar"),
                ),
                dmc.NumberInput(
                    id="dd-zscore-window",
                    label="Z-score window",
                    value=60,
                    min=5,
                    max=500,
                    w=140,
                    leftSection=_icon("tabler:chart-area-line"),
                ),
                dmc.Stack([
                    dmc.Text(" ", size="sm"),
                    dmc.Button(
                        "Analyze",
                        id="dd-analyze",
                        leftSection=_icon("tabler:microscope"),
                    ),
                ], gap=4),
            ], gap="md", align="flex-end"),
            dmc.Text(
                "Pair and timeframe are set in the header bar above.",
                c="dimmed", size="xs", mt="xs",
            ),
        ], shadow="xs", p="lg", radius="md", withBorder=True, mb="lg"),

        # Results
        dcc.Loading(
            html.Div(id="dd-results"),
            type="dot",
            color="#339AF0",
        ),
    ])


def register_callbacks(app):
    """Register Deep Dive callbacks."""

    @app.callback(
        Output("dd-results", "children"),
        Input("dd-analyze", "n_clicks"),
        State("global-pair-store", "data"),
        State("dd-days", "value"),
        State("dd-zscore-window", "value"),
        prevent_initial_call=True,
    )
    def run_analysis(_, pair_store, days, zscore_window):
        pair_store = pair_store or {}
        asset1 = pair_store.get("asset1")
        asset2 = pair_store.get("asset2")
        timeframe = pair_store.get("timeframe", "1h")

        if not asset1 or not asset2:
            return dmc.Alert(
                "Select both assets in the header bar above.",
                color="yellow",
                title="No pair selected",
                icon=_icon("tabler:alert-triangle"),
            )

        if asset1 == asset2:
            return dmc.Alert("Select two different assets.", color="yellow")

        cache = get_cache_manager()
        try:
            df1 = cache.get_candles(asset1, timeframe, days_back=days)
            df2 = cache.get_candles(asset2, timeframe, days_back=days)
        except Exception as e:
            return dmc.Alert(f"Data fetch error: {e}", color="red")

        if df1.is_empty() or df2.is_empty():
            return dmc.Alert("No data available for one or both assets.", color="red")

        merged = (
            df1.select(["timestamp", "datetime", "close"]).rename({"close": "close1"})
            .join(
                df2.select(["timestamp", "close"]).rename({"close": "close2"}),
                on="timestamp",
                how="inner",
            )
            .sort("timestamp")
        )

        if len(merged) < 30:
            return dmc.Alert(
                f"Only {len(merged)} overlapping datapoints — need at least 30.",
                color="red",
            )

        analysis = PairAnalysis(merged["close1"], merged["close2"])
        coint = analysis.test_cointegration()
        half_life = analysis.calculate_half_life()
        correlation = analysis.get_correlation()
        spread_props = analysis.analyze_spread_properties()
        zscore = analysis.calculate_zscore(window=zscore_window)

        datetimes = merged["datetime"].to_list()
        spread = analysis.spread

        return html.Div([
            _summary_cards(asset1, asset2, coint, half_life, correlation, spread_props, len(merged)),
            dmc.Divider(my="lg"),
            dcc.Graph(figure=_price_chart(datetimes, merged["close1"].to_numpy(), merged["close2"].to_numpy(), asset1, asset2)),
            dcc.Graph(figure=_spread_zscore_chart(datetimes, spread, zscore, asset1, asset2, zscore_window)),
            dmc.SimpleGrid(cols=2, spacing="md", children=[
                dcc.Graph(figure=_scatter_chart(merged["close2"].to_numpy(), merged["close1"].to_numpy(), coint, asset1, asset2)),
                dcc.Graph(figure=_distribution_chart(spread, zscore)),
            ]),
        ])


# ─── Summary cards ───────────────────────────────────────────────────────────

def _summary_cards(asset1, asset2, coint, half_life, correlation, spread_props, n_points):
    """Summary stats as Mantine cards."""
    cards = [
        _stat_card("Cointegrated?", "✅ Yes" if coint["is_cointegrated"] else "❌ No",
                   f"p = {coint['p_value']:.4f}", "green" if coint["is_cointegrated"] else "red"),
        _stat_card("p-value", f"{coint['p_value']:.4f}",
                   f"Stat: {coint['cointegration_score']:.2f}", "blue"),
        _stat_card("Half-life", f"{half_life:.1f}" if half_life < 10000 else "∞",
                   "periods", "blue"),
        _stat_card("Correlation", f"{correlation:.3f}", "Pearson", "blue"),
        _stat_card("Hedge Ratio", f"{coint['hedge_ratio']:.4f}",
                   f"{asset1} = β × {asset2}", "blue"),
        _stat_card("Skewness", f"{spread_props['skewness']:.2f}",
                   "spread distribution", "yellow" if abs(spread_props['skewness']) > 1 else "blue"),
        _stat_card("Kurtosis", f"{spread_props['kurtosis']:.2f}",
                   "excess (normal=0)", "yellow" if spread_props['kurtosis'] > 3 else "blue"),
        _stat_card("Datapoints", str(n_points), "overlapping candles", "gray"),
    ]
    return dmc.SimpleGrid(cols={"base": 2, "sm": 4, "lg": 8}, spacing="sm", children=cards)


def _stat_card(title, value, subtitle, color):
    return dmc.Paper([
        dmc.Text(title, c="dimmed", size="xs"),
        dmc.Title(value, order=4),
        dmc.Text(subtitle, c="dimmed", size="xs"),
    ], p="sm", radius="md", withBorder=True,
       style={"borderLeft": f"3px solid var(--mantine-color-{color}-6)"})


# ─── Charts ──────────────────────────────────────────────────────────────────

def _price_chart(datetimes, prices1, prices2, name1, name2):
    fig = make_subplots(specs=[[{"secondary_y": True}]])
    fig.add_trace(go.Scatter(x=datetimes, y=prices1, name=name1, line=dict(width=1.5)), secondary_y=False)
    fig.add_trace(go.Scatter(x=datetimes, y=prices2, name=name2, line=dict(width=1.5)), secondary_y=True)
    fig.update_layout(title="Price Comparison", height=350, legend=dict(orientation="h", y=1.1))
    fig.update_yaxes(title_text=name1, secondary_y=False)
    fig.update_yaxes(title_text=name2, secondary_y=True)
    return fig


def _spread_zscore_chart(datetimes, spread, zscore, name1, name2, window):
    fig = make_subplots(rows=2, cols=1, shared_xaxes=True, row_heights=[0.4, 0.6], vertical_spacing=0.05)
    fig.add_trace(go.Scatter(x=datetimes, y=spread, name="Spread", line=dict(width=1, color="#339AF0")), row=1, col=1)
    fig.add_trace(go.Scatter(x=datetimes, y=zscore, name="Z-score", line=dict(width=1.5, color="#FF6B6B")), row=2, col=1)

    for thresh, color, dash in [
        (2.0, "rgba(81,207,102,0.5)", "dash"), (-2.0, "rgba(81,207,102,0.5)", "dash"),
        (0.5, "rgba(255,165,0,0.4)", "dot"), (-0.5, "rgba(255,165,0,0.4)", "dot"),
        (0, "rgba(255,255,255,0.2)", "solid"),
    ]:
        fig.add_hline(y=thresh, row=2, col=1, line=dict(color=color, dash=dash, width=1))

    fig.add_hrect(y0=2.0, y1=4.0, row=2, col=1, fillcolor="rgba(81,207,102,0.05)", line_width=0)
    fig.add_hrect(y0=-4.0, y1=-2.0, row=2, col=1, fillcolor="rgba(81,207,102,0.05)", line_width=0)

    fig.update_layout(title=f"Spread & Z-score (window={window})", height=500, legend=dict(orientation="h", y=1.08))
    fig.update_yaxes(title_text="Spread", row=1, col=1)
    fig.update_yaxes(title_text="Z-score", row=2, col=1)
    return fig


def _scatter_chart(x, y, coint, name1, name2):
    fig = go.Figure()
    fig.add_trace(go.Scatter(x=x, y=y, mode="markers", marker=dict(size=3, color="rgba(51,154,240,0.4)"), name="Data"))
    hedge = coint["hedge_ratio"]
    intercept = coint["intercept"]
    x_line = np.array([x.min(), x.max()])
    y_line = hedge * x_line + intercept
    fig.add_trace(go.Scatter(x=x_line, y=y_line, mode="lines", line=dict(color="#FF6B6B", width=2, dash="dash"), name=f"β={hedge:.4f}"))
    fig.update_layout(title=f"Scatter: {name1} vs {name2}", xaxis_title=name2, yaxis_title=name1, height=350)
    return fig


def _distribution_chart(spread, zscore):
    from scipy import stats
    fig = make_subplots(rows=1, cols=2, subplot_titles=["Spread Distribution", "Z-score Distribution"])
    fig.add_trace(go.Histogram(x=spread, nbinsx=50, marker_color="rgba(51,154,240,0.6)", name="Spread"), row=1, col=1)
    zscore_clean = zscore[~np.isnan(zscore)]
    fig.add_trace(go.Histogram(x=zscore_clean, nbinsx=50, marker_color="rgba(255,107,107,0.6)", name="Z-score"), row=1, col=2)

    x_range = np.linspace(-4, 4, 100)
    normal_pdf = stats.norm.pdf(x_range)
    bin_width = 8 / 50
    scale = len(zscore_clean) * bin_width
    fig.add_trace(go.Scatter(x=x_range, y=normal_pdf * scale, mode="lines",
                             line=dict(color="white", width=1, dash="dash"), name="Normal"), row=1, col=2)
    fig.update_layout(height=350, showlegend=False)
    return fig
