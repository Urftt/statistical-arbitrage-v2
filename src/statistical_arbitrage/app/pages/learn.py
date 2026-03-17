"""
Teaching Flow — Step-by-step stat arb learning page.

6-step guided learning path using DMC Stepper with free navigation.
Each step teaches one concept through interactive charts first,
with layered educational content (analogy → formula → pair-specific).
"""

import dash_mantine_components as dmc
import numpy as np
import plotly.graph_objects as go
from dash import Input, Output, State, callback, dcc, html, no_update
from dash_iconify import DashIconify

from statistical_arbitrage.analysis.cointegration import PairAnalysis
from statistical_arbitrage.data.cache_manager import get_cache_manager


# ─── Constants ───────────────────────────────────────────────────────────────

TEACHING_STEPS = [
    {
        "label": "Select Your Pair",
        "description": "Choose two assets to analyze",
        "icon": "tabler:coin",
    },
    {
        "label": "Price Comparison",
        "description": "Do these assets move together?",
        "icon": "tabler:chart-line",
    },
    {
        "label": "Correlation vs Cointegration",
        "description": "Why correlation isn't enough",
        "icon": "tabler:arrows-shuffle",
    },
    {
        "label": "Cointegration Test",
        "description": "Proving the statistical link",
        "icon": "tabler:flask",
    },
    {
        "label": "The Spread",
        "description": "Building the trading signal",
        "icon": "tabler:chart-area-line",
    },
    {
        "label": "Z-Score & Signals",
        "description": "When to trade",
        "icon": "tabler:adjustments",
    },
]


def _icon(name: str, size: int = 16) -> DashIconify:
    return DashIconify(icon=name, width=size, height=size)


def _glossary_link(term: str, display_text: str | None = None) -> html.A:
    """Create a link to a glossary term."""
    slug = term.lower().replace(" ", "-").replace("/", "-")
    return html.A(
        display_text or term,
        href=f"/glossary#glossary-{slug}",
        style={"color": "#4dabf7", "textDecoration": "underline", "fontWeight": 500},
    )


# ─── Educational panel component ────────────────────────────────────────────

def _educational_panel(
    analogy: str | dmc.Text | html.Div,
    mechanics: str | dmc.Text | html.Div,
    pair_specific: str | dmc.Text | html.Div,
    step_id: str = "",
) -> dmc.Accordion:
    """
    Reusable 3-layer educational panel.

    Each step provides content at three depths:
    - 💡 Intuition: analogy or everyday explanation
    - 🔧 How It Works: formula, mechanics, the actual math
    - 📊 Your Pair: what the numbers mean for the selected pair

    Returns a DMC Accordion with multiple=True so users can expand all.
    """
    def _wrap(content):
        if isinstance(content, str):
            return dmc.Text(content, size="sm")
        return content

    props: dict = dict(
        multiple=True,
        variant="separated",
        radius="md",
        value=["intuition"],  # Open "Intuition" by default
    )
    if step_id:
        props["id"] = f"learn-edu-{step_id}"

    return dmc.Accordion(
        **props,
        children=[
            dmc.AccordionItem(
                value="intuition",
                children=[
                    dmc.AccordionControl(
                        "💡 Intuition",
                        icon=_icon("tabler:bulb", 18),
                    ),
                    dmc.AccordionPanel(_wrap(analogy)),
                ],
            ),
            dmc.AccordionItem(
                value="mechanics",
                children=[
                    dmc.AccordionControl(
                        "🔧 How It Works",
                        icon=_icon("tabler:tool", 18),
                    ),
                    dmc.AccordionPanel(_wrap(mechanics)),
                ],
            ),
            dmc.AccordionItem(
                value="your-pair",
                children=[
                    dmc.AccordionControl(
                        "📊 Your Pair",
                        icon=_icon("tabler:chart-dots", 18),
                    ),
                    dmc.AccordionPanel(_wrap(pair_specific)),
                ],
            ),
        ],
    )


# ─── Step placeholder content ───────────────────────────────────────────────

STEP_PLACEHOLDERS = {
    1: {
        "analogy": (
            "Imagine two dogs on leashes held by the same person walking down the street. "
            "They wander around individually, but they can't get too far apart. "
            "That's what we're looking for — two asset prices that may wander but stay tethered."
        ),
        "mechanics": (
            "Price comparison normalizes both assets to a common base (100) so you can see "
            "how they move relative to each other, regardless of their actual price levels. "
            "We also compute the Pearson correlation coefficient."
        ),
        "pair_specific": "Select a pair above to see how your chosen assets move together.",
    },
    2: {
        "analogy": (
            "Correlation is like noticing two people often go to the same restaurant. "
            "Cointegration is knowing they always split the bill — there's an actual "
            "structural link keeping their tabs connected."
        ),
        "mechanics": (
            "Correlation measures whether returns move in the same direction. "
            "Cointegration tests whether a linear combination of the prices is stationary — "
            "meaning the gap between them always reverts to a mean."
        ),
        "pair_specific": "Select a pair to see whether your assets are merely correlated or truly cointegrated.",
    },
    3: {
        "analogy": (
            'Think of the cointegration test like a "leash test" — we\'re checking if '
            "the two prices are on an invisible leash. The test tells us how strong "
            "that leash is, and whether it's statistically significant."
        ),
        "mechanics": (
            "The Engle-Granger test regresses one asset's price on the other, then tests "
            "whether the residuals (the spread) are stationary using the ADF test. "
            "If the residuals are stationary, the pair is cointegrated."
        ),
        "pair_specific": "Select a pair to run the cointegration test and see the results explained.",
    },
    4: {
        "analogy": (
            "The spread is like measuring the length of the leash at every moment. "
            "When it stretches too far, you expect it to snap back. "
            "That snap-back is your trading opportunity."
        ),
        "mechanics": (
            "The spread = price₁ - (hedge_ratio × price₂). We overlay rolling mean "
            "and standard deviation bands to visualize how the spread oscillates. "
            "A stationary spread oscillates around a stable mean."
        ),
        "pair_specific": "Select a pair to see the spread and whether it looks mean-reverting.",
    },
    5: {
        "analogy": (
            "The z-score is like a thermostat reading — it tells you how far from "
            '"normal" the spread is right now. When it gets too hot (spread too wide), '
            "you trade expecting it to cool down."
        ),
        "mechanics": (
            "Z-score = (spread - rolling_mean) / rolling_std. Entry signals fire when "
            "the z-score crosses a threshold (e.g. ±2.0). Exit signals fire when it "
            "returns toward zero. Threshold sliders let you explore sensitivity."
        ),
        "pair_specific": "Select a pair to see z-scores, signals, and experiment with thresholds.",
    },
}


# ─── Step content renderers ─────────────────────────────────────────────────

def _step_placeholder(step_index: int) -> dmc.Paper:
    """Render placeholder content for a step (steps 2-6 before real content is built)."""
    step = TEACHING_STEPS[step_index]
    placeholder = STEP_PLACEHOLDERS.get(step_index)

    children = [
        dmc.Group([
            dmc.ThemeIcon(
                _icon(step["icon"], 24),
                variant="light",
                size="xl",
                radius="md",
                color="blue",
            ),
            dmc.Stack([
                dmc.Title(step["label"], order=3),
                dmc.Text(step["description"], c="dimmed", size="sm"),
            ], gap=2),
        ], gap="md"),
        dmc.Divider(my="md"),
    ]

    if placeholder:
        children.append(
            dmc.Alert(
                "Charts and interactive content will be added in upcoming slices. "
                "The educational panels below preview the content pattern.",
                color="blue",
                variant="light",
                mb="md",
            )
        )
        children.append(
            _educational_panel(
                analogy=placeholder["analogy"],
                mechanics=placeholder["mechanics"],
                pair_specific=placeholder["pair_specific"],
                step_id=f"placeholder-{step_index}",
            )
        )
    else:
        children.append(
            dmc.Text(
                "This step will be built in an upcoming slice.",
                c="dimmed",
                fs="italic",
                ta="center",
                py="xl",
            )
        )

    return dmc.Paper(
        children=children,
        shadow="sm",
        p="xl",
        radius="md",
        withBorder=True,
    )


