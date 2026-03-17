"""
Main app layout — DMC AppShell with sidebar navigation.

Uses Dash Mantine Components for a modern, cohesive dark-theme design.
Sidebar provides navigation hierarchy. Header holds the app title and
global pair selector (wired in M002/S02).
"""

import dash_mantine_components as dmc
from dash import dcc, html
from dash_iconify import DashIconify
import plotly.io as pio


# ─── Icons ───────────────────────────────────────────────────────────────────

def _icon(name: str, size: int = 18) -> DashIconify:
    """Create a Dash Iconify icon."""
    return DashIconify(icon=name, width=size, height=size)


# ─── Research module definitions ─────────────────────────────────────────────

RESEARCH_MODULES = [
    {"id": "rolling-coint", "label": "Rolling Stability", "icon": "tabler:refresh", "path": "/research/rolling-coint"},
    {"id": "oos-validation", "label": "Out-of-Sample", "icon": "tabler:cut", "path": "/research/oos-validation"},
    {"id": "timeframe", "label": "Timeframe", "icon": "tabler:clock", "path": "/research/timeframe"},
    {"id": "spread-construction", "label": "Spread Method", "icon": "tabler:chart-line", "path": "/research/spread-construction"},
    {"id": "zscore-threshold", "label": "Z-score Threshold", "icon": "tabler:adjustments", "path": "/research/zscore-threshold"},
    {"id": "lookback-window", "label": "Lookback Window", "icon": "tabler:chart-area-line", "path": "/research/lookback-window"},
    {"id": "tx-cost", "label": "Transaction Costs", "icon": "tabler:coin", "path": "/research/tx-cost"},
    {"id": "coint-method", "label": "Coint. Method", "icon": "tabler:flask", "path": "/research/coint-method"},
]


# ─── Plotly theme ────────────────────────────────────────────────────────────

MANTINE_PLOTLY_TEMPLATE = {
    "layout": {
        "paper_bgcolor": "rgba(0,0,0,0)",
        "plot_bgcolor": "rgba(26, 27, 30, 1)",  # Mantine dark[7]
        "font": {
            "color": "#C1C2C5",
            "family": "-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
        },
        "title": {"font": {"color": "#C1C2C5", "size": 15}},
        "xaxis": {
            "gridcolor": "rgba(55, 58, 64, 0.8)",
            "zerolinecolor": "rgba(55, 58, 64, 0.8)",
            "title": {"font": {"color": "#909296"}},
            "tickfont": {"color": "#909296"},
        },
        "yaxis": {
            "gridcolor": "rgba(55, 58, 64, 0.8)",
            "zerolinecolor": "rgba(55, 58, 64, 0.8)",
            "title": {"font": {"color": "#909296"}},
            "tickfont": {"color": "#909296"},
        },
        "legend": {"font": {"color": "#C1C2C5"}},
        "colorway": [
            "#339AF0",  # blue[5]
            "#51CF66",  # green[5]
            "#FF6B6B",  # red[5]
            "#FCC419",  # yellow[5]
            "#CC5DE8",  # violet[5]
            "#20C997",  # teal[5]
            "#FF922B",  # orange[5]
            "#845EF7",  # grape[5]
        ],
        "margin": {"t": 48, "b": 40, "l": 56, "r": 24},
    }
}

# Register as a named template and set as default
pio.templates["mantine_dark"] = MANTINE_PLOTLY_TEMPLATE
pio.templates.default = "mantine_dark"


# ─── Sidebar ─────────────────────────────────────────────────────────────────

