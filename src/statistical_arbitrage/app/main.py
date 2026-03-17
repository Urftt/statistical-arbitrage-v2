"""
Main Dash application entry point.

Run with:
    python -m statistical_arbitrage.app.main
    # or
    python run_dashboard.py
"""

from dash import Dash, Input, Output, State, callback, clientside_callback, dcc, html, no_update

from statistical_arbitrage.app.layout import create_layout
from statistical_arbitrage.app.pages import pair_scanner, pair_deep_dive, research_hub, learn, glossary
from statistical_arbitrage.data.cache_manager import get_cache_manager

# Initialize Dash app — DMC handles its own stylesheets via MantineProvider
app = Dash(
    __name__,
    suppress_callback_exceptions=True,
    title="StatArb Research",
    use_pages=False,
)

# Set layout
app.layout = create_layout()


# ─── Populate global pair selector ───────────────────────────────────────────

@callback(
    Output("global-asset1", "data"),
    Output("global-asset2", "data"),
    Input("url", "pathname"),  # Trigger on app load (any page)
)
def populate_global_pairs(_pathname):
    """Populate the global pair selector dropdowns with cached pairs."""
    try:
        cache = get_cache_manager()
        pairs_df = cache.get_available_pairs()
        symbols = sorted(pairs_df["symbol"].to_list())
        options = [{"label": s, "value": s} for s in symbols]
        return options, options
    except Exception:
        return [], []


# ─── Global pair store sync ──────────────────────────────────────────────────

@callback(
    Output("global-pair-store", "data"),
    Input("global-asset1", "value"),
    Input("global-asset2", "value"),
    Input("global-timeframe", "value"),
)
def sync_global_pair_store(asset1, asset2, timeframe):
    """Keep global pair store in sync with header selects."""
    return {
        "asset1": asset1,
        "asset2": asset2,
        "timeframe": timeframe or "1h",
    }


# ─── Page routing ────────────────────────────────────────────────────────────

@callback(
    Output("url", "pathname"),
    Output("page-content", "children"),
    Input("url", "pathname"),
)
def display_page(pathname: str):
    """Route to the correct page based on URL path."""
    if pathname == "/" or pathname is None:
        return "/scanner", pair_scanner.layout()
    elif pathname == "/scanner":
        return no_update, pair_scanner.layout()
    elif pathname == "/deep-dive":
        return no_update, pair_deep_dive.layout()
    elif pathname and pathname.startswith("/research"):
        return no_update, research_hub.layout(pathname)
    elif pathname == "/learn":
        return no_update, learn.layout()
    elif pathname == "/glossary":
        return no_update, glossary.layout()
    else:
        return no_update, pair_scanner.layout()


# Register page callbacks
pair_scanner.register_callbacks(app)
pair_deep_dive.register_callbacks(app)
research_hub.register_callbacks(app)
learn.register_callbacks(app)
glossary.register_callbacks(app)


def run():
    """Run the Dash development server."""
    app.run(debug=True, port=8050)


if __name__ == "__main__":
    run()