def _step_pair_selector() -> dmc.Paper:
    """Step 1: Intro with curated pair suggestions and timeframe guidance."""
    return dmc.Paper(
        children=[
            dmc.Group([
                dmc.ThemeIcon(
                    _icon("tabler:coin", 24),
                    variant="light",
                    size="xl",
                    radius="md",
                    color="blue",
                ),
                dmc.Stack([
                    dmc.Title("Select Your Pair", order=3),
                    dmc.Text("Choose two assets to analyze together", c="dimmed", size="sm"),
                ], gap=2),
            ], gap="md"),

            dmc.Divider(my="md"),

            # Intro text
            dmc.Text(
                "Statistical arbitrage finds pairs of assets whose prices are "
                "statistically linked — when they diverge, you trade the gap. "
                "This flow walks you through the full pipeline: from picking a pair "
                "to understanding when to trade.",
                size="sm",
                mb="md",
            ),

            # Curated pair suggestions
            dmc.Title("Suggested starting pairs", order=5, mb="xs"),
            dmc.Text(
                "Use the dropdowns above to select a pair, or try one of these:",
                size="sm", c="dimmed", mb="sm",
            ),
            dmc.SimpleGrid(
                cols=3,
                mb="lg",
                children=[
                    dmc.Paper([
                        dmc.Text("BTC/EUR × ETH/EUR", size="sm", fw=600),
                        dmc.Badge("Cointegrated", color="green", variant="light", size="sm"),
                        dmc.Text(
                            "The two largest crypto assets. Strongly correlated, "
                            "often cointegrated at 4h timeframe. A good first pair.",
                            size="xs", c="dimmed", mt=4,
                        ),
                    ], p="sm", radius="md", withBorder=True, bg="dark.7"),
                    dmc.Paper([
                        dmc.Text("SOL/EUR × AVAX/EUR", size="sm", fw=600),
                        dmc.Badge("Try it", color="blue", variant="light", size="sm"),
                        dmc.Text(
                            "Layer-1 competitors. Similar market dynamics "
                            "but less established relationship — may or may not be cointegrated.",
                            size="xs", c="dimmed", mt=4,
                        ),
                    ], p="sm", radius="md", withBorder=True, bg="dark.7"),
                    dmc.Paper([
                        dmc.Text("BTC/EUR × DOGE/EUR", size="sm", fw=600),
                        dmc.Badge("Likely fails", color="orange", variant="light", size="sm"),
                        dmc.Text(
                            "Very different assets — BTC is a store of value, DOGE is a meme coin. "
                            "Expect the cointegration test to fail. That's educational too!",
                            size="xs", c="dimmed", mt=4,
                        ),
                    ], p="sm", radius="md", withBorder=True, bg="dark.7"),
                ],
            ),

            # Timeframe guidance
            dmc.Title("Choosing a timeframe", order=5, mb="xs"),
            dmc.Text(
                "The timeframe controls the candle size of your price data. "
                "It affects how many data points you have and what kind of trading "
                "strategy would be practical:",
                size="sm", mb="sm",
            ),
            dmc.SimpleGrid(
                cols=4,
                mb="lg",
                children=[
                    dmc.Stack([
                        dmc.Badge("15m", color="blue", variant="outline", size="lg", fullWidth=True),
                        dmc.Text("Intraday scalping. Many data points, noisy signals.", size="xs", c="dimmed", ta="center"),
                    ], gap=4),
                    dmc.Stack([
                        dmc.Badge("1h", color="blue", variant="outline", size="lg", fullWidth=True),
                        dmc.Text("Short-term trading. Good balance of data and noise.", size="xs", c="dimmed", ta="center"),
                    ], gap=4),
                    dmc.Stack([
                        dmc.Badge("4h", color="blue", variant="filled", size="lg", fullWidth=True),
                        dmc.Text("Recommended start. Enough data for reliable stats, practical for swing trading.", size="xs", c="dimmed", ta="center"),
                    ], gap=4),
                    dmc.Stack([
                        dmc.Badge("1d", color="blue", variant="outline", size="lg", fullWidth=True),
                        dmc.Text("Position trading. Fewer data points, smoother signals.", size="xs", c="dimmed", ta="center"),
                    ], gap=4),
                ],
            ),

            # What you'll learn
            dmc.Title("What you'll learn", order=5, mb="sm"),
            dmc.List([
                dmc.ListItem("How to visually compare two asset prices"),
                dmc.ListItem("How to test whether prices are statistically linked (cointegration)"),
                dmc.ListItem("How to construct and analyze the spread between them"),
                dmc.ListItem("How to use z-scores to generate trading signals"),
            ], size="sm", spacing="xs"),
        ],
        shadow="sm",
        p="xl",
        radius="md",
        withBorder=True,
    )


# ─── Step 2: Price Comparison ───────────────────────────────────────────────

def _no_pair_selected_message() -> dmc.Alert:
    """Message shown when no pair is selected yet."""
    return dmc.Alert(
        "Select a pair using the dropdowns above to see this step's analysis.",
        color="blue",
        variant="light",
        icon=_icon("tabler:info-circle", 20),
    )


def _correlation_color(corr: float) -> str:
    """Return color name based on correlation strength."""
    abs_corr = abs(corr)
    if abs_corr >= 0.7:
        return "green"
    elif abs_corr >= 0.3:
        return "yellow"
    return "red"


def _correlation_label(corr: float) -> str:
    """Human-readable correlation strength."""
    abs_corr = abs(corr)
    if abs_corr >= 0.9:
        return "Very strong"
    elif abs_corr >= 0.7:
        return "Strong"
    elif abs_corr >= 0.5:
        return "Moderate"
    elif abs_corr >= 0.3:
        return "Weak"
    return "Very weak"


def _parse_timestamps(raw_timestamps: list[str]) -> list:
    """Convert timestamp strings (epoch ms) to datetime objects for Plotly."""
    from datetime import datetime, timezone
    return [
        datetime.fromtimestamp(int(t) / 1000, tz=timezone.utc)
        for t in raw_timestamps
    ]


def _build_normalized_price_chart(pair_data: dict) -> go.Figure:
    """Build normalized price comparison chart (base 100)."""
    prices1 = np.array(pair_data["prices1"])
    prices2 = np.array(pair_data["prices2"])
    timestamps = _parse_timestamps(pair_data["timestamps"])

    norm1 = (prices1 / prices1[0]) * 100
    norm2 = (prices2 / prices2[0]) * 100

    fig = go.Figure()
    fig.add_trace(go.Scatter(
        x=timestamps, y=norm1,
        name=pair_data["asset1"],
        line=dict(width=2),
    ))
    fig.add_trace(go.Scatter(
        x=timestamps, y=norm2,
        name=pair_data["asset2"],
        line=dict(width=2),
    ))
    fig.add_hline(y=100, line_dash="dot", line_color="rgba(255,255,255,0.2)")
    fig.update_layout(
        title=f"Normalized Prices: {pair_data['asset1']} vs {pair_data['asset2']}",
        xaxis_title="",
        yaxis_title="Normalized Price (Base = 100)",
        height=420,
        hovermode="x unified",
        legend=dict(orientation="h", yanchor="bottom", y=1.02),
    )
    return fig


def _build_raw_price_chart(pair_data: dict) -> go.Figure:
    """Build raw price chart with dual y-axes."""
    prices1 = np.array(pair_data["prices1"])
    prices2 = np.array(pair_data["prices2"])
    timestamps = _parse_timestamps(pair_data["timestamps"])

    fig = go.Figure()
    fig.add_trace(go.Scatter(
        x=timestamps, y=prices1,
        name=pair_data["asset1"],
        line=dict(width=2),
        yaxis="y1",
    ))
    fig.add_trace(go.Scatter(
        x=timestamps, y=prices2,
        name=pair_data["asset2"],
        line=dict(width=2),
        yaxis="y2",
    ))
    fig.update_layout(
        title=f"Actual Prices: {pair_data['asset1']} vs {pair_data['asset2']}",
        xaxis_title="",
        yaxis=dict(title=f"{pair_data['asset1']} (EUR)", side="left"),
        yaxis2=dict(title=f"{pair_data['asset2']} (EUR)", side="right", overlaying="y"),
        height=420,
        hovermode="x unified",
        legend=dict(orientation="h", yanchor="bottom", y=1.02),
    )
    return fig