def _sidebar() -> dmc.AppShellNavbar:
    """Build the sidebar navigation."""
    research_children = [
        dmc.NavLink(
            label=m["label"],
            href=m["path"],
            leftSection=_icon(m["icon"], 16),
            active="exact",
            variant="light",
            py=6,
            styles={"label": {"fontSize": "13px"}},
        )
        for m in RESEARCH_MODULES
    ]

    return dmc.AppShellNavbar(
        children=dmc.Stack(
            gap=0,
            children=[
                # Main navigation
                dmc.NavLink(
                    label="Pair Scanner",
                    href="/scanner",
                    leftSection=_icon("tabler:search", 20),
                    active="exact",
                    variant="light",
                    py=10,
                ),
                dmc.NavLink(
                    label="Pair Deep Dive",
                    href="/deep-dive",
                    leftSection=_icon("tabler:microscope", 20),
                    active="exact",
                    variant="light",
                    py=10,
                ),

                dmc.Divider(my=12),

                # Research Hub with expandable sub-links
                dmc.NavLink(
                    label="Research Hub",
                    leftSection=_icon("tabler:flask-2", 20),
                    childrenOffset=20,
                    href="/research",
                    active="partial",
                    variant="light",
                    opened=True,
                    py=10,
                    children=research_children,
                ),

                dmc.Divider(my=12),

                # Learn section
                dmc.NavLink(
                    label="Learn",
                    href="/learn",
                    leftSection=_icon("tabler:school", 20),
                    active="exact",
                    variant="light",
                    py=10,
                    description="Step-by-step guide",
                ),
                dmc.NavLink(
                    label="Glossary",
                    href="/glossary",
                    leftSection=_icon("tabler:vocabulary", 20),
                    active="exact",
                    variant="light",
                    py=10,
                    description="Stat arb terms",
                ),

                # Spacer
                dmc.Box(style={"flex": "1"}),

                # Version at bottom
                dmc.Divider(my=8),
                dmc.Text(
                    "StatArb Research v0.1",
                    size="xs",
                    c="dimmed",
                    ta="center",
                    py=8,
                ),
            ],
            style={"height": "100%"},
        ),
        p="sm",
    )


# ─── Header ─────────────────────────────────────────────────────────────────

def _header() -> dmc.AppShellHeader:
    """Build the header with app title and global pair selector placeholder."""
    return dmc.AppShellHeader(
        children=dmc.Group(
            children=[
                # Logo / title
                dmc.Group(
                    children=[
                        dmc.ThemeIcon(
                            _icon("tabler:chart-candle", 22),
                            variant="gradient",
                            gradient={"from": "blue", "to": "cyan", "deg": 45},
                            size="lg",
                            radius="md",
                        ),
                        dmc.Text(
                            "StatArb Research",
                            fw=700,
                            size="lg",
                            style={"letterSpacing": "-0.3px"},
                        ),
                    ],
                    gap="xs",
                ),

                # Global pair selector — placeholder, wired in S02
                dmc.Group(
                    id="global-pair-bar",
                    children=[
                        dmc.Select(
                            id="global-asset1",
                            placeholder="Asset 1",
                            searchable=True,
                            w=160,
                            size="sm",
                            leftSection=_icon("tabler:coin", 16),
                        ),
                        dmc.Text("×", c="dimmed", size="lg"),
                        dmc.Select(
                            id="global-asset2",
                            placeholder="Asset 2",
                            searchable=True,
                            w=160,
                            size="sm",
                            leftSection=_icon("tabler:coin", 16),
                        ),
                        dmc.Select(
                            id="global-timeframe",
                            placeholder="Timeframe",
                            data=[
                                {"label": "15m", "value": "15m"},
                                {"label": "1h", "value": "1h"},
                                {"label": "4h", "value": "4h"},
                                {"label": "1d", "value": "1d"},
                            ],
                            value="1h",
                            w=100,
                            size="sm",
                            leftSection=_icon("tabler:clock", 16),
                        ),
                    ],
                    gap="xs",
                ),
            ],
            justify="space-between",
            h="100%",
            px="md",
        ),
    )


# ─── Main layout ────────────────────────────────────────────────────────────

def create_layout() -> dmc.MantineProvider:
    """Create the main app layout with DMC AppShell."""
    return dmc.MantineProvider(
        forceColorScheme="dark",
        theme={
            "primaryColor": "blue",
            "fontFamily": "-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
            "headings": {
                "fontFamily": "-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
            },
        },
        children=[
            dmc.AppShell(
                children=[
                    _header(),
                    _sidebar(),
                    dmc.AppShellMain(
                        children=[
                            # URL routing
                            dcc.Location(id="url", refresh=False),
                            # Page content
                            html.Div(id="page-content"),
                        ],
                    ),
                ],
                header={"height": 60},
                navbar={"width": 240, "breakpoint": 0},
                padding="lg",
            ),

            # Global stores
            dcc.Store(id="global-pair-store", storage_type="session"),
            dcc.Store(id="cached-pairs-store", storage_type="session"),
        ],
    )
