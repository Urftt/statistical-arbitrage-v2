"""
Research Hub — systematic empirical testing of statistical arbitrage assumptions.

Each module answers one specific question with real data.
Pair selection comes from the global header bar.
Analysis logic lives in analysis/research.py.
"""

import dash_mantine_components as dmc
import numpy as np
import plotly.graph_objects as go
from dash import Input, Output, State, dcc, html, no_update
from dash_iconify import DashIconify

from statistical_arbitrage.analysis.research import (
    rolling_cointegration, rolling_cointegration_takeaway,
    out_of_sample_validation, oos_validation_takeaway,
    compare_spread_methods, spread_methods_takeaway,
    compare_cointegration_methods, coint_methods_takeaway,
    compare_timeframes, timeframe_takeaway,
    sweep_zscore_thresholds, zscore_threshold_takeaway,
    sweep_lookback_windows, lookback_window_takeaway,
    transaction_cost_analysis, tx_cost_takeaway,
)
from statistical_arbitrage.data.cache_manager import get_cache_manager


def _icon(name: str, size: int = 16) -> DashIconify:
    return DashIconify(icon=name, width=size, height=size)


# ─── Module definitions ──────────────────────────────────────────────────────

MODULES = [
    {"id": "rolling-coint", "label": "Rolling Stability", "icon": "tabler:refresh",
     "desc": "Does this pair stay cointegrated over time, or does the relationship break down?"},
    {"id": "oos-validation", "label": "Out-of-Sample", "icon": "tabler:cut",
     "desc": "Does in-sample cointegration predict out-of-sample behavior?"},
    {"id": "timeframe", "label": "Timeframe", "icon": "tabler:clock",
     "desc": "Which candle interval produces the most robust cointegration?"},
    {"id": "spread-construction", "label": "Spread Method", "icon": "tabler:chart-line",
     "desc": "Price-level, log-price, or ratio — which spread is most stationary?"},
    {"id": "zscore-threshold", "label": "Z-score Threshold", "icon": "tabler:adjustments",
     "desc": "What entry/exit z-score levels maximize signal quality?"},
    {"id": "lookback-window", "label": "Lookback Window", "icon": "tabler:chart-area-line",
     "desc": "What rolling window produces the best z-score signals?"},
    {"id": "tx-cost", "label": "Transaction Costs", "icon": "tabler:coin",
     "desc": "Is the spread wide enough to profit after Bitvavo fees?"},
    {"id": "coint-method", "label": "Coint. Method", "icon": "tabler:flask",
     "desc": "Engle-Granger vs Johansen — do they agree?"},
]

MODULE_MAP = {m["id"]: m for m in MODULES}


# ─── Takeaway banner ─────────────────────────────────────────────────────────

SEVERITY_TO_COLOR = {"green": "green", "yellow": "yellow", "red": "red"}
SEVERITY_TO_ICON = {
    "green": "tabler:circle-check",
    "yellow": "tabler:alert-triangle",
    "red": "tabler:alert-circle",
}


def _takeaway(text: str, severity: str = "green") -> dmc.Alert:
    """Colored one-line takeaway banner."""
    return dmc.Alert(
        text,
        color=SEVERITY_TO_COLOR.get(severity, "blue"),
        icon=_icon(SEVERITY_TO_ICON.get(severity, "tabler:info-circle")),
        mb="md",
        radius="md",
    )


# ─── Page layout ─────────────────────────────────────────────────────────────

def layout(pathname: str = "/research"):
    """Research Hub layout. Module determined by URL."""
    # Determine active module from pathname
    active_id = "rolling-coint"
    for m in MODULES:
        if pathname and pathname.endswith(m["id"]):
            active_id = m["id"]
            break

    module = MODULE_MAP.get(active_id, MODULES[0])

    return html.Div([
        # Module header
        dmc.Group([
            dmc.ThemeIcon(
                _icon(module["icon"], 22),
                variant="light",
                size="lg",
                radius="md",
            ),
            dmc.Title(module["label"], order=2),
        ], gap="sm", mb="xs"),
        dmc.Text(module["desc"], c="dimmed", size="sm", mb="lg"),

        # Module-specific controls + results
        _module_content(active_id),
    ])


def _module_content(module_id: str) -> html.Div:
    """Render module-specific controls and results area."""
    controls = _module_controls(module_id)

    return html.Div([
        dmc.Paper(controls, shadow="xs", p="lg", radius="md", withBorder=True, mb="lg")
        if controls else html.Div(),
        dcc.Loading(
            html.Div(id=f"{module_id}-results"),
            type="dot",
            color="#339AF0",
        ),
    ])