def _step_price_comparison(pair_data: dict | None) -> dmc.Paper:
    """Step 2: Normalized price overlay with correlation."""
    step = TEACHING_STEPS[1]
    header = dmc.Group([
        dmc.ThemeIcon(
            _icon(step["icon"], 24),
            variant="light", size="xl", radius="md", color="blue",
        ),
        dmc.Stack([
            dmc.Title(step["label"], order=3),
            dmc.Text(step["description"], c="dimmed", size="sm"),
        ], gap=2),
    ], gap="md")

    if not pair_data:
        return dmc.Paper([
            header,
            dmc.Divider(my="md"),
            _no_pair_selected_message(),
        ], shadow="sm", p="xl", radius="md", withBorder=True)

    # Build both charts
    norm_fig = _build_normalized_price_chart(pair_data)
    raw_fig = _build_raw_price_chart(pair_data)
    corr = pair_data["correlation"]
    color = _correlation_color(corr)
    label = _correlation_label(corr)

    # Chart toggle
    chart_toggle = dmc.SegmentedControl(
        id="learn-price-toggle",
        data=[
            {"label": "Actual Prices", "value": "raw"},
            {"label": "Normalized (Base 100)", "value": "normalized"},
        ],
        value="raw",
        size="sm",
        mb="sm",
    )

    # Both charts — show/hide via callback
    charts = html.Div([
        html.Div(
            dcc.Graph(id="learn-raw-price-chart", figure=raw_fig, config={"displayModeBar": False}),
            id="learn-raw-chart-container",
        ),
        html.Div(
            dcc.Graph(id="learn-norm-price-chart", figure=norm_fig, config={"displayModeBar": False}),
            id="learn-norm-chart-container",
            style={"display": "none"},
        ),
    ])

    # Correlation with inline explanation
    corr_section = dmc.Stack([
        dmc.Group([
            dmc.Text("Pearson Correlation:", size="sm", fw=500),
            dmc.Badge(f"r = {corr:.3f}", color=color, variant="filled", size="lg"),
            dmc.Badge(label, color=color, variant="light", size="lg"),
        ], gap="sm"),
        dmc.Text(
            f"Correlation measures how closely two prices move in the same direction. "
            f"r = {corr:.3f} means these assets {'move very closely together' if corr > 0.9 else 'tend to move together' if corr > 0.7 else 'show some co-movement' if corr > 0.5 else 'move somewhat independently'}. "
            f"A value of 1.0 would mean perfect lock-step; 0.0 means no relationship at all.",
            size="sm", c="dimmed",
        ),
        dmc.Text(
            "⚠️ But correlation alone isn't enough for trading — prices can be correlated "
            "yet drift apart permanently. The next step tests whether the relationship is "
            "strong enough to mean-revert (cointegration).",
            size="sm", c="dimmed", fs="italic",
        ),
    ], gap="xs", mt="sm")

    # Educational panel
    panel = _educational_panel(
        analogy=(
            "Imagine two dogs on leashes held by the same walker. "
            "They wander individually — one sniffs a tree, the other chases a pigeon — "
            "but they can't get too far apart because the walker keeps them close. "
            "The actual price chart shows their raw positions; the normalized chart "
            "shows their movement relative to where they started, removing the scale difference."
        ),
        mechanics=dmc.Stack([
            dmc.Text(
                "The actual price chart uses two y-axes since assets trade at very different levels "
                "(e.g. BTC at €80k vs ETH at €2k). This shows real price levels but makes visual "
                "comparison hard.",
                size="sm",
            ),
            dmc.Text(
                "Normalization rebases both prices to 100 at the start of the period. "
                "Now you can directly compare percentage moves — if one line goes to 110 and the "
                "other to 108, they've gained 10% and 8% respectively.",
                size="sm",
            ),
            dmc.Text([
                "The Pearson ",
                _glossary_link("correlation"),
                " coefficient (r) measures linear co-movement:",
            ], size="sm"),
            dmc.Code(
                "r = cov(returns₁, returns₂) / (σ₁ × σ₂)",
                block=True,
            ),
            dmc.Text(
                "• r ≈ 1.0: always move together  •  r ≈ 0: no relationship  •  r ≈ -1.0: always move opposite",
                size="sm", c="dimmed",
            ),
        ], gap="xs"),
        pair_specific=dmc.Stack([
            dmc.Text(
                f"{pair_data['asset1']} and {pair_data['asset2']} have a "
                f"correlation of r = {corr:.3f} ({label.lower()}). "
                f"{'They track each other closely — a promising start for pairs trading.' if corr > 0.8 else ''}"
                f"{'They show some co-movement but the link is looser.' if 0.5 < corr <= 0.8 else ''}"
                f"{'The correlation is weak, but cointegration can still exist with weak correlation.' if corr <= 0.5 else ''}",
                size="sm",
            ),
        ], gap="xs"),
        step_id="price-comparison",
    )

    return dmc.Paper([
        header,
        dmc.Divider(my="md"),
        chart_toggle,
        charts,
        corr_section,
        dmc.Space(h="md"),
        panel,
    ], shadow="sm", p="xl", radius="md", withBorder=True)


# ─── Step 3: Correlation vs Cointegration ───────────────────────────────────

def _build_concept_chart() -> go.Figure:
    """Build synthetic chart showing correlated-not-cointegrated vs cointegrated pair."""
    np.random.seed(42)
    n = 300

    # Random walks (correlated but NOT cointegrated — they drift apart)
    returns = np.random.multivariate_normal(
        [0.0002, 0.0002],
        [[0.0001, 0.00008], [0.00008, 0.0001]],
        n,
    )
    walk_a = 100 * np.cumprod(1 + returns[:, 0])
    walk_b = 100 * np.cumprod(1 + returns[:, 1])

    # Cointegrated pair (shared trend + mean-reverting spread)
    trend = np.cumsum(np.random.normal(0.001, 0.02, n))
    coint_a = 100 + trend + np.random.normal(0, 0.3, n)
    coint_b = 50 + 0.5 * trend + np.random.normal(0, 0.3, n)
    # Normalize both to 100
    coint_a_norm = (coint_a / coint_a[0]) * 100
    coint_b_norm = (coint_b / coint_b[0]) * 100

    from plotly.subplots import make_subplots
    fig = make_subplots(
        rows=1, cols=2,
        subplot_titles=[
            "Correlated but NOT Cointegrated",
            "Cointegrated",
        ],
        horizontal_spacing=0.08,
    )

    # Left: correlated random walks that drift
    fig.add_trace(go.Scatter(
        x=list(range(n)), y=walk_a,
        name="Asset A", line=dict(width=1.5),
        showlegend=False,
    ), row=1, col=1)
    fig.add_trace(go.Scatter(
        x=list(range(n)), y=walk_b,
        name="Asset B", line=dict(width=1.5),
        showlegend=False,
    ), row=1, col=1)

    # Right: cointegrated pair
    fig.add_trace(go.Scatter(
        x=list(range(n)), y=coint_a_norm,
        name="Asset C", line=dict(width=1.5),
        showlegend=False,
    ), row=1, col=2)
    fig.add_trace(go.Scatter(
        x=list(range(n)), y=coint_b_norm,
        name="Asset D", line=dict(width=1.5),
        showlegend=False,
    ), row=1, col=2)

    fig.update_layout(
        height=350,
        title_text="The Key Difference",
        margin=dict(t=60),
    )
    fig.update_xaxes(title_text="Time", row=1, col=1)
    fig.update_xaxes(title_text="Time", row=1, col=2)
    fig.update_yaxes(title_text="Normalized Price", row=1, col=1)

    return fig


def _step_correlation_vs_cointegration(pair_data: dict | None) -> dmc.Paper:
    """Step 3: Why correlation isn't enough — cointegration explained."""
    step = TEACHING_STEPS[2]
    header = dmc.Group([
        dmc.ThemeIcon(
            _icon(step["icon"], 24),
            variant="light", size="xl", radius="md", color="blue",
        ),
        dmc.Stack([
            dmc.Title(step["label"], order=3),
            dmc.Text(step["description"], c="dimmed", size="sm"),
        ], gap=2),
    ], gap="md")

    # Concept chart (always shown — uses synthetic data)
    concept_fig = _build_concept_chart()

    # Pair comparison section
    if pair_data:
        corr = pair_data["correlation"]
        is_coint = pair_data["is_cointegrated"]
        p_val = pair_data["p_value"]

        pair_comparison = dmc.Stack([
            dmc.Title("Your Pair", order=5),
            dmc.Group([
                dmc.Stack([
                    dmc.Text("Correlation", size="sm", c="dimmed"),
                    dmc.Badge(
                        f"r = {corr:.3f}",
                        color=_correlation_color(corr),
                        variant="filled",
                        size="xl",
                    ),
                ], gap=4, align="center"),
                dmc.Divider(orientation="vertical", size="sm"),
                dmc.Stack([
                    dmc.Text("Cointegration", size="sm", c="dimmed"),
                    dmc.Badge(
                        "Cointegrated" if is_coint else "Not Cointegrated",
                        color="green" if is_coint else "orange",
                        variant="filled",
                        size="xl",
                    ),
                ], gap=4, align="center"),
                dmc.Divider(orientation="vertical", size="sm"),
                dmc.Stack([
                    dmc.Text("p-value", size="sm", c="dimmed"),
                    dmc.Badge(
                        f"p = {p_val:.4f}",
                        color="green" if p_val < 0.05 else "orange",
                        variant="light",
                        size="xl",
                    ),
                ], gap=4, align="center"),
            ], gap="xl", justify="center"),
            dmc.Text(
                f"{'✓ Good news: ' if is_coint else '⚠ '}"
                f"{pair_data['asset1']} and {pair_data['asset2']} "
                f"{'are cointegrated (p={:.4f} < 0.05). '.format(p_val) if is_coint else 'are NOT cointegrated (p={:.4f} ≥ 0.05). '.format(p_val)}"
                f"{'The spread between them is statistically mean-reverting — this is what we need for pairs trading.' if is_coint else 'Their prices may move together (correlation), but the gap between them drifts without reverting. This is still educational — the next steps show you what the test looks for.'}"
                ,
                size="sm",
                mt="sm",
            ),
        ], gap="sm")
    else:
        pair_comparison = _no_pair_selected_message()

    # Educational panel
    panel = _educational_panel(
        analogy=(
            "Two people might both go to the same restaurant every Friday — that's correlation. "
            "But if they always split the bill evenly, there's a structural link between their tabs — "
            "that's cointegration. The bill-splitting constraint means their individual tabs can't "
            "drift too far apart, even though each person orders different things.\n\n"
            "For trading: correlated assets move in the same direction, but the gap between them can "
            "grow forever. Cointegrated assets have a gap that snaps back — and that snap-back is your trade."
        ),
        mechanics=dmc.Stack([
            dmc.Text([
                _glossary_link("correlation", "Correlation"),
                " measures co-movement of returns (short-term direction). ",
                _glossary_link("cointegration", "Cointegration"),
                " measures whether a linear combination of prices is stationary (long-term equilibrium).",
            ], size="sm"),
            dmc.Text("Key differences:", size="sm", fw=500),
            dmc.List([
                dmc.ListItem("Correlation can change over time; cointegration is a structural property"),
                dmc.ListItem("High correlation ≠ cointegration (random walks can be correlated)"),
                dmc.ListItem("Low correlation ≠ no cointegration (mean-reverting spreads can have low return correlation)"),
                dmc.ListItem("Cointegration gives you a tradeable spread; correlation alone does not"),
            ], size="sm", spacing="xs"),
            dmc.Text(
                "The Engle-Granger test (next step) formally tests whether the spread between "
                "two assets is stationary — i.e., whether it always reverts to a mean.",
                size="sm", c="dimmed",
            ),
        ], gap="xs"),
        pair_specific=dmc.Stack([
            dmc.Text(
                f"{pair_data['asset1']} × {pair_data['asset2']}: "
                f"correlation = {pair_data['correlation']:.3f}, "
                f"cointegrated = {'Yes' if pair_data['is_cointegrated'] else 'No'} "
                f"(p = {pair_data['p_value']:.4f})"
                if pair_data else "Select a pair to see the comparison.",
                size="sm",
            ),
            dmc.Text(
                "A high correlation with no cointegration means these assets move together in the short term "
                "but can drift apart permanently — risky for pairs trading. "
                "Cointegration means the gap always snaps back — that's the edge."
                if pair_data and pair_data["correlation"] > 0.5 and not pair_data["is_cointegrated"]
                else
                "This pair passes both tests — strong correlation AND cointegration. "
                "The spread between them is statistically mean-reverting."
                if pair_data and pair_data["is_cointegrated"]
                else
                "The next step dives into the actual cointegration test mechanics."
                ,
                size="sm", c="dimmed",
            ),
        ], gap="xs") if pair_data else "Select a pair to see the comparison.",
        step_id="correlation",
    )

    return dmc.Paper([
        header,
        dmc.Divider(my="md"),
        dcc.Graph(figure=concept_fig, config={"displayModeBar": False}),
        dmc.Space(h="md"),
        pair_comparison,
        dmc.Space(h="md"),
        panel,
    ], shadow="sm", p="xl", radius="md", withBorder=True)


