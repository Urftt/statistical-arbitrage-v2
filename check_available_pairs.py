"""Quick script to check available trading pairs on Bitvavo."""
import ccxt
import polars as pl

# Initialize Bitvavo client (no auth needed for public data)
client = ccxt.bitvavo({'enableRateLimit': True})

# Fetch all markets
markets = client.load_markets()

# Filter for EUR pairs (most liquid on Bitvavo)
eur_pairs = [symbol for symbol in markets.keys() if '/EUR' in symbol]

print(f"Found {len(eur_pairs)} EUR trading pairs on Bitvavo:\n")
print("\n".join(sorted(eur_pairs)))

# Group by category
print("\n\n=== SUGGESTED PAIRS FOR COINTEGRATION TESTING ===")

stablecoins = [p for p in eur_pairs if any(stable in p for stable in ['USDT', 'USDC', 'DAI', 'BUSD'])]
major_coins = [p for p in eur_pairs if any(coin in p for coin in ['BTC', 'ETH', 'BNB', 'XRP', 'ADA', 'SOL', 'MATIC'])]
layer1s = [p for p in eur_pairs if any(l1 in p for l1 in ['ETH', 'BNB', 'SOL', 'ADA', 'AVAX', 'DOT', 'ATOM'])]

print("\nStablecoins (likely cointegrated):")
print(", ".join(sorted(stablecoins)))

print("\nMajor coins:")
print(", ".join(sorted(major_coins)))

print("\nLayer-1 platforms:")
print(", ".join(sorted(layer1s)))