def _module_controls(module_id: str) -> html.Div | None:
    """Build module-specific controls. Pair comes from global store."""
    if module_id in ("rolling-coint", "zscore-threshold", "tx-cost"):
        return dmc.Group([
            dmc.NumberInput(
                id=f"{module_id}-window",
                label="Window size",
                value=90 if module_id == "rolling-coint" else 60,
                min=10 if module_id != "rolling-coint" else 30,
                max=365 if module_id == "rolling-coint" else 300,
                w=140,
                leftSection=_icon("tabler:chart-area-line"),
            ),
            dmc.Stack([
                dmc.Text(" ", size="sm"),
                dmc.Button("Run Analysis", id=f"{module_id}-run", leftSection=_icon("tabler:player-play")),
            ], gap=4),
            dmc.Text("Pair and timeframe from the header bar.", c="dimmed", size="xs"),
        ], gap="md", align="flex-end")
    elif module_id in ("oos-validation", "spread-construction", "coint-method", "lookback-window"):
        return dmc.Group([
            dmc.Button("Run Analysis", id=f"{module_id}-run", leftSection=_icon("tabler:player-play")),
            dmc.Text("Pair and timeframe from the header bar.", c="dimmed", size="xs"),
        ], gap="md", align="center")
    elif module_id == "timeframe":
        return dmc.Group([
            dmc.Button("Compare Timeframes", id=f"{module_id}-run", leftSection=_icon("tabler:player-play")),
            dmc.Text("Tests 15m, 1h, 4h, and 1d. Pair from the header bar.", c="dimmed", size="xs"),
        ], gap="md", align="center")

    return None


# ─── Shared data fetching ────────────────────────────────────────────────────

def _get_pair_from_store(pair_store: dict | None) -> tuple[str | None, str | None, str]:
    """Extract pair info from global store."""
    store = pair_store or {}
    return store.get("asset1"), store.get("asset2"), store.get("timeframe", "1h")


def _validate_pair(asset1, asset2) -> dmc.Alert | None:
    """Return an alert if pair is invalid, None if OK."""
    if not asset1 or not asset2:
        return dmc.Alert(
            "Select both assets in the header bar above.",
            color="yellow", title="No pair selected",
            icon=_icon("tabler:alert-triangle"),
        )
    if asset1 == asset2:
        return dmc.Alert("Select two different assets.", color="yellow")
    return None


def _fetch_and_merge(asset1: str, asset2: str, timeframe: str, min_points: int = 60):
    """Fetch and merge two assets. Returns merged DataFrame or Alert on error."""
    cache = get_cache_manager()
    days = 365 if timeframe in ("1h", "15m") else 730
    df1 = cache.get_candles(asset1, timeframe, days_back=days)
    df2 = cache.get_candles(asset2, timeframe, days_back=days)

    if df1.is_empty() or df2.is_empty():
        return dmc.Alert(
            f"No cached data for {asset1} or {asset2} at {timeframe}.",
            color="yellow",
        )

    merged = (
        df1.select(["timestamp", "datetime", "close"]).rename({"close": "c1"})
        .join(
            df2.select(["timestamp", "close"]).rename({"close": "c2"}),
            on="timestamp",
            how="inner",
        )
        .sort("timestamp")
    )

    if len(merged) < min_points:
        return dmc.Alert(
            f"Not enough overlapping data: {len(merged)} points, need at least {min_points}.",
            color="yellow",
        )

    return merged


# ─── Callbacks ───────────────────────────────────────────────────────────────