# ─── Step 4: Cointegration Test ─────────────────────────────────────────────

def _build_adf_number_line(pair_data: dict) -> go.Figure:
    """Build a visual number line showing ADF test statistic vs critical values."""
    test_stat = pair_data["cointegration_score"]
    critical = pair_data["critical_values"]
    is_coint = pair_data["is_cointegrated"]

    cv_1 = critical["1%"]
    cv_5 = critical["5%"]
    cv_10 = critical["10%"]

    # Number line range
    all_vals = [test_stat, cv_1, cv_5, cv_10]
    x_min = min(all_vals) - 1.0
    x_max = max(all_vals) + 1.5

    fig = go.Figure()

    # Colored zones
    fig.add_vrect(x0=x_min, x1=cv_1, fillcolor="rgba(81,207,102,0.15)",
                  line_width=0, annotation_text="Reject at 1%", annotation_position="top left")
    fig.add_vrect(x0=cv_1, x1=cv_5, fillcolor="rgba(252,196,25,0.12)",
                  line_width=0, annotation_text="Reject at 5%", annotation_position="top left")
    fig.add_vrect(x0=cv_5, x1=cv_10, fillcolor="rgba(255,107,107,0.10)",
                  line_width=0, annotation_text="Reject at 10%", annotation_position="top left")
    fig.add_vrect(x0=cv_10, x1=x_max, fillcolor="rgba(255,107,107,0.05)",
                  line_width=0, annotation_text="Fail to reject", annotation_position="top left")

    # Critical value lines
    for label, val, dash in [("1%", cv_1, "solid"), ("5%", cv_5, "dash"), ("10%", cv_10, "dot")]:
        fig.add_vline(x=val, line_dash=dash, line_color="rgba(255,255,255,0.4)", line_width=1)
        fig.add_annotation(x=val, y=0.15, text=f"{label}: {val:.2f}",
                          showarrow=False, font=dict(size=11, color="#909296"))

    # Test statistic marker
    fig.add_trace(go.Scatter(
        x=[test_stat], y=[0.5],
        mode="markers+text",
        marker=dict(
            size=18,
            color="#51CF66" if is_coint else "#FF6B6B",
            symbol="diamond",
            line=dict(width=2, color="white"),
        ),
        text=[f"ADF = {test_stat:.3f}"],
        textposition="top center",
        textfont=dict(size=13, color="white"),
        showlegend=False,
        hoverinfo="text",
        hovertext=f"ADF statistic: {test_stat:.4f}",
    ))

    fig.update_layout(
        title="ADF Test Statistic vs Critical Values",
        height=200,
        yaxis=dict(visible=False, range=[0, 1]),
        xaxis=dict(title="← More negative = stronger evidence against unit root",
                   range=[x_min, x_max]),
        margin=dict(t=40, b=50, l=40, r=40),
    )
    return fig


def _build_regression_scatter(pair_data: dict) -> go.Figure:
    """Build scatter plot with OLS regression line showing hedge ratio."""
    prices1 = np.array(pair_data["prices1"])
    prices2 = np.array(pair_data["prices2"])
    hedge = pair_data["hedge_ratio"]
    intercept = pair_data["intercept"]

    fitted = hedge * prices2 + intercept

    fig = go.Figure()
    fig.add_trace(go.Scatter(
        x=prices2, y=prices1,
        mode="markers",
        marker=dict(size=4, opacity=0.4),
        name="Price pairs",
    ))
    # Sort for clean line
    sort_idx = np.argsort(prices2)
    fig.add_trace(go.Scatter(
        x=prices2[sort_idx], y=fitted[sort_idx],
        mode="lines",
        line=dict(color="#FF6B6B", width=3),
        name=f"OLS: {pair_data['asset1']} = {hedge:.2f} × {pair_data['asset2']} + {intercept:.0f}",
    ))
    fig.update_layout(
        title=f"Regression: {pair_data['asset1']} vs {pair_data['asset2']}",
        xaxis_title=pair_data["asset2"],
        yaxis_title=pair_data["asset1"],
        height=380,
        hovermode="closest",
        legend=dict(orientation="h", yanchor="bottom", y=1.02),
    )
    return fig


