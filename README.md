# Statistical Arbitrage Research Platform

A research pipeline for exploring statistical arbitrage opportunities in cryptocurrency markets, with a focus on pairs trading strategies.

## Project Overview

This is a personal hobby project aimed at:
- **Learning** statistical arbitrage concepts and their application in crypto markets
- **Building** a flexible research pipeline for testing pairs trading strategies
- **Analyzing** different cryptocurrency pairs to identify profitable mean-reversion opportunities
- **Backtesting** strategies with realistic assumptions (fees, slippage)
- **Comparing** performance across different parameters and asset pairs

## What is Statistical Arbitrage?

Statistical arbitrage (stat arb) exploits mean-reverting relationships between correlated assets. When two historically correlated assets diverge in price, we bet on their convergence back to the historical relationship.

### Strengths
- Market-neutral (less exposed to overall market direction)
- Systematic and quantifiable approach
- Potential for consistent returns in ranging markets

### Challenges
- Transaction fees can erode profits quickly
- Cointegration relationships can break down
- High competition from algorithmic traders
- Liquidity constraints and slippage
- Exchange and counterparty risk

## Project Goals

### Phase 1: Learning & Exploration
- Collect historical price data for multiple crypto pairs
- Perform correlation and cointegration analysis
- Identify promising pairs for stat arb
- Visualize spread behavior and mean-reversion patterns

### Phase 2: Strategy Development
- Implement basic pairs trading strategy (z-score based)
- Build realistic backtesting framework
- Include transaction costs and slippage modeling

### Phase 3: Parameter Research
- Test different entry/exit thresholds
- Optimize lookback windows
- Compare performance across multiple pairs
- Conduct walk-forward analysis to avoid overfitting

### Phase 4: Paper Trading
- Real-time spread monitoring
- Automated signal generation
- Paper trading execution
- Performance tracking

## Technical Approach

### Pairs Trading Strategy
1. **Pair Selection**: Identify cointegrated cryptocurrency pairs
2. **Spread Calculation**: Calculate the price spread between pairs
3. **Signal Generation**: Enter positions when spread deviates beyond threshold (e.g., 2 standard deviations)
4. **Exit Strategy**: Close positions when spread reverts to mean
5. **Risk Management**: Stop-loss, position sizing, maximum exposure limits

### Time Horizon
Primary focus on **intraday** timeframes (minutes to hours):
- Captures more trading opportunities
- Tests mean-reversion at faster timescales
- Balances speed with infrastructure requirements
- Architecture supports multiple timeframes for comparison

## Tech Stack

- **Python 3.11+** - Core language
- **UV** - Fast Python package and environment manager
- **Polars** - Fast dataframe operations for large datasets
- **Plotly** - Interactive visualization for financial data
- **statsmodels** - Statistical tests (cointegration, ADF tests)
- **ccxt** - Unified cryptocurrency exchange API
- **python-bitvavo-api** - Native Bitvavo exchange integration
- **Jupyter** - Exploratory analysis and research notebooks
- **pytest** - Testing framework

## Project Structure

```
statistical-arbitrage/
├── data/
│   ├── raw/              # Raw price data from exchanges
│   ├── processed/        # Cleaned and processed data
│   └── results/          # Backtest results
├── src/
│   ├── data/             # Data collection and processing
│   ├── analysis/         # Cointegration tests, spread analysis
│   ├── strategy/         # Trading strategy implementations
│   ├── backtesting/      # Backtesting engine
│   └── visualization/    # Plotting and dashboards
├── notebooks/            # Jupyter notebooks for research
├── tests/                # Unit and integration tests
├── config/               # Configuration files
└── docs/                 # Documentation and research notes
```

## Getting Started

### Initial Pair for Proof of Concept
Starting with **ETH/ETC** as the primary research pair:
- Shared blockchain history (ETC is the original Ethereum chain post-DAO fork)
- Different development trajectories and market dynamics
- Sufficient liquidity on major exchanges
- Good test case for cointegration analysis

