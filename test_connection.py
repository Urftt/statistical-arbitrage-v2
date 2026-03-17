"""
Quick test script to verify Bitvavo API connection and data fetching.
"""

import sys
from pathlib import Path

# Add src to path
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root / "src"))
sys.path.insert(0, str(project_root))

from statistical_arbitrage.data.bitvavo_client import BitvavoDataCollector


def main():
    print("=" * 60)
    print("Testing Bitvavo API Connection")
    print("=" * 60)

    # Initialize collector
    print("\n1. Initializing Bitvavo client...")
    collector = BitvavoDataCollector()
    print("   ✓ Client initialized successfully")

    # Check available markets
    print("\n2. Fetching available markets...")
    markets_df = collector.get_available_markets()
    print(f"   ✓ Found {len(markets_df)} markets")

    # Check for ETH/EUR and ETC/EUR (CCXT uses / format)
    print("\n3. Checking for target pairs...")
    target_pairs = ["ETH/EUR", "ETC/EUR"]
    available = markets_df.filter(
        markets_df["market"].is_in(target_pairs)
    )

    for pair in target_pairs:
        pair_info = available.filter(available["market"] == pair)
        if len(pair_info) > 0:
            status = pair_info["status"][0]
            print(f"   ✓ {pair}: {status}")
        else:
            print(f"   ✗ {pair}: NOT FOUND")

    # Fetch a small sample of data
    print("\n4. Fetching sample data (last 24 hours)...")
    try:
        eth_df = collector.get_candles(
            market="ETH/EUR",
            interval="1h",
            limit=24
        )
        print(f"   ✓ Fetched {len(eth_df)} hourly candles for ETH/EUR")
        print(f"   Latest price: €{eth_df['close'][-1]:.2f}")
        print(f"   Date range: {eth_df['datetime'].min()} to {eth_df['datetime'].max()}")

        etc_df = collector.get_candles(
            market="ETC/EUR",
            interval="1h",
            limit=24
        )
        print(f"   ✓ Fetched {len(etc_df)} hourly candles for ETC/EUR")
        print(f"   Latest price: €{etc_df['close'][-1]:.2f}")
        print(f"   Date range: {etc_df['datetime'].min()} to {etc_df['datetime'].max()}")

    except Exception as e:
        print(f"   ✗ Error fetching data: {e}")
        return

    print("\n" + "=" * 60)
    print("✓ All tests passed! Ready to collect data.")
    print("=" * 60)
    print("\nNext steps:")
    print("1. Run: source .venv/bin/activate")
    print("2. Run: jupyter lab")
    print("3. Open: notebooks/01_data_collection_eth_etc.ipynb")


if __name__ == "__main__":
    main()