def _step_cointegration_test(pair_data: dict | None) -> dmc.Paper:
    """Step 4: Cointegration test with visual ADF, regression scatter, hedge ratio."""
    step = TEACHING_STEPS[3]
    header = dmc.Group([
        dmc.ThemeIcon(
            _icon(step["icon"], 24),
            variant="light", size="xl", radius="md", color="blue",
        ),
        dmc.Stack([
            dmc.Title(step["label"], order=3),
            dmc.Text(step["description"], c="dimmed", size="sm"),
        ], gap=2),
    ], gap="md")

    if not pair_data:
        return dmc.Paper([
            header, dmc.Divider(my="md"), _no_pair_selected_message(),
        ], shadow="sm", p="xl", radius="md", withBorder=True)

    is_coint = pair_data["is_cointegrated"]
    p_val = pair_data["p_value"]
    test_stat = pair_data["cointegration_score"]
    hedge = pair_data["hedge_ratio"]

    # Traffic light with inline explanation
    traffic_light = dmc.Stack([
        dmc.Alert(
            children=dmc.Group([
                dmc.Text(
                    f"{'✓ PASS' if is_coint else '✗ FAIL'}: "
                    f"{pair_data['asset1']} × {pair_data['asset2']} "
                    f"{'are' if is_coint else 'are NOT'} cointegrated",
                    fw=600, size="md",
                ),
                dmc.Badge(f"p = {p_val:.4f}", variant="light",
                          color="green" if is_coint else "red", size="lg"),
            ], gap="sm"),
            color="green" if is_coint else "orange",
            variant="light",
        ),
        dmc.Text(
            f"The p-value of {p_val:.4f} is {'below' if p_val < 0.05 else 'above'} 0.05. "
            f"{'This means there is strong statistical evidence that the spread between these assets reverts to its mean — the foundation of pairs trading.' if p_val < 0.05 else ''}"
            f"{'This means we cannot confidently say the spread mean-reverts. The relationship may exist but is not statistically significant at the 5% level.' if p_val >= 0.05 else ''}",
            size="sm", c="dimmed",
        ),
    ], gap=4)

    # Warning for failing pairs
    fail_note = None
    if not is_coint:
        fail_note = dmc.Alert(
            "This pair didn't pass the cointegration test — but that's fine. "
            "Understanding why a pair fails is just as educational as understanding why one passes. "
            "The charts below still show you what the test looks for.",
            color="blue", variant="light", icon=_icon("tabler:info-circle", 20),
        )

    # ADF number line
    adf_fig = _build_adf_number_line(pair_data)

    # Regression scatter
    reg_fig = _build_regression_scatter(pair_data)

    # Hedge ratio card
    hedge_card = dmc.Paper([
        dmc.Title("Hedge Ratio", order=5),
        dmc.Group([
            dmc.Badge(f"β = {hedge:.4f}", color="violet", variant="filled", size="xl"),
            dmc.Text(
                f"For every 1 unit of {pair_data['asset2']}, hold {hedge:.2f} units of {pair_data['asset1']}.",
                size="sm",
            ),
        ], gap="md"),
        dmc.Text(
            "The hedge ratio comes from the OLS regression slope. It tells you how to size "
            "your positions so the spread between them is as stationary as possible. "
            "If the hedge ratio is 20, you'd need €20 of the first asset for every €1 of the second.",
            size="sm", c="dimmed", mt="xs",
        ),
    ], p="md", radius="md", withBorder=True, bg="dark.7")

    # Educational panel
    panel = _educational_panel(
        analogy=(
            "Imagine a drunk person and their dog walking home. The person staggers randomly, "
            "but the dog — attached by a leash — can only wander so far before being pulled back. "
            "The cointegration test checks whether the 'leash' between two asset prices is real: "
            "does the gap between them always snap back, or can it stretch forever?\n\n"
            "The ADF test looks for this 'snap-back' force. A strongly negative test statistic means "
            "there's a strong pull back toward the mean — like a short, tight leash."
        ),
        mechanics=dmc.Stack([
            dmc.Text([
                "The Engle-Granger ",
                _glossary_link("cointegration"),
                " test works in two steps:",
            ], size="sm", fw=500),
            dmc.List([
                dmc.ListItem([
                    dmc.Text("Step 1: Regression", fw=500, size="sm", span=True),
                    dmc.Text([
                        f" — Regress {pair_data['asset1']} on {pair_data['asset2']} to find the ",
                        _glossary_link("hedge ratio"),
                        f" (β = {hedge:.4f}). "
                        "The regression line shows the long-run equilibrium relationship.",
                    ], size="sm", span=True),
                ]),
                dmc.ListItem([
                    dmc.Text("Step 2: ", fw=500, size="sm", span=True),
                    _glossary_link("ADF test"),
                    dmc.Text(
                        " on residuals"
                        " — The residuals (spread) from step 1 are tested for stationarity. "
                        "If the spread is stationary, the pair is cointegrated.",
                        size="sm", span=True,
                    ),
                ]),
            ], size="sm", spacing="xs"),
            dmc.Text(
                "The ADF test null hypothesis is 'the spread has a unit root' (i.e., it's non-stationary). "
                "We want to REJECT this — a p-value < 0.05 means the spread is stationary.",
                size="sm", c="dimmed",
            ),
        ], gap="xs"),
        pair_specific=dmc.Stack([
            dmc.Text(
                f"Test statistic: {test_stat:.4f} | p-value: {p_val:.4f} | "
                f"Hedge ratio: {hedge:.4f}",
                size="sm", fw=500,
            ),
            dmc.Text(
                f"{'The test statistic ({:.3f}) is more negative than the 5% critical value — '.format(test_stat)}"
                f"strong evidence that the spread is stationary. "
                f"The hedge ratio of {hedge:.2f} means for position sizing, you'd hold "
                f"~{hedge:.1f}× as much {pair_data['asset1']} as {pair_data['asset2']}."
                if is_coint else
                f"The test statistic ({test_stat:.3f}) is not negative enough to reject the null. "
                f"The spread may drift without reverting — pairs trading on this pair carries higher risk. "
                f"Try different timeframes or asset combinations.",
                size="sm", c="dimmed",
            ),
        ], gap="xs"),
        step_id="cointegration",
    )

    children = [header, dmc.Divider(my="md")]

    # Brief correlation vs cointegration intro (merged from former step 3)
    children.append(dmc.Alert(
        children=[
            dmc.Text("Quick concept: Correlation ≠ Cointegration", fw=600, size="sm"),
            dmc.Text(
                "Two assets can be highly correlated (move in the same direction) yet still drift apart permanently. "
                "Cointegration is stronger — it means the gap between them always snaps back to a mean. "
                "That snap-back is what makes pairs trading possible. The test below checks for this property.",
                size="sm", mt=4,
            ),
        ],
        color="blue", variant="light", mb="sm",
    ))

    children.append(traffic_light)
    if fail_note:
        children.append(fail_note)
    children.extend([
        dmc.Space(h="sm"),
        dcc.Graph(figure=adf_fig, config={"displayModeBar": False}),
        dmc.Text(
            f"The ADF test statistic ({test_stat:.3f}) shows how strongly the spread is pulled back toward its mean. "
            f"More negative = stronger pull. The colored zones show the critical values — "
            f"{'the diamond falls in the green zone, confirming stationarity.' if is_coint else 'the diamond is in the red zone, meaning the evidence is not strong enough.'}",
            size="sm", c="dimmed", mt=4,
        ),
        dmc.Space(h="md"),
        dcc.Graph(figure=reg_fig, config={"displayModeBar": False}),
        dmc.Text(
            f"Each dot is one point in time where {pair_data['asset2']} was at price X and "
            f"{pair_data['asset1']} was at price Y. The red line is the best fit — its slope "
            f"({hedge:.2f}) is the hedge ratio used to construct the spread.",
            size="sm", c="dimmed", mt=4,
        ),
        dmc.Space(h="sm"),
        hedge_card,
        dmc.Space(h="md"),
        panel,
    ])

    return dmc.Paper(children, shadow="sm", p="xl", radius="md", withBorder=True)


# ─── Step 5: The Spread ─────────────────────────────────────────────────────

def _build_spread_chart(pair_data: dict, window: int) -> go.Figure:
    """Build spread chart with rolling mean and σ bands."""
    spread = np.array([x if x is not None else np.nan for x in pair_data["spread"]])
    timestamps = _parse_timestamps(pair_data["timestamps"])

    rolling_mean = np.full_like(spread, np.nan)
    rolling_std = np.full_like(spread, np.nan)
    for i in range(window, len(spread)):
        chunk = spread[i - window:i]
        valid = chunk[~np.isnan(chunk)]
        if len(valid) > 1:
            rolling_mean[i] = np.mean(valid)
            rolling_std[i] = np.std(valid)

    fig = go.Figure()
    # σ bands (3σ, 2σ, 1σ)
    for n, opacity in [(3, 0.06), (2, 0.10), (1, 0.15)]:
        upper = rolling_mean + n * rolling_std
        lower = rolling_mean - n * rolling_std
        fig.add_trace(go.Scatter(
            x=timestamps, y=upper, mode="lines",
            line=dict(width=0), showlegend=False, hoverinfo="skip",
        ))
        fig.add_trace(go.Scatter(
            x=timestamps, y=lower, mode="lines",
            line=dict(width=0), fill="tonexty",
            fillcolor=f"rgba(51,154,240,{opacity})",
            name=f"±{n}σ", hoverinfo="skip",
        ))

    fig.add_trace(go.Scatter(
        x=timestamps, y=rolling_mean,
        mode="lines", name="Rolling Mean",
        line=dict(color="#FCC419", width=2, dash="dash"),
    ))
    fig.add_trace(go.Scatter(
        x=timestamps, y=spread,
        mode="lines", name="Spread",
        line=dict(color="#339AF0", width=1.5),
    ))

    fig.update_layout(
        title=f"Spread: {pair_data['asset1']} − β×{pair_data['asset2']} (window={window})",
        xaxis_title="", yaxis_title="Spread Value",
        height=400, hovermode="x unified",
        legend=dict(orientation="h", yanchor="bottom", y=1.02),
    )
    return fig


def _build_spread_histogram(pair_data: dict) -> go.Figure:
    """Build histogram of spread values to show distribution."""
    spread = np.array([x for x in pair_data["spread"] if x is not None])
    spread = spread[~np.isnan(spread)]

    fig = go.Figure()
    fig.add_trace(go.Histogram(
        x=spread, nbinsx=50,
        marker_color="#339AF0", opacity=0.7,
        name="Spread distribution",
    ))
    fig.add_vline(x=np.mean(spread), line_dash="dash", line_color="#FCC419",
                  annotation_text=f"Mean: {np.mean(spread):.1f}")
    fig.update_layout(
        title="Spread Distribution (Stationarity Check)",
        xaxis_title="Spread Value", yaxis_title="Frequency",
        height=280, showlegend=False,
    )
    return fig


