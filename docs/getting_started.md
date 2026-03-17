# Getting Started with Statistical Arbitrage Research

This guide will walk you through the initial setup and first steps with the statistical arbitrage research platform.

## Overview

You now have a fully functional research environment for exploring statistical arbitrage in cryptocurrency markets. The project is set up with:

- **Data Collection**: Bitvavo API integration for fetching historical and real-time data
- **Data Processing**: Polars for fast dataframe operations
- **Visualization**: Plotly for interactive charts
- **Analysis**: Statistical tools for cointegration testing
- **Organization**: Modular structure for easy experimentation

## Project Structure

```
statistical-arbitrage/
├── config/               # Configuration and settings
│   ├── .env.example      # Environment variables template
│   └── settings.py       # Pydantic settings management
├── data/                 # Data storage
│   ├── raw/              # Raw market data from exchanges
│   ├── processed/        # Cleaned and processed data
│   └── results/          # Backtest results and analysis outputs
├── src/                  # Source code
│   └── statistical_arbitrage/
│       ├── data/         # Data collection modules
│       ├── analysis/     # Statistical analysis tools
│       ├── strategy/     # Trading strategies
│       ├── backtesting/  # Backtesting engine
│       └── visualization/ # Plotting and dashboards
├── notebooks/            # Jupyter notebooks for exploration
└── tests/                # Unit tests
```

## Quick Start Guide

### 1. Test Your Setup

First, verify everything is working:

```bash
# Activate the virtual environment
source .venv/bin/activate

# Run the connection test
python test_connection.py
```

You should see successful connection to Bitvavo and sample data fetched.

### 2. Collect Initial Data

Open the first notebook to collect ETH/ETC data:

```bash
jupyter lab notebooks/01_data_collection_eth_etc.ipynb
```

This notebook will:
- Connect to Bitvavo API
- Fetch 90 days of hourly data for ETH-EUR and ETC-EUR
- Visualize price movements
- Calculate basic correlation
- Save data for future analysis

### 3. Explore the Data

Run all cells in the notebook to:
1. See available trading pairs on Bitvavo
2. Download historical OHLCV data
3. View candlestick charts
4. Compare normalized prices
5. Check basic correlation between ETH and ETC

### 4. Understanding the Data Flow

```python
# Example: Fetching data programmatically
from statistical_arbitrage.data.bitvavo_client import BitvavoDataCollector

# Initialize client (no API keys needed for public data)
collector = BitvavoDataCollector()

# Fetch data
eth_df = collector.get_candles_range(
    market="ETH-EUR",
    interval="1h",
    days_back=90
)

# Save to disk
collector.save_candles(eth_df, "ETH-EUR", "1h")
```

## Next Steps

After completing the data collection notebook, you can:

### 1. Cointegration Analysis (Next Notebook)
- Test if ETH and ETC are cointegrated
- Calculate the spread between the pairs
- Check for mean-reversion properties
- Determine if the pair is suitable for stat arb

### 2. Strategy Development
- Implement z-score based entry/exit signals
- Calculate hedge ratios
- Design risk management rules

### 3. Backtesting
- Build a backtesting framework
- Test strategies with historical data
- Include realistic transaction costs
- Calculate performance metrics (Sharpe, drawdown, etc.)

## Key Concepts to Learn

### Statistical Arbitrage
- **Cointegration**: Two assets that move together in the long run, even if they diverge temporarily
- **Spread**: The difference between normalized prices of the two assets
- **Mean Reversion**: The tendency of the spread to return to its historical average
- **Z-Score**: How many standard deviations the current spread is from the mean

### Pairs Trading Strategy
1. Find cointegrated pairs
2. Calculate the spread
3. Enter positions when spread deviates (e.g., z-score > 2)
4. Exit when spread reverts to mean (e.g., z-score < 0.5)
5. Apply stop-loss for risk management

## Configuration

### API Settings

If you want to use private Bitvavo endpoints (for trading, not just data):

1. Copy the environment template:
   ```bash
   cp config/.env.example config/.env
   ```

2. Add your Bitvavo API credentials:
   ```
   BITVAVO_API_KEY=your_key_here
   BITVAVO_API_SECRET=your_secret_here
   ```

3. Get API keys from: https://bitvavo.com/en/account/api-keys

**Note**: API keys are NOT required for fetching public market data.

### Strategy Parameters

Edit [config/settings.py](../config/settings.py) to adjust:

- Trading pairs to analyze
- Lookback windows
- Entry/exit thresholds
- Position sizing
- Transaction fees

## Tips for Success

### Data Collection
- Start with hourly data (good balance between detail and speed)
- Collect at least 90 days for meaningful statistical analysis
- Save data locally to avoid repeated API calls
- Respect rate limits (default: 10 requests/second)

### Analysis
- Always check for cointegration before attempting pairs trading
- Use walk-forward analysis to avoid overfitting
- Test multiple timeframes (1h, 4h, 1d)
- Consider transaction costs from the start

### Research Workflow
1. Collect data
2. Visualize and explore
3. Test statistical properties
4. Design strategy
5. Backtest thoroughly
6. Paper trade before using real money

## Common Issues

### Import Errors
If you see import errors, make sure you're in the virtual environment:
```bash
source .venv/bin/activate
```

### API Rate Limiting
If you hit rate limits, adjust the setting:
```python
# In config/settings.py or .env
RATE_LIMIT_PER_SECOND=5  # Reduce from 10
```

### Data Type Issues
The data collector handles Bitvavo's string-to-number conversions automatically. If you encounter type errors, check the [bitvavo_client.py](../src/statistical_arbitrage/data/bitvavo_client.py) module.

## Resources

### Documentation
- [Bitvavo API Docs](https://docs.bitvavo.com/)
- [Polars Documentation](https://pola-rs.github.io/polars/)
- [Plotly Python](https://plotly.com/python/)

### Learning Materials
- Engle-Granger Cointegration Test
- Johansen Test for multiple time series
- Ornstein-Uhlenbeck process (mean reversion model)
- Kalman filters for dynamic hedge ratios

### Community
- Share findings in the project issues
- Document interesting pairs you discover
- Contribute improvements to the codebase

## Support

If you encounter issues:
1. Check the test script: `python test_connection.py`
2. Review error messages carefully
3. Verify your Python version (3.11+)
4. Ensure all dependencies are installed: `uv sync --all-extras`

Happy researching!