def register_callbacks(app):
    """Register all Research Hub callbacks."""

    # ── Rolling Cointegration ────────────────────────────────────────────
    @app.callback(
        Output("rolling-coint-results", "children"),
        Input("rolling-coint-run", "n_clicks"),
        State("global-pair-store", "data"),
        State("rolling-coint-window", "value"),
        prevent_initial_call=True,
    )
    def run_rolling_coint(_, pair_store, window):
        asset1, asset2, timeframe = _get_pair_from_store(pair_store)
        err = _validate_pair(asset1, asset2)
        if err:
            return err

        window = int(window or 90)
        try:
            merged = _fetch_and_merge(asset1, asset2, timeframe)
            if isinstance(merged, dmc.Alert):
                return merged

            if len(merged) < window + 10:
                return dmc.Alert(f"Not enough data: {len(merged)} points, need {window + 10}.", color="yellow")

            n = len(merged)
            step = max(1, n // 500)

            results = rolling_cointegration(
                prices1=merged["c1"].to_numpy(), prices2=merged["c2"].to_numpy(),
                timestamps=merged["datetime"].to_list(), window=window, step=step,
            )

            if results.is_empty():
                return dmc.Alert("Analysis produced no results.", color="red")

            tk = rolling_cointegration_takeaway(results)
            fig = _build_rolling_coint_chart(results, asset1, asset2, timeframe, window)

            return html.Div([
                _takeaway(tk.text, tk.severity),
                dcc.Graph(figure=fig),
                _rolling_coint_stats(results),
            ])
        except Exception as e:
            return dmc.Alert(f"Analysis failed: {e}", color="red")

    # ── Out-of-Sample Validation ─────────────────────────────────────────
    @app.callback(
        Output("oos-validation-results", "children"),
        Input("oos-validation-run", "n_clicks"),
        State("global-pair-store", "data"),
        prevent_initial_call=True,
    )
    def run_oos_validation(_, pair_store):
        asset1, asset2, timeframe = _get_pair_from_store(pair_store)
        err = _validate_pair(asset1, asset2)
        if err:
            return err

        try:
            merged = _fetch_and_merge(asset1, asset2, timeframe)
            if isinstance(merged, dmc.Alert):
                return merged

            results = out_of_sample_validation(merged["c1"].to_numpy(), merged["c2"].to_numpy())
            if not results:
                return dmc.Alert("Not enough data for OOS validation (need >60 points).", color="yellow")

            tk = oos_validation_takeaway(results)
            fig = _build_oos_chart(results, asset1, asset2, timeframe)
            return html.Div([_takeaway(tk.text, tk.severity), dcc.Graph(figure=fig), _oos_table(results)])
        except Exception as e:
            return dmc.Alert(f"Analysis failed: {e}", color="red")

    # ── Spread Construction ──────────────────────────────────────────────
    @app.callback(
        Output("spread-construction-results", "children"),
        Input("spread-construction-run", "n_clicks"),
        State("global-pair-store", "data"),
        prevent_initial_call=True,
    )
    def run_spread_construction(_, pair_store):
        asset1, asset2, timeframe = _get_pair_from_store(pair_store)
        err = _validate_pair(asset1, asset2)
        if err:
            return err

        try:
            merged = _fetch_and_merge(asset1, asset2, timeframe)
            if isinstance(merged, dmc.Alert):
                return merged

            results = compare_spread_methods(merged["c1"].to_numpy(), merged["c2"].to_numpy())
            if not results:
                return dmc.Alert("Could not compute any spread methods.", color="red")

            tk = spread_methods_takeaway(results)
            fig = _build_spread_methods_chart(results, asset1, asset2, timeframe, merged)
            return html.Div([_takeaway(tk.text, tk.severity), dcc.Graph(figure=fig), _spread_methods_table(results)])
        except Exception as e:
            return dmc.Alert(f"Analysis failed: {e}", color="red")

    # ── Cointegration Method ─────────────────────────────────────────────
    @app.callback(
        Output("coint-method-results", "children"),
        Input("coint-method-run", "n_clicks"),
        State("global-pair-store", "data"),
        prevent_initial_call=True,
    )
    def run_coint_method(_, pair_store):
        asset1, asset2, timeframe = _get_pair_from_store(pair_store)
        err = _validate_pair(asset1, asset2)
        if err:
            return err

        try:
            merged = _fetch_and_merge(asset1, asset2, timeframe)
            if isinstance(merged, dmc.Alert):
                return merged

            results = compare_cointegration_methods(merged["c1"].to_numpy(), merged["c2"].to_numpy())
            if not results:
                return dmc.Alert("Could not run cointegration tests.", color="red")

            tk = coint_methods_takeaway(results)
            fig = _build_coint_methods_chart(results, asset1, asset2, timeframe)
            return html.Div([_takeaway(tk.text, tk.severity), dcc.Graph(figure=fig), _coint_methods_table(results)])
        except Exception as e:
            return dmc.Alert(f"Analysis failed: {e}", color="red")

    # ── Timeframe ────────────────────────────────────────────────────────
    @app.callback(
        Output("timeframe-results", "children"),
        Input("timeframe-run", "n_clicks"),
        State("global-pair-store", "data"),
        prevent_initial_call=True,
    )
    def run_timeframe(_, pair_store):
        asset1, asset2, _ = _get_pair_from_store(pair_store)
        err = _validate_pair(asset1, asset2)
        if err:
            return err

        try:
            def get_merged(a1, a2, tf):
                m = _fetch_and_merge(a1, a2, tf, min_points=30)
                return None if isinstance(m, dmc.Alert) else m

            results = compare_timeframes(get_merged, asset1, asset2)
            valid = [r for r in results if r.p_value is not None]
            if not valid:
                return dmc.Alert("No timeframes had sufficient data.", color="yellow")

            tk = timeframe_takeaway(results)
            fig = _build_timeframe_chart(results, asset1, asset2)
            return html.Div([_takeaway(tk.text, tk.severity), dcc.Graph(figure=fig), _timeframe_table(results)])
        except Exception as e:
            return dmc.Alert(f"Analysis failed: {e}", color="red")

    # ── Z-score Threshold ────────────────────────────────────────────────
    @app.callback(
        Output("zscore-threshold-results", "children"),
        Input("zscore-threshold-run", "n_clicks"),
        State("global-pair-store", "data"),
        State("zscore-threshold-window", "value"),
        prevent_initial_call=True,
    )
    def run_zscore_threshold(_, pair_store, window):
        asset1, asset2, timeframe = _get_pair_from_store(pair_store)
        err = _validate_pair(asset1, asset2)
        if err:
            return err

        window = int(window or 60)
        try:
            merged = _fetch_and_merge(asset1, asset2, timeframe)
            if isinstance(merged, dmc.Alert):
                return merged

            import polars as pl
            p1, p2 = merged["c1"].to_numpy(), merged["c2"].to_numpy()
            hr = float(np.polyfit(p2, p1, 1)[0])
            spread = p1 - hr * p2
            s = pl.Series(spread)
            zscore = ((s - s.rolling_mean(window_size=window)) / s.rolling_std(window_size=window)).to_numpy()

            results = sweep_zscore_thresholds(zscore)
            if not results:
                return dmc.Alert("Could not compute z-score thresholds.", color="red")

            tk = zscore_threshold_takeaway(results)
            fig = _build_threshold_chart(results, asset1, asset2, timeframe, window)
            return html.Div([_takeaway(tk.text, tk.severity), dcc.Graph(figure=fig)])
        except Exception as e:
            return dmc.Alert(f"Analysis failed: {e}", color="red")

    # ── Lookback Window ──────────────────────────────────────────────────
    @app.callback(
        Output("lookback-window-results", "children"),
        Input("lookback-window-run", "n_clicks"),
        State("global-pair-store", "data"),
        prevent_initial_call=True,
    )
    def run_lookback_window(_, pair_store):
        asset1, asset2, timeframe = _get_pair_from_store(pair_store)
        err = _validate_pair(asset1, asset2)
        if err:
            return err

        try:
            merged = _fetch_and_merge(asset1, asset2, timeframe)
            if isinstance(merged, dmc.Alert):
                return merged

            p1, p2 = merged["c1"].to_numpy(), merged["c2"].to_numpy()
            hr = float(np.polyfit(p2, p1, 1)[0])
            spread = p1 - hr * p2

            results = sweep_lookback_windows(spread)
            if not results:
                return dmc.Alert("Not enough data for lookback analysis.", color="yellow")

            tk = lookback_window_takeaway(results)
            fig = _build_lookback_chart(results, asset1, asset2, timeframe)
            return html.Div([_takeaway(tk.text, tk.severity), dcc.Graph(figure=fig), _lookback_table(results)])
        except Exception as e:
            return dmc.Alert(f"Analysis failed: {e}", color="red")

    # ── Transaction Cost ─────────────────────────────────────────────────
    @app.callback(
        Output("tx-cost-results", "children"),
        Input("tx-cost-run", "n_clicks"),
        State("global-pair-store", "data"),
        State("tx-cost-window", "value"),
        prevent_initial_call=True,
    )
    def run_tx_cost(_, pair_store, window):
        asset1, asset2, timeframe = _get_pair_from_store(pair_store)
        err = _validate_pair(asset1, asset2)
        if err:
            return err

        window = int(window or 60)
        try:
            merged = _fetch_and_merge(asset1, asset2, timeframe)
            if isinstance(merged, dmc.Alert):
                return merged

            import polars as pl
            p1, p2 = merged["c1"].to_numpy(), merged["c2"].to_numpy()
            hr = float(np.polyfit(p2, p1, 1)[0])
            spread = p1 - hr * p2
            s = pl.Series(spread)
            zscore = ((s - s.rolling_mean(window_size=window)) / s.rolling_std(window_size=window)).to_numpy()

            results = transaction_cost_analysis(p1, p2, zscore)
            if not results:
                return dmc.Alert("Could not analyze transaction costs.", color="red")

            tk = tx_cost_takeaway(results)
            fig = _build_tx_cost_chart(results, asset1, asset2, timeframe)
            return html.Div([_takeaway(tk.text, tk.severity), dcc.Graph(figure=fig), _tx_cost_table(results)])
        except Exception as e:
            return dmc.Alert(f"Analysis failed: {e}", color="red")


# ─── Chart builders ──────────────────────────────────────────────────────────

def _build_rolling_coint_chart(results, asset1, asset2, timeframe, window):
    import polars as pl
    valid = results.filter(pl.col("p_value").is_not_null())
    fig = go.Figure()
    fig.add_hrect(y0=0, y1=0.05, fillcolor="rgba(81,207,102,0.08)", line_width=0)
    fig.add_hrect(y0=0.05, y1=1.0, fillcolor="rgba(255,107,107,0.05)", line_width=0)
    fig.add_trace(go.Scatter(
        x=valid["timestamp"].to_list(), y=valid["p_value"].to_list(),
        mode="lines", name="p-value", line=dict(color="#339AF0", width=1.5),
    ))
    fig.add_hline(y=0.05, line_dash="dash", line_color="rgba(252,196,25,0.8)",
                  annotation_text="α = 0.05", annotation_position="top right")
    p_max = max(valid["p_value"].to_list()) if not valid.is_empty() else 0.2
    fig.update_layout(
        title=f"Rolling Cointegration: {asset1} / {asset2} ({timeframe}, window={window})",
        xaxis_title="Date", yaxis_title="p-value (Engle-Granger)",
        yaxis=dict(range=[0, max(0.2, min(1.0, p_max * 1.1))]),
        height=420, showlegend=False,
    )
    return fig


def _rolling_coint_stats(results):
    import polars as pl
    valid = results.filter(pl.col("p_value").is_not_null())
    if valid.is_empty():
        return html.Div()

    total = valid.height
    coint_count = valid.filter(pl.col("is_cointegrated") == True).height
    pct = coint_count / total * 100
    p_vals = valid["p_value"]
    is_coint = valid["is_cointegrated"].to_list()
    breakdowns = sum(1 for a, b in zip(is_coint[:-1], is_coint[1:]) if a and not b)

    rows = [
        ("Windows tested", str(total)),
        ("Cointegrated", f"{coint_count} / {total} ({pct:.0f}%)"),
        ("Breakdowns", str(breakdowns)),
        ("Median p-value", f"{p_vals.median():.4f}"),
        ("Min p-value", f"{p_vals.min():.4f}"),
        ("Max p-value", f"{p_vals.max():.4f}"),
    ]

    return dmc.Paper([
        dmc.Text("Summary Statistics", fw=600, size="sm", mb="xs"),
        dmc.Table([
            dmc.TableTbody([
                dmc.TableTr([dmc.TableTd(dmc.Text(k, c="dimmed", size="sm")), dmc.TableTd(dmc.Text(v, fw=600, size="sm"))])
                for k, v in rows
            ]),
        ], withColumnBorders=True),
    ], shadow="xs", p="md", radius="md", withBorder=True, mt="md")


def _build_oos_chart(results, asset1, asset2, timeframe):
    from plotly.subplots import make_subplots
    fig = make_subplots(rows=1, cols=2, subplot_titles=["p-values by Split", "ADF Statistics by Split"])
    splits = [f"{r.split_ratio:.0%}" for r in results]
    fig.add_trace(go.Bar(x=splits, y=[r.formation_p_value for r in results], name="Formation", marker_color="#339AF0"), row=1, col=1)
    fig.add_trace(go.Bar(x=splits, y=[r.trading_p_value for r in results], name="Trading (OOS)", marker_color="#FF6B6B"), row=1, col=1)
    fig.add_hline(y=0.05, line_dash="dash", line_color="rgba(252,196,25,0.8)", annotation_text="α=0.05", row=1, col=1)
    fig.add_trace(go.Bar(x=splits, y=[r.formation_adf_stat for r in results], name="Formation ADF", marker_color="#339AF0", showlegend=False), row=1, col=2)
    fig.add_trace(go.Bar(x=splits, y=[r.trading_adf_stat for r in results], name="Trading ADF", marker_color="#FF6B6B", showlegend=False), row=1, col=2)
    fig.update_layout(title=f"Out-of-Sample Validation: {asset1} / {asset2} ({timeframe})", height=400, barmode="group")
    return fig


def _oos_table(results):
    rows = [
        dmc.TableTr([
            dmc.TableTd(f"{r.split_ratio:.0%} / {1-r.split_ratio:.0%}"),
            dmc.TableTd(str(r.formation_n)),
            dmc.TableTd(str(r.trading_n)),
            dmc.TableTd(f"{'✅' if r.formation_cointegrated else '❌'} p={r.formation_p_value:.4f}"),
            dmc.TableTd(f"{'✅' if r.trading_cointegrated else '❌'} p={r.trading_p_value:.4f}"),
        ]) for r in results
    ]
    return dmc.Paper([
        dmc.Text("Split Results", fw=600, size="sm", mb="xs"),
        dmc.Table([
            dmc.TableThead(dmc.TableTr([dmc.TableTh(h) for h in ["Split", "Form. N", "Trade N", "Formation", "Trading (OOS)"]])),
            dmc.TableTbody(rows),
        ], striped=True, withTableBorder=True, withColumnBorders=True),
    ], shadow="xs", p="md", radius="md", withBorder=True, mt="md")


def _build_spread_methods_chart(results, asset1, asset2, timeframe, merged):
    from plotly.subplots import make_subplots
    fig = make_subplots(rows=2, cols=2, subplot_titles=["Spreads Over Time", "Spread Distributions", "ADF Statistics", "Spread Properties"])
    colors = ["#339AF0", "#51CF66", "#FF922B"]
    timestamps = merged["datetime"].to_list()

    for i, r in enumerate(results):
        c = colors[i % len(colors)]
        spread_norm = (r.spread - np.mean(r.spread)) / np.std(r.spread) if np.std(r.spread) > 0 else r.spread
        fig.add_trace(go.Scatter(x=timestamps, y=spread_norm, name=r.method, mode="lines", line=dict(color=c, width=1)), row=1, col=1)
        fig.add_trace(go.Histogram(x=r.spread, name=r.method, nbinsx=50, marker_color=c, opacity=0.5, showlegend=False), row=1, col=2)

    fig.add_trace(go.Bar(
        x=[r.method for r in results], y=[r.adf_statistic for r in results],
        marker_color=["#51CF66" if r.is_stationary else "#FF6B6B" for r in results], showlegend=False,
    ), row=2, col=1)
    fig.update_layout(title=f"Spread Construction: {asset1} / {asset2} ({timeframe})", height=600, barmode="group")
    return fig


def _spread_methods_table(results):
    rows = [
        dmc.TableTr([
            dmc.TableTd(r.method),
            dmc.TableTd("✅" if r.is_stationary else "❌"),
            dmc.TableTd(f"{r.adf_statistic:.4f}"),
            dmc.TableTd(f"{r.adf_p_value:.6f}"),
            dmc.TableTd(f"{r.spread_std:.6f}"),
        ]) for r in results
    ]
    return dmc.Paper([
        dmc.Text("Method Comparison", fw=600, size="sm", mb="xs"),
        dmc.Table([
            dmc.TableThead(dmc.TableTr([dmc.TableTh(h) for h in ["Method", "Stationary?", "ADF Stat", "ADF p-value", "Std Dev"]])),
            dmc.TableTbody(rows),
        ], striped=True, withTableBorder=True, withColumnBorders=True),
    ], shadow="xs", p="md", radius="md", withBorder=True, mt="md")


def _build_coint_methods_chart(results, asset1, asset2, timeframe):
    methods = [r.method for r in results]
    colors = ["#51CF66" if r.is_cointegrated else "#FF6B6B" for r in results]
    fig = go.Figure()
    fig.add_trace(go.Bar(
        x=methods, y=[abs(r.statistic) for r in results], marker_color=colors,
        text=["✅ Coint." if r.is_cointegrated else "❌ Not coint." for r in results], textposition="outside",
    ))
    for i, r in enumerate(results):
        if r.critical_value is not None:
            fig.add_shape(type="line", x0=i-0.4, x1=i+0.4, y0=r.critical_value, y1=r.critical_value,
                          line=dict(color="#FCC419", width=2, dash="dash"))
    fig.update_layout(title=f"Cointegration Tests: {asset1} / {asset2} ({timeframe})",
                      xaxis_title="Test Method", yaxis_title="|Test Statistic|", height=400, showlegend=False)
    return fig


def _coint_methods_table(results):
    rows = [dmc.TableTr([dmc.TableTd(r.method), dmc.TableTd("✅" if r.is_cointegrated else "❌"), dmc.TableTd(r.detail)]) for r in results]
    return dmc.Paper([
        dmc.Text("Test Results", fw=600, size="sm", mb="xs"),
        dmc.Table([
            dmc.TableThead(dmc.TableTr([dmc.TableTh(h) for h in ["Method", "Cointegrated?", "Detail"]])),
            dmc.TableTbody(rows),
        ], striped=True, withTableBorder=True, withColumnBorders=True),
    ], shadow="xs", p="md", radius="md", withBorder=True, mt="md")


def _build_timeframe_chart(results, asset1, asset2):
    from plotly.subplots import make_subplots
    valid = [r for r in results if r.p_value is not None]
    tfs = [r.timeframe for r in valid]
    fig = make_subplots(rows=1, cols=3, subplot_titles=["p-value", "Half-life (periods)", "Data Points"])
    fig.add_trace(go.Bar(x=tfs, y=[r.p_value for r in valid],
                         marker_color=["#51CF66" if r.is_cointegrated else "#FF6B6B" for r in valid], showlegend=False), row=1, col=1)
    fig.add_hline(y=0.05, line_dash="dash", line_color="rgba(252,196,25,0.8)", row=1, col=1)
    fig.add_trace(go.Bar(x=tfs, y=[r.half_life or 0 for r in valid], marker_color="#339AF0", showlegend=False), row=1, col=2)
    fig.add_trace(go.Bar(x=tfs, y=[r.n_datapoints for r in valid], marker_color="#FF922B", showlegend=False), row=1, col=3)
    fig.update_layout(title=f"Timeframe Comparison: {asset1} / {asset2}", height=380)
    return fig


def _timeframe_table(results):
    rows = [dmc.TableTr([
        dmc.TableTd(r.timeframe), dmc.TableTd(str(r.n_datapoints)),
        dmc.TableTd("✅" if r.is_cointegrated else "❌"),
        dmc.TableTd(f"{r.p_value:.4f}" if r.p_value else "—"),
        dmc.TableTd(f"{r.half_life:.1f}" if r.half_life else "—"),
    ]) for r in results]
    return dmc.Paper([
        dmc.Text("Timeframe Results", fw=600, size="sm", mb="xs"),
        dmc.Table([
            dmc.TableThead(dmc.TableTr([dmc.TableTh(h) for h in ["TF", "Points", "Coint?", "p-value", "Half-life"]])),
            dmc.TableTbody(rows),
        ], striped=True, withTableBorder=True, withColumnBorders=True),
    ], shadow="xs", p="md", radius="md", withBorder=True, mt="md")


def _build_threshold_chart(results, asset1, asset2, timeframe, window):
    from plotly.subplots import make_subplots
    entries = sorted(set(r.entry for r in results))
    exits = sorted(set(r.exit for r in results))
    trade_matrix = [[next((r.total_trades for r in results if r.entry == e and r.exit == x), 0) for e in entries] for x in exits]
    duration_matrix = [[next((r.avg_duration or 0 for r in results if r.entry == e and r.exit == x), 0) for e in entries] for x in exits]

    fig = make_subplots(rows=1, cols=2, subplot_titles=["Trade Count", "Avg Duration (periods)"])
    fig.add_trace(go.Heatmap(x=[str(e) for e in entries], y=[str(e) for e in exits], z=trade_matrix, colorscale="Viridis"), row=1, col=1)
    fig.add_trace(go.Heatmap(x=[str(e) for e in entries], y=[str(e) for e in exits], z=duration_matrix, colorscale="Plasma"), row=1, col=2)
    fig.update_xaxes(title_text="Entry Threshold (±σ)")
    fig.update_yaxes(title_text="Exit Threshold (±σ)", row=1, col=1)
    fig.update_layout(title=f"Z-score Thresholds: {asset1} / {asset2} ({timeframe}, window={window})", height=400)
    return fig


def _build_lookback_chart(results, asset1, asset2, timeframe):
    from plotly.subplots import make_subplots
    ws = [r.window for r in results]
    fig = make_subplots(rows=2, cols=2, subplot_titles=["±2σ Crossings", "Autocorrelation", "Skewness", "Kurtosis"])
    fig.add_trace(go.Scatter(x=ws, y=[r.crossings_2 for r in results], mode="lines+markers"), row=1, col=1)
    fig.add_trace(go.Scatter(x=ws, y=[r.autocorrelation for r in results], mode="lines+markers"), row=1, col=2)
    fig.add_trace(go.Scatter(x=ws, y=[r.skewness for r in results], mode="lines+markers"), row=2, col=1)
    fig.add_trace(go.Scatter(x=ws, y=[r.kurtosis for r in results], mode="lines+markers"), row=2, col=2)
    fig.add_hline(y=0, line_dash="dot", line_color="gray", row=2, col=1)
    fig.add_hline(y=0, line_dash="dot", line_color="gray", row=2, col=2)
    fig.update_layout(title=f"Lookback Window: {asset1} / {asset2} ({timeframe})", height=500, showlegend=False)
    return fig


def _lookback_table(results):
    rows = [dmc.TableTr([
        dmc.TableTd(str(r.window)), dmc.TableTd(str(r.crossings_2)),
        dmc.TableTd(f"{r.autocorrelation:.3f}"), dmc.TableTd(f"{r.skewness:.3f}"),
        dmc.TableTd(f"{r.kurtosis:.3f}"), dmc.TableTd(f"{r.zscore_std:.3f}"),
    ]) for r in results]
    return dmc.Paper([
        dmc.Text("Window Comparison", fw=600, size="sm", mb="xs"),
        dmc.Table([
            dmc.TableThead(dmc.TableTr([dmc.TableTh(h) for h in ["Window", "±2σ Cross.", "Autocorr", "Skew", "Kurt", "Z Std"]])),
            dmc.TableTbody(rows),
        ], striped=True, withTableBorder=True, withColumnBorders=True),
    ], shadow="xs", p="md", radius="md", withBorder=True, mt="md")


def _build_tx_cost_chart(results, asset1, asset2, timeframe):
    from plotly.subplots import make_subplots
    fees = [r.fee_pct for r in results]
    profitable_pct = [r.net_profitable_pct for r in results]

    fig = make_subplots(rows=1, cols=2, subplot_titles=["Profitable Trades vs Fee Level", "Fee Breakeven"])
    colors = ["#51CF66" if p >= 70 else "#FF922B" if p >= 40 else "#FF6B6B" for p in profitable_pct]
    fig.add_trace(go.Bar(x=[f"{f:.2f}%" for f in fees], y=profitable_pct, marker_color=colors, name="Profitable %"), row=1, col=1)

    avg_spread = results[0].avg_spread_pct if results else 0
    fig.add_trace(go.Scatter(
        x=[f"{f:.2f}%" for f in fees], y=[r.round_trip_pct for r in results],
        mode="lines+markers", name="Total Fees (4 legs)", line=dict(color="#FF6B6B", width=2),
    ), row=1, col=2)
    fig.add_hline(y=avg_spread, line_dash="dash", line_color="#51CF66",
                  annotation_text=f"Avg spread ({avg_spread:.2f}%)", row=1, col=2)
    fig.update_layout(title=f"Transaction Costs: {asset1} / {asset2} ({timeframe})", height=400, showlegend=True)
    return fig


def _tx_cost_table(results):
    rows = [dmc.TableTr([
        dmc.TableTd(f"{r.fee_pct:.2f}%"), dmc.TableTd(f"{r.round_trip_pct:.2f}%"),
        dmc.TableTd(str(r.total_trades)), dmc.TableTd(str(r.profitable_trades)),
        dmc.TableTd(f"{r.net_profitable_pct:.1f}%"), dmc.TableTd(f"{r.avg_spread_pct:.3f}%"),
    ]) for r in results]
    return dmc.Paper([
        dmc.Text("Fee Level Comparison", fw=600, size="sm", mb="xs"),
        dmc.Table([
            dmc.TableThead(dmc.TableTr([dmc.TableTh(h) for h in ["Fee (1-way)", "Total (4-leg)", "Trades", "Profitable", "Win Rate", "Avg Spread"]])),
            dmc.TableTbody(rows),
        ], striped=True, withTableBorder=True, withColumnBorders=True),
    ], shadow="xs", p="md", radius="md", withBorder=True, mt="md")