def _step_spread(pair_data: dict | None, params: dict) -> dmc.Paper:
    """Step 5: Spread chart with σ bands and rolling window slider."""
    step = TEACHING_STEPS[4]
    header = dmc.Group([
        dmc.ThemeIcon(
            _icon(step["icon"], 24),
            variant="light", size="xl", radius="md", color="blue",
        ),
        dmc.Stack([
            dmc.Title(step["label"], order=3),
            dmc.Text(step["description"], c="dimmed", size="sm"),
        ], gap=2),
    ], gap="md")

    if not pair_data:
        return dmc.Paper([
            header, dmc.Divider(my="md"), _no_pair_selected_message(),
        ], shadow="sm", p="xl", radius="md", withBorder=True)

    window = params.get("rolling_window", 60)

    # Rolling window slider
    slider = dmc.Stack([
        dmc.Text(f"Rolling Window: {window} periods", id="learn-window-label", size="sm", fw=500),
        dmc.Slider(
            id="learn-window-slider",
            value=window,
            min=10, max=200, step=5,
            marks=[
                {"value": 20, "label": "20"},
                {"value": 60, "label": "60"},
                {"value": 120, "label": "120"},
                {"value": 200, "label": "200"},
            ],
            color="blue",
        ),
    ], gap=4, mb="md")

    # Charts
    spread_fig = _build_spread_chart(pair_data, window)
    hist_fig = _build_spread_histogram(pair_data)

    # Half-life info
    hl = pair_data.get("half_life")
    hl_badge = dmc.Group([
        dmc.Text("Half-life of mean reversion:", size="sm"),
        dmc.Badge(
            f"{abs(hl):.1f} periods" if hl and np.isfinite(hl) and hl > 0 else
            f"N/A" if not hl or not np.isfinite(hl) else "Not converging",
            color="teal" if hl and np.isfinite(hl) and 0 < hl < 100 else "orange",
            variant="light", size="lg",
        ),
        dmc.Text(
            f"(~{abs(hl):.0f} {'hours' if pair_data['timeframe'] == '1h' else 'candles'})"
            if hl and np.isfinite(hl) and hl > 0 else "",
            size="sm", c="dimmed",
        ),
    ], gap="sm") if hl else None

    panel = _educational_panel(
        analogy=(
            "The spread is like measuring the length of the leash between two dogs at every moment. "
            "When the leash stretches too far (spread moves away from the mean), you expect it to snap back. "
            "The σ bands show you what 'too far' looks like statistically — when the spread crosses "
            "the ±2σ band, it's in unusual territory."
        ),
        mechanics=dmc.Stack([
            dmc.Text([
                "The ",
                _glossary_link("spread"),
                " is constructed from the cointegration regression:",
            ], size="sm"),
            dmc.Code(
                f"spread = {pair_data['asset1']} − ({pair_data['hedge_ratio']:.4f} × {pair_data['asset2']})",
                block=True,
            ),
            dmc.Text([
                "The rolling mean and standard deviation create dynamic bands. "
                "A stationary spread oscillates around a stable mean — this is ",
                _glossary_link("mean reversion", "mean reversion"),
                " in action. "
                "The rolling window controls how much history is used for the bands. "
                "Shorter windows react faster but are noisier; longer windows are smoother but lag.",
            ], size="sm"),
            dmc.Text([
                "The histogram should look roughly bell-shaped (normal) and centered (",
                _glossary_link("stationarity"),
                "). "
                "A skewed or fat-tailed distribution warns that the spread may not behave as expected.",
            ], size="sm", c="dimmed"),
        ], gap="xs"),
        pair_specific=dmc.Stack([
            dmc.Text(
                f"Spread = {pair_data['asset1']} − {pair_data['hedge_ratio']:.2f} × {pair_data['asset2']}. "
                f"{'The spread looks mean-reverting — good for trading.' if pair_data['is_cointegrated'] else 'The spread may drift — use caution.'}"
                f"{' Half-life: {:.1f} periods.'.format(hl) if hl and np.isfinite(hl) else ''}",
                size="sm",
            ),
            dmc.Text(
                "Try adjusting the rolling window slider to see how the bands change. "
                "A window matching the half-life often gives the best signals.",
                size="sm", c="dimmed",
            ),
        ], gap="xs"),
        step_id="spread",
    )

    children = [header, dmc.Divider(my="md"), slider,
                dcc.Graph(id="learn-spread-chart", figure=spread_fig, config={"displayModeBar": False}),
                dmc.Text(
                    f"The blue line is the spread: {pair_data['asset1']} − {pair_data['hedge_ratio']:.2f} × {pair_data['asset2']}. "
                    f"The dashed yellow line is the rolling average, and the shaded bands show ±1σ, ±2σ, and ±3σ. "
                    f"When the spread moves outside the bands, it's statistically unusual.",
                    size="sm", c="dimmed", mt=4,
                )]
    if hl_badge:
        children.append(hl_badge)
    children.extend([
        dmc.Space(h="sm"),
        dcc.Graph(id="learn-spread-hist", figure=hist_fig, config={"displayModeBar": False}),
        dmc.Text(
            "This histogram shows how spread values are distributed. A bell-shaped curve centered "
            "around the mean suggests the spread is well-behaved and stationary — good for trading.",
            size="sm", c="dimmed", mt=4,
        ),
        dmc.Space(h="md"),
        panel,
    ])
    return dmc.Paper(children, shadow="sm", p="xl", radius="md", withBorder=True)


# ─── Step 6: Z-Score & Signals ──────────────────────────────────────────────

def _generate_signals(zscore: np.ndarray, entry: float, exit_thresh: float,
                      stop: float) -> dict:
    """Generate trading signals from z-score series."""
    signals = []  # list of (index, type, zscore_val)
    position = 0  # 0=flat, 1=long spread, -1=short spread

    for i in range(len(zscore)):
        z = zscore[i]
        if np.isnan(z):
            continue

        if position == 0:
            if z <= -entry:
                signals.append((i, "long_entry", z))
                position = 1
            elif z >= entry:
                signals.append((i, "short_entry", z))
                position = -1
        elif position == 1:
            if z >= -exit_thresh:
                signals.append((i, "long_exit", z))
                position = 0
            elif z <= -stop:
                signals.append((i, "stop_loss", z))
                position = 0
        elif position == -1:
            if z <= exit_thresh:
                signals.append((i, "short_exit", z))
                position = 0
            elif z >= stop:
                signals.append((i, "stop_loss", z))
                position = 0

    # Summarize
    entries = [s for s in signals if "entry" in s[1]]
    exits = [s for s in signals if "exit" in s[1]]
    stops = [s for s in signals if "stop" in s[1]]

    return {
        "signals": signals,
        "total_trades": len(entries),
        "long_entries": len([s for s in entries if s[1] == "long_entry"]),
        "short_entries": len([s for s in entries if s[1] == "short_entry"]),
        "exits": len(exits),
        "stop_losses": len(stops),
    }


def _build_zscore_chart(pair_data: dict, params: dict) -> go.Figure:
    """Build z-score chart with threshold zones and signal markers."""
    zscore = np.array([x if x is not None else np.nan for x in pair_data["zscore"]])
    timestamps = _parse_timestamps(pair_data["timestamps"])
    entry = params["entry_threshold"]
    exit_t = params["exit_threshold"]
    stop = params["stop_threshold"]

    fig = go.Figure()

    # Threshold zones
    fig.add_hrect(y0=entry, y1=stop, fillcolor="rgba(255,107,107,0.08)", line_width=0)
    fig.add_hrect(y0=-stop, y1=-entry, fillcolor="rgba(81,207,102,0.08)", line_width=0)
    fig.add_hrect(y0=-exit_t, y1=exit_t, fillcolor="rgba(252,196,25,0.06)", line_width=0)

    # Threshold lines
    for val, label, color, dash in [
        (entry, f"Entry (+{entry})", "#FF6B6B", "dash"),
        (-entry, f"Entry (−{entry})", "#51CF66", "dash"),
        (exit_t, f"Exit (+{exit_t})", "#FCC419", "dot"),
        (-exit_t, f"Exit (−{exit_t})", "#FCC419", "dot"),
        (stop, f"Stop (+{stop})", "#FF6B6B", "solid"),
        (-stop, f"Stop (−{stop})", "#51CF66", "solid"),
    ]:
        fig.add_hline(y=val, line_dash=dash, line_color=color, opacity=0.5,
                      annotation_text=label, annotation_position="right")

    fig.add_hline(y=0, line_color="rgba(255,255,255,0.3)", line_width=1)

    # Z-score line
    fig.add_trace(go.Scatter(
        x=timestamps, y=zscore,
        mode="lines", name="Z-Score",
        line=dict(color="#339AF0", width=1.5),
    ))

    # Signal markers
    sig_data = _generate_signals(zscore, entry, exit_t, stop)
    for idx, sig_type, z_val in sig_data["signals"]:
        if idx < len(timestamps):
            color = {"long_entry": "#51CF66", "short_entry": "#FF6B6B",
                     "long_exit": "#FCC419", "short_exit": "#FCC419",
                     "stop_loss": "#FF922B"}.get(sig_type, "white")
            symbol = {"long_entry": "triangle-up", "short_entry": "triangle-down",
                      "long_exit": "circle", "short_exit": "circle",
                      "stop_loss": "x"}.get(sig_type, "circle")
            fig.add_trace(go.Scatter(
                x=[timestamps[idx]], y=[z_val],
                mode="markers", showlegend=False,
                marker=dict(size=10, color=color, symbol=symbol,
                            line=dict(width=1, color="white")),
                hovertext=sig_type.replace("_", " ").title(),
                hoverinfo="text",
            ))

    fig.update_layout(
        title="Z-Score with Trading Signals",
        xaxis_title="", yaxis_title="Z-Score",
        height=420, hovermode="x unified",
    )
    return fig, sig_data