Future pairs to explore:
- **BTC/ETH** - Two dominant cryptocurrencies
- **Stablecoin pairs** - USDT/USDC/DAI (low volatility, tight spreads)
- Layer-1 competitors (SOL/AVAX, etc.)

### Research Questions
- Which crypto pairs show the strongest cointegration?
- What is the optimal lookback window for spread calculation?
- What z-score thresholds maximize risk-adjusted returns?
- How do transaction fees impact profitability?
- Do relationships hold during high volatility periods?

## Exchange Platform

Using **Bitvavo** as the primary exchange:
- Netherlands-based, EU-friendly
- Competitive fee structure
- Python API available
- Sufficient pair selection for research

## Risk Disclaimer

This is a research and educational project. Cryptocurrency trading involves substantial risk of loss. All strategies will be tested with paper trading before any real capital deployment.

## Setup Instructions

### Prerequisites
- Python 3.11 or higher
- UV package manager (will be installed if not present)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd statistical-arbitrage
   ```

2. **Install UV** (if not already installed)
   ```bash
   curl -LsSf https://astral.sh/uv/install.sh | sh
   source $HOME/.local/bin/env
   ```

3. **Install dependencies**
   ```bash
   uv sync --all-extras
   ```

4. **Configure environment** (optional for public data)
   ```bash
   cp config/.env.example config/.env
   # Edit config/.env with your Bitvavo API keys if needed
   ```

5. **Activate virtual environment**
   ```bash
   source .venv/bin/activate
   ```

6. **Start Jupyter**
   ```bash
   jupyter lab
   ```
   Open `notebooks/01_data_collection_eth_etc.ipynb` to get started

### Quick Start

Fetch ETH/ETC data without Jupyter:

```python
from statistical_arbitrage.data.bitvavo_client import fetch_eth_etc_data

# Fetch 90 days of hourly data
eth_df, etc_df = fetch_eth_etc_data(interval="1h", days_back=90, save=True)

print(f"ETH data: {eth_df.shape}")
print(f"ETC data: {etc_df.shape}")
```

## Jupyter Notebooks & Git

This project uses **nbstripout** to keep notebook version control clean:
- Notebook outputs are automatically stripped when committing
- You can work with outputs locally as normal
- Git diffs are readable and focused on code changes
- No large binary blobs in git history

**Note**: When you pull/clone, notebooks won't have outputs. Just run the cells to regenerate them.

## Roadmap

- [x] Set up project structure and development environment
- [x] Implement Bitvavo API data collection
- [ ] Download historical data for initial pairs
- [ ] Perform cointegration analysis
- [ ] Visualize spread behavior
- [ ] Build basic backtesting framework
- [ ] Implement simple z-score strategy
- [ ] Compare multiple pairs and parameters
- [ ] Build monitoring dashboard
- [ ] Implement paper trading system

## Research Findings

Documented findings from our systematic analysis are maintained in **[docs/findings/](docs/findings/)** for easy reference:

- **[01_pair_discovery_cointegration.md](docs/findings/01_pair_discovery_cointegration.md)** - Testing of 40 cryptocurrency pairs, identification of 10 cointegrated pairs, multi-timeframe analysis, and temporal stability findings

Each findings document serves as a searchable reference to avoid re-running notebooks. See the [findings index](docs/findings/README.md) for the full list.

## References & Learning Resources

### Statistical Arbitrage
- Engle-Granger cointegration test
- Johansen test for multiple time series
- Ornstein-Uhlenbeck process for mean reversion
- Kalman filters for dynamic hedge ratios

### Key Metrics
- Sharpe Ratio - Risk-adjusted returns
- Maximum Drawdown - Largest peak-to-trough decline
- Win Rate - Percentage of profitable trades
- Profit Factor - Gross profit / Gross loss

---

**Note**: This is a personal hobby project by a data scientist exploring the intersection of time series analysis and financial markets.
