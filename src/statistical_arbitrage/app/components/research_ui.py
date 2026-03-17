"""
Shared UI components for research modules.

Every research module uses the same layout pattern:
  module_layout → control_bar + results_area + takeaway_banner

This keeps the research hub consistent and makes adding new modules trivial.
"""

import dash_bootstrap_components as dbc
from dash import dcc, html


# ─── Takeaway banner ─────────────────────────────────────────────────────────

SEVERITY_COLORS = {
    "green": "success",
    "yellow": "warning",
    "red": "danger",
}


def takeaway_banner(text: str, severity: str = "green") -> dbc.Alert:
    """
    Colored one-line takeaway banner.

    Args:
        text: Takeaway text (auto-generated from analysis results).
        severity: "green", "yellow", or "red".
    """
    color = SEVERITY_COLORS.get(severity, "info")
    return dbc.Alert(
        text,
        color=color,
        className="mb-3 fw-semibold",
    )


# ─── Control bar ─────────────────────────────────────────────────────────────


def pair_control_bar(
    prefix: str,
    pair_options: list[dict] | None = None,
    extra_controls: list | None = None,
    show_timeframe: bool = False,
    show_window: bool = False,
    window_default: int = 90,
    window_min: int = 30,
    window_max: int = 500,
) -> dbc.Card:
    """
    Standard control bar for research modules.

    Args:
        prefix: Unique prefix for component IDs (e.g., "rolling-coint").
        pair_options: Pre-populated pair options for dropdowns.
        extra_controls: Additional dbc.Col elements to include.
        show_timeframe: Include timeframe selector.
        show_window: Include window size input.
        window_default: Default window size value.
        window_min: Minimum window size.
        window_max: Maximum window size.
    """
    options = pair_options or []

    controls = [
        dbc.Col([
            dbc.Label("Asset 1", className="small fw-bold"),
            dcc.Dropdown(
                id=f"{prefix}-asset1",
                options=options,
                placeholder="Select asset...",
                className="mb-0",
            ),
        ], md=3),
        dbc.Col([
            dbc.Label("Asset 2", className="small fw-bold"),
            dcc.Dropdown(
                id=f"{prefix}-asset2",
                options=options,
                placeholder="Select asset...",
                className="mb-0",
            ),
        ], md=3),
    ]

    if show_timeframe:
        controls.append(
            dbc.Col([
                dbc.Label("Timeframe", className="small fw-bold"),
                dcc.Dropdown(
                    id=f"{prefix}-timeframe",
                    options=[
                        {"label": "15 min", "value": "15m"},
                        {"label": "1 hour", "value": "1h"},
                        {"label": "4 hours", "value": "4h"},
                        {"label": "1 day", "value": "1d"},
                    ],
                    value="1h",
                    clearable=False,
                ),
            ], md=2),
        )

    if show_window:
        controls.append(
            dbc.Col([
                dbc.Label("Window size", className="small fw-bold"),
                dbc.Input(
                    id=f"{prefix}-window",
                    type="number",
                    value=window_default,
                    min=window_min,
                    max=window_max,
                    step=1,
                ),
            ], md=2),
        )

    if extra_controls:
        controls.extend(extra_controls)

    controls.append(
        dbc.Col([
            dbc.Label("\u00a0", className="small"),  # spacer to align button
            dbc.Button(
                [html.I(className="fa-solid fa-play me-2"), "Run"],
                id=f"{prefix}-run",
                color="primary",
                className="w-100",
            ),
        ], md=2),
    )

    return dbc.Card(
        dbc.CardBody(dbc.Row(controls, className="align-items-end")),
        className="mb-3",
    )


# ─── Module layout ───────────────────────────────────────────────────────────


def module_layout(
    module_id: str,
    title: str,
    description: str,
    controls: dbc.Card,
    results_id: str | None = None,
) -> html.Div:
    """
    Standard layout wrapper for a research module.

    Args:
        module_id: Unique module identifier.
        title: Module title (e.g., "Rolling Cointegration Stability").
        description: One-line description of what this module tests.
        controls: Control bar component (from pair_control_bar).
        results_id: ID for results container. Defaults to "{module_id}-results".
    """
    rid = results_id or f"{module_id}-results"

    return html.Div([
        html.H4(title, className="mb-1"),
        html.P(description, className="text-muted mb-3"),
        controls,
        dcc.Loading(
            html.Div(id=rid),
            type="dot",
            color="#375a7f",  # DARKLY primary
        ),
    ], id=f"{module_id}-module")


# ─── Placeholder for unbuilt modules ─────────────────────────────────────────


def coming_soon_module(title: str, description: str) -> html.Div:
    """Placeholder for modules not yet implemented."""
    return html.Div([
        html.H4(title, className="mb-1"),
        html.P(description, className="text-muted mb-3"),
        dbc.Card(
            dbc.CardBody([
                html.Div([
                    html.I(className="fa-solid fa-flask-vial me-2", style={"fontSize": "2rem"}),
                    html.H5("Coming Soon", className="mt-2 mb-1"),
                    html.P("This research module is under development.", className="text-muted small"),
                ], className="text-center py-4"),
            ]),
            className="mb-3",
        ),
    ])