def _build_signal_summary(pair_data: dict, sig_data: dict,
                          entry: float, exit_t: float, stop: float) -> dmc.Paper:
    """Build the signal summary panel for z-score step."""
    return dmc.Paper([
        dmc.Title("Signal Summary", order=5),
        dmc.SimpleGrid(
            cols=4,
            children=[
                dmc.Stack([
                    dmc.Text(str(sig_data["total_trades"]), size="xl", fw=700, ta="center",
                             c="blue"),
                    dmc.Text("Total Trades", size="xs", c="dimmed", ta="center"),
                ], gap=2),
                dmc.Stack([
                    dmc.Text(str(sig_data["long_entries"]), size="xl", fw=700, ta="center",
                             c="green"),
                    dmc.Text("Long Entries", size="xs", c="dimmed", ta="center"),
                ], gap=2),
                dmc.Stack([
                    dmc.Text(str(sig_data["short_entries"]), size="xl", fw=700, ta="center",
                             c="red"),
                    dmc.Text("Short Entries", size="xs", c="dimmed", ta="center"),
                ], gap=2),
                dmc.Stack([
                    dmc.Text(str(sig_data["stop_losses"]), size="xl", fw=700, ta="center",
                             c="orange"),
                    dmc.Text("Stop Losses", size="xs", c="dimmed", ta="center"),
                ], gap=2),
            ],
        ),
        dmc.Text(
            f"With entry at ±{entry}σ, exit at ±{exit_t}σ, and stop at ±{stop}σ, "
            f"this pair generates {sig_data['total_trades']} trades over the period. "
            f"{'Adjust the sliders to see how thresholds affect trade frequency.' if sig_data['total_trades'] > 0 else 'Try lowering the entry threshold to generate more signals.'}",
            size="sm", c="dimmed", mt="sm",
        ),
    ], p="md", radius="md", withBorder=True, bg="dark.7")


def _step_zscore_signals(pair_data: dict | None, params: dict) -> dmc.Paper:
    """Step 6: Z-score chart with threshold sliders and signal summary."""
    step = TEACHING_STEPS[5]
    header = dmc.Group([
        dmc.ThemeIcon(
            _icon(step["icon"], 24),
            variant="light", size="xl", radius="md", color="blue",
        ),
        dmc.Stack([
            dmc.Title(step["label"], order=3),
            dmc.Text(step["description"], c="dimmed", size="sm"),
        ], gap=2),
    ], gap="md")

    if not pair_data:
        return dmc.Paper([
            header, dmc.Divider(my="md"), _no_pair_selected_message(),
        ], shadow="sm", p="xl", radius="md", withBorder=True)

    entry = params.get("entry_threshold", 2.0)
    exit_t = params.get("exit_threshold", 0.5)
    stop = params.get("stop_threshold", 3.0)

    # Sliders
    sliders = dmc.SimpleGrid(
        cols=3,
        children=[
            dmc.Stack([
                dmc.Text(f"Entry: ±{entry:.1f}σ", id="learn-entry-label", size="sm", fw=500),
                dmc.Slider(
                    id="learn-entry-slider", value=entry,
                    min=1.0, max=3.0, step=0.1,
                    marks=[{"value": 1.5, "label": "1.5"}, {"value": 2.0, "label": "2.0"},
                           {"value": 2.5, "label": "2.5"}],
                    color="red",
                ),
            ], gap=4),
            dmc.Stack([
                dmc.Text(f"Exit: ±{exit_t:.1f}σ", id="learn-exit-label", size="sm", fw=500),
                dmc.Slider(
                    id="learn-exit-slider", value=exit_t,
                    min=0.0, max=1.5, step=0.1,
                    marks=[{"value": 0.0, "label": "0"}, {"value": 0.5, "label": "0.5"},
                           {"value": 1.0, "label": "1.0"}],
                    color="yellow",
                ),
            ], gap=4),
            dmc.Stack([
                dmc.Text(f"Stop Loss: ±{stop:.1f}σ", id="learn-stop-label", size="sm", fw=500),
                dmc.Slider(
                    id="learn-stop-slider", value=stop,
                    min=2.0, max=5.0, step=0.1,
                    marks=[{"value": 2.5, "label": "2.5"}, {"value": 3.0, "label": "3.0"},
                           {"value": 4.0, "label": "4.0"}],
                    color="orange",
                ),
            ], gap=4),
        ],
        mb="md",
    )

    # Chart + signals
    zscore_fig, sig_data = _build_zscore_chart(pair_data, params)

    # Signal summary panel
    summary = _build_signal_summary(pair_data, sig_data, entry, exit_t, stop)

    panel = _educational_panel(
        analogy=(
            "The z-score is like a thermostat reading. It tells you how far from 'normal' the spread is "
            "right now. When the reading hits +2 (the spread is unusually wide), it's like the room being "
            "too hot — you expect it to cool back down. That 'cooling down' expectation is your trade.\n\n"
            "The entry threshold is your trigger point ('it's hot enough to turn on the AC'). "
            "The exit threshold is when conditions are back to normal. "
            "The stop-loss is your 'something is broken' level — the AC isn't working, get out."
        ),
        mechanics=dmc.Stack([
            dmc.Text([
                "The ",
                _glossary_link("z-score"),
                " standardizes the ",
                _glossary_link("spread"),
                ":",
            ], size="sm"),
            dmc.Code(
                "z-score = (spread − rolling_mean) / rolling_std",
                block=True,
            ),
            dmc.Text(
                "Trading rules:\n"
                "• z < −entry → go long (spread is unusually tight, expect widening)\n"
                "• z > +entry → go short (spread is unusually wide, expect tightening)\n"
                "• |z| < exit → close position (spread is back to normal)\n"
                "• |z| > stop → stop loss (spread is moving against you too much)",
                size="sm", style={"whiteSpace": "pre-line"},
            ),
            dmc.Text(
                "The trade-off: lower entry thresholds generate more signals but more false positives. "
                "Higher thresholds are more selective but you miss opportunities.",
                size="sm", c="dimmed",
            ),
        ], gap="xs"),
        pair_specific=dmc.Stack([
            dmc.Text(
                f"With current thresholds (entry ±{entry}σ, exit ±{exit_t}σ, stop ±{stop}σ), "
                f"this pair generates {sig_data['total_trades']} trade signals. "
                f"{'This is a reasonable frequency for a real strategy.' if 3 <= sig_data['total_trades'] <= 30 else ''}"
                f"{'Very few signals — consider lowering entry threshold.' if sig_data['total_trades'] < 3 else ''}"
                f"{'Many signals — the threshold may be too loose.' if sig_data['total_trades'] > 30 else ''}",
                size="sm",
            ),
            dmc.Text(
                "Try moving the sliders to build intuition about the trade-off between "
                "selectivity and trade frequency.",
                size="sm", c="dimmed",
            ),
        ], gap="xs"),
        step_id="zscore",
    )

    return dmc.Paper([
        header, dmc.Divider(my="md"), sliders,
        dcc.Graph(id="learn-zscore-chart", figure=zscore_fig, config={"displayModeBar": False}),
        dmc.Text(
            f"The z-score standardizes the spread to show how many standard deviations it is from normal. "
            f"▲ green triangles = long entries (spread is unusually low, expect it to rise). "
            f"▼ red triangles = short entries (spread is unusually high, expect it to drop). "
            f"● yellow circles = exits (spread returned to normal). ✕ = stop-loss.",
            size="sm", c="dimmed", mt=4,
        ),
        dmc.Space(h="md"),
        html.Div(id="learn-signal-summary", children=[summary]),
        dmc.Space(h="md"),
        panel,
    ], shadow="sm", p="xl", radius="md", withBorder=True)


def _render_step_content(step_index: int, pair_data: dict | None = None,
                        params: dict | None = None) -> html.Div:
    """Render content for the active step."""
    params = params or {}
    if step_index == 0:
        content = _step_pair_selector()
    elif step_index == 1:
        content = _step_price_comparison(pair_data)
    elif step_index == 2:
        content = _step_correlation_vs_cointegration(pair_data)
    elif step_index == 3:
        content = _step_cointegration_test(pair_data)
    elif step_index == 4:
        content = _step_spread(pair_data, params)
    elif step_index == 5:
        content = _step_zscore_signals(pair_data, params)
    else:
        content = _step_placeholder(step_index)
    return html.Div(
        content,
        style={"maxWidth": "900px"},
    )


# ─── Layout ──────────────────────────────────────────────────────────────────

def layout():
    """Teaching Flow page layout."""
    return html.Div([
        # Page header
        dmc.Group([
            dmc.Title("Learn Statistical Arbitrage", order=2),
            dmc.Badge("Step by Step", variant="light", color="teal"),
        ], gap="md", mb="xs"),
        dmc.Text(
            "Walk through the complete stat arb pipeline — from selecting a pair to generating trading signals.",
            c="dimmed",
            size="sm",
            mb="lg",
        ),

        # Pair selector bar (always visible, not inside step content)
        dmc.Paper([
            dmc.Group([
                dmc.Select(
                    id="learn-asset1",
                    placeholder="Asset 1",
                    searchable=True,
                    w=180,
                    size="sm",
                    leftSection=_icon("tabler:coin", 16),
                ),
                dmc.Text("×", c="dimmed", size="lg"),
                dmc.Select(
                    id="learn-asset2",
                    placeholder="Asset 2",
                    searchable=True,
                    w=180,
                    size="sm",
                    leftSection=_icon("tabler:coin", 16),
                ),
                dmc.Select(
                    id="learn-timeframe",
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
                html.Div(id="learn-pair-status"),
            ], gap="sm", align="flex-end"),
        ], p="md", radius="md", withBorder=True, mb="lg"),

        # Stepper
        dmc.Stepper(
            id="learn-stepper",
            active=0,
            allowNextStepsSelect=True,
            size="sm",
            children=[
                dmc.StepperStep(
                    label=step["label"],
                    description=step["description"],
                    icon=_icon(step["icon"], 18),
                    allowStepSelect=True,
                )
                for step in TEACHING_STEPS
            ],
        ),

        # Step content area
        html.Div(id="learn-step-content", style={"marginTop": "24px"}),

        # Stores
        dcc.Store(id="learn-pair-data", storage_type="memory"),
        dcc.Store(id="learn-rolling-window", data=60, storage_type="memory"),
        dcc.Store(id="learn-entry-threshold", data=2.0, storage_type="memory"),
        dcc.Store(id="learn-exit-threshold", data=0.5, storage_type="memory"),
        dcc.Store(id="learn-stop-threshold", data=3.0, storage_type="memory"),
    ])


# ─── Callbacks ───────────────────────────────────────────────────────────────

def register_callbacks(app):
    """Register teaching flow callbacks."""

    @app.callback(
        Output("learn-step-content", "children"),
        Input("learn-stepper", "active"),
        Input("learn-pair-data", "data"),
        State("learn-rolling-window", "data"),
        State("learn-entry-threshold", "data"),
        State("learn-exit-threshold", "data"),
        State("learn-stop-threshold", "data"),
    )
    def render_step(active_step, pair_data, rolling_window,
                    entry_thresh, exit_thresh, stop_thresh):
        """Render content for the currently active step."""
        if active_step is None:
            active_step = 0
        params = {
            "rolling_window": rolling_window or 60,
            "entry_threshold": entry_thresh or 2.0,
            "exit_threshold": exit_thresh or 0.5,
            "stop_threshold": stop_thresh or 3.0,
        }
        return _render_step_content(active_step, pair_data, params)

    @app.callback(
        Output("learn-asset1", "data"),
        Output("learn-asset2", "data"),
        Input("learn-stepper", "active"),
    )
    def populate_learn_pairs(_active):
        """Populate pair selector dropdowns from cached data on page load."""
        try:
            cache = get_cache_manager()
            cached = cache.list_cached()
            symbols = sorted(set(item["symbol"] for item in cached))
            options = [{"label": s, "value": s} for s in symbols]
            return options, options
        except Exception:
            return [], []

    @app.callback(
        Output("learn-pair-data", "data"),
        Output("learn-pair-status", "children"),
        Input("learn-asset1", "value"),
        Input("learn-asset2", "value"),
        Input("learn-timeframe", "value"),
        prevent_initial_call=True,
    )
    def load_pair_data(asset1, asset2, timeframe):
        """Load price data and compute all analysis results for the selected pair."""
        if not asset1 or not asset2:
            return no_update, dmc.Text(
                "Select both assets to begin.",
                c="dimmed",
                size="sm",
                fs="italic",
            )

        if asset1 == asset2:
            return no_update, dmc.Alert(
                "Pick two different assets.",
                color="yellow",
                variant="light",
            )

        timeframe = timeframe or "1h"

        try:
            cache = get_cache_manager()

            # Only load from cache — don't trigger API fetches
            if not cache.has_cache(asset1, timeframe) or not cache.has_cache(asset2, timeframe):
                missing = []
                if not cache.has_cache(asset1, timeframe):
                    missing.append(f"{asset1} ({timeframe})")
                if not cache.has_cache(asset2, timeframe):
                    missing.append(f"{asset2} ({timeframe})")
                return no_update, dmc.Alert(
                    f"No cached data for: {', '.join(missing)}. "
                    f"Try a different timeframe or run data collection first.",
                    color="yellow",
                    variant="light",
                )

            df1 = cache.get_candles(asset1, timeframe)
            df2 = cache.get_candles(asset2, timeframe)

            # Align timestamps — inner join on timestamp column
            merged = df1.select(["timestamp", "close"]).join(
                df2.select(["timestamp", "close"]),
                on="timestamp",
                how="inner",
                suffix="_b",
            )

            prices1 = merged["close"].cast(float)
            prices2 = merged["close_b"].cast(float)

            # Run PairAnalysis
            analysis = PairAnalysis(prices1, prices2)
            coint = analysis.test_cointegration()
            correlation = analysis.get_correlation()
            spread = analysis.calculate_spread(method="ols")
            zscore = analysis.calculate_zscore(window=60)
            half_life = analysis.calculate_half_life()

            # Serialize to JSON-friendly dict
            pair_data = {
                "asset1": asset1,
                "asset2": asset2,
                "timeframe": timeframe,
                "n_points": len(merged),
                "prices1": prices1.to_list(),
                "prices2": prices2.to_list(),
                "timestamps": merged["timestamp"].cast(str).to_list(),
                "correlation": float(correlation),
                "is_cointegrated": bool(coint["is_cointegrated"]),
                "p_value": float(coint["p_value"]),
                "cointegration_score": float(coint["cointegration_score"]),
                "critical_values": {
                    k: float(v) for k, v in coint["critical_values"].items()
                },
                "hedge_ratio": float(coint["hedge_ratio"]),
                "intercept": float(coint["intercept"]),
                "interpretation": str(coint["interpretation"]),
                "spread": [float(x) if np.isfinite(x) else None for x in spread],
                "zscore": [float(x) if np.isfinite(x) else None for x in zscore],
                "half_life": float(half_life) if np.isfinite(half_life) else None,
            }

            # Status message
            coint_badge = dmc.Badge(
                "Cointegrated" if pair_data["is_cointegrated"] else "Not cointegrated",
                color="green" if pair_data["is_cointegrated"] else "orange",
                variant="light",
            )
            status = dmc.Group([
                dmc.Text(
                    f"✓ Loaded {pair_data['n_points']} data points for "
                    f"{asset1} × {asset2} ({timeframe})",
                    size="sm",
                    c="teal",
                ),
                coint_badge,
            ], gap="sm")

            return pair_data, status

        except Exception as e:
            return no_update, dmc.Alert(
                f"Error loading data: {e}",
                color="red",
                variant="light",
            )

    # Slider → store callbacks (sliders inside step content update stores)
    @app.callback(
        Output("learn-raw-chart-container", "style"),
        Output("learn-norm-chart-container", "style"),
        Input("learn-price-toggle", "value"),
        prevent_initial_call=True,
    )
    def toggle_price_chart(view):
        if view == "raw":
            return {"display": "block"}, {"display": "none"}
        return {"display": "none"}, {"display": "block"}

    @app.callback(
        Output("learn-rolling-window", "data"),
        Output("learn-spread-chart", "figure"),
        Output("learn-window-label", "children"),
        Input("learn-window-slider", "value"),
        State("learn-pair-data", "data"),
        prevent_initial_call=True,
    )
    def update_rolling_window(value, pair_data):
        window = value or 60
        fig = _build_spread_chart(pair_data, window) if pair_data else no_update
        label = f"Rolling Window: {window} periods"
        return window, fig, label

    @app.callback(
        Output("learn-entry-threshold", "data"),
        Output("learn-exit-threshold", "data"),
        Output("learn-stop-threshold", "data"),
        Output("learn-zscore-chart", "figure"),
        Output("learn-signal-summary", "children"),
        Output("learn-entry-label", "children"),
        Output("learn-exit-label", "children"),
        Output("learn-stop-label", "children"),
        Input("learn-entry-slider", "value"),
        Input("learn-exit-slider", "value"),
        Input("learn-stop-slider", "value"),
        State("learn-pair-data", "data"),
        prevent_initial_call=True,
    )
    def update_zscore_params(entry, exit_t, stop, pair_data):
        entry = entry or 2.0
        exit_t = exit_t or 0.5
        stop = stop or 3.0
        if pair_data:
            params = {
                "entry_threshold": entry,
                "exit_threshold": exit_t,
                "stop_threshold": stop,
            }
            fig, sig_data = _build_zscore_chart(pair_data, params)
            summary = _build_signal_summary(pair_data, sig_data, entry, exit_t, stop)
        else:
            fig = no_update
            summary = no_update
        return (
            entry, exit_t, stop, fig, summary,
            f"Entry: ±{entry:.1f}σ",
            f"Exit: ±{exit_t:.1f}σ",
            f"Stop Loss: ±{stop:.1f}σ",
        )
